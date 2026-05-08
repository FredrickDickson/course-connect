import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { calculateEligibilityClientSide, type EligibilityResponse } from "../../../shared/enrollmentEligibility";
import { supabase } from "@/integrations/supabase/client";

interface UseEligibilityOptions {
  courseId?: string;
  courseTrack?: string | null;
  courseLevel?: string | null;
  isEnrolled?: boolean;
  trackProgress?: Record<string, string>;
  enabled?: boolean;
}

export function useEligibility({
  courseId,
  courseTrack,
  courseLevel,
  isEnrolled = false,
  trackProgress = {},
  enabled = true,
}: UseEligibilityOptions) {
  const { user } = useAuth();

  // Client-side calculation for instant feedback
  const clientSideResult = calculateEligibilityClientSide(
    courseTrack ?? null,
    courseLevel ?? null,
    trackProgress,
    isEnrolled
  );

  // Server-side validation as fallback
  const { data: serverResult, isLoading: serverLoading } = useQuery<EligibilityResponse>({
    queryKey: ["course-eligibility", courseId, user?.id],
    enabled: enabled && !!courseId && !!user?.id,
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("No auth token");
      }

      const res = await fetch(`/api/enrollments/check-eligibility?courseId=${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to check eligibility");
      }

      return await res.json();
    },
    // Use client-side result as initial data
    initialData: clientSideResult,
    // Don't refetch too frequently
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Return client-side result immediately, then update with server result
  return {
    eligibility: serverResult || clientSideResult,
    isLoading: serverLoading,
    isClientCalculated: clientSideResult.isClientCalculated,
  };
}

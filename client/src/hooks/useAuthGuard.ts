import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * useAuthGuard — Centralized onboarding routing hook
 * 
 * Checks in order:
 * 1. Not authenticated → /login (stores intended destination)
 * 2. Bio-data not completed → /onboarding
 * 3. All good → allow through
 */
export function useAuthGuard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [guardReady, setGuardReady] = useState(false);
  const [bioDataCompleted, setBioDataCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      if (location !== "/login" && location !== "/register") {
        sessionStorage.setItem("redirectAfterLogin", location);
      }
      setLocation("/login");
      return;
    }

    if (user?.role === "admin") {
      setGuardReady(true);
      setBioDataCompleted(true);
      return;
    }

    const checkProfile = async () => {
      // Check if user has a professional profile
      const { data: profProfile } = await supabase
        .from("professional_profiles")
        .select("review_status")
        .eq("user_id", user.id)
        .eq("is_current", true)
        .maybeSingle();

      // Onboarding is complete ONLY if:
      // - Profile exists AND has been submitted (not in DRAFT)
      // New users (no profile) MUST go through onboarding first
      const isOnboardingComplete = profProfile != null && profProfile.review_status !== "DRAFT";

      setBioDataCompleted(isOnboardingComplete);

      // Redirect to onboarding if they haven't started or completed submission
      if (!isOnboardingComplete && location !== "/onboarding") {
        setLocation("/onboarding");
        return;
      }

      setGuardReady(true);
    };

    checkProfile();
  }, [isLoading, isAuthenticated, user, location, setLocation]);

  return {
    isGuardReady: guardReady,
    isLoading: isLoading || bioDataCompleted === null,
    bioDataCompleted,
  };
}

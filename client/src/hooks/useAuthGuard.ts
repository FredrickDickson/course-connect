import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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

    const checkProfile = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("profile_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      const completed = profile?.profile_completed ?? false;
      setBioDataCompleted(completed);

      if (!completed && location !== "/onboarding") {
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

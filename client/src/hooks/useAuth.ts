import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchUserProfile = useCallback(async (currentAuthUser: User): Promise<UserProfile> => {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role, first_name, last_name, profile_image_url")
      .eq("id", currentAuthUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
    }

    return {
      id: currentAuthUser.id,
      email: currentAuthUser.email || "",
      firstName: profile?.first_name || currentAuthUser.user_metadata?.first_name || currentAuthUser.email?.split("@")[0] || "",
      lastName: profile?.last_name || currentAuthUser.user_metadata?.last_name || "",
      profileImageUrl: profile?.profile_image_url || currentAuthUser.user_metadata?.avatar_url || "",
      role: profile?.role || currentAuthUser.user_metadata?.role || "student",
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setAuthUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setAuthUser(session?.user ?? null);
      setIsAuthReady(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthReady) {
      return () => {
        isMounted = false;
      };
    }

    if (!authUser) {
      setUser(null);
      setIsProfileLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsProfileLoading(true);

    void fetchUserProfile(authUser)
      .then((nextUser) => {
        if (!isMounted) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authUser, fetchUserProfile, isAuthReady]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
    setIsProfileLoading(false);
    setIsAuthReady(true);
  }, []);

  const isLoading = !isAuthReady || (!!authUser && isProfileLoading);

  const hasRole = (role: string) => user?.role === role;
  const isInstructor = () => hasRole("instructor") || hasRole("admin");
  const isAdmin = () => hasRole("admin");
  const isStudent = () => hasRole("student");

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    isInstructor,
    isAdmin,
    isStudent,
    signOut,
  };
}

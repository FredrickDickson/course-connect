import { useState, useEffect, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (authUser: any) => {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role, first_name, last_name, profile_image_url")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
    }

    setUser({
      id: authUser.id,
      email: authUser.email || "",
      firstName: profile?.first_name || authUser.user_metadata?.first_name || authUser.email?.split("@")[0] || "",
      lastName: profile?.last_name || authUser.user_metadata?.last_name || "",
      profileImageUrl: profile?.profile_image_url || authUser.user_metadata?.avatar_url || "",
      role: profile?.role || "student",
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncAuthUser = async (authUser: any | null) => {
      if (!isMounted) return;

      if (!authUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        await fetchUserProfile(authUser);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        return;
      }

      setIsLoading(true);
      void syncAuthUser(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void syncAuthUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

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

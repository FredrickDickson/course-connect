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
    try {
      // Try to fetch role from users table
      const { data: profile } = await supabase
        .from("users")
        .select("role, first_name, last_name, profile_image_url")
        .eq("id", authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || "",
        firstName: profile?.first_name || authUser.user_metadata?.first_name || authUser.email?.split("@")[0] || "",
        lastName: profile?.last_name || authUser.user_metadata?.last_name || "",
        profileImageUrl: profile?.profile_image_url || authUser.user_metadata?.avatar_url || "",
        role: profile?.role || "student",
      });
    } catch {
      // Fallback if profile fetch fails
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        firstName: authUser.user_metadata?.first_name || authUser.email?.split("@")[0] || "",
        lastName: authUser.user_metadata?.last_name || "",
        profileImageUrl: authUser.user_metadata?.avatar_url || "",
        role: "student",
      });
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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

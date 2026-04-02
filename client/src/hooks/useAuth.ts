import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (_role: string) => false;
  const isInstructor = () => false;
  const isAdmin = () => false;
  const isStudent = () => true;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    isInstructor,
    isAdmin,
    isStudent,
  };
}

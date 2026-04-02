import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          ...session.user,
          firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || '',
          lastName: session.user.user_metadata?.last_name || '',
          profileImageUrl: session.user.user_metadata?.avatar_url || '',
          role: session.user.user_metadata?.role || 'student',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          ...session.user,
          firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || '',
          lastName: session.user.user_metadata?.last_name || '',
          profileImageUrl: session.user.user_metadata?.avatar_url || '',
          role: session.user.user_metadata?.role || 'student',
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: string) => user?.role === role;
  const isInstructor = () => hasRole('instructor') || hasRole('admin');
  const isAdmin = () => hasRole('admin');
  const isStudent = () => hasRole('student');

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
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const hasRole = (role: 'student' | 'instructor' | 'admin') => {
    return user?.role === role;
  };

  const isInstructor = () => hasRole('instructor') || hasRole('admin');
  const isAdmin = () => hasRole('admin');
  const isStudent = () => hasRole('student');

  return {
    user: user as User | undefined,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    isInstructor,
    isAdmin,
    isStudent,
  };
}

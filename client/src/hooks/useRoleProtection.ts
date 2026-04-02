import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useLocation } from "wouter";

interface UseRoleProtectionOptions {
  requiredRole?: 'student' | 'instructor' | 'admin';
  requiresAuth?: boolean;
  redirectTo?: string;
}

export function useRoleProtection(options: UseRoleProtectionOptions = {}) {
  const { requiredRole, requiresAuth = true, redirectTo = "/login" } = options;
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const hasAccess = (() => {
    if (isLoading) return false;
    
    if (requiresAuth && !isAuthenticated) return false;
    
    if (requiredRole && !hasRole(requiredRole)) {
      // Admin has access to all roles
      if (user?.role === 'admin') return true;
      return false;
    }
    
    return true;
  })();

  useEffect(() => {
    if (isLoading) return;

    if (requiresAuth && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1000);
      return;
    }

    if (requiredRole && !hasRole(requiredRole) && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: `You need ${requiredRole} role to access this page.`,
        variant: "destructive",
      });
      
      setTimeout(() => {
        setLocation("/");
      }, 1000);
      return;
    }
  }, [isLoading, isAuthenticated, user, requiredRole, hasRole, toast, setLocation, redirectTo, requiresAuth]);

  return {
    isLoading,
    hasAccess,
    user,
    isAuthenticated,
  };
}
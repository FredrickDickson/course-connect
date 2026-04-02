import { useEffect, useRef, useCallback } from "react";
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
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownToast = useRef(false);

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

    // Clear any pending redirect if user is now authenticated with correct role
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }

    // Reset toast flag when user changes
    if (hasAccess) {
      hasShownToast.current = false;
      return;
    }

    if (requiresAuth && !isAuthenticated) {
      if (!hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Authentication Required",
          description: "Please log in to access this page.",
          variant: "destructive",
        });
      }
      
      redirectTimer.current = setTimeout(() => setLocation(redirectTo), 1000);
      return;
    }

    if (requiredRole && !hasRole(requiredRole) && user?.role !== 'admin') {
      if (!hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Access Denied",
          description: `You need ${requiredRole} role to access this page.`,
          variant: "destructive",
        });
      }
      
      redirectTimer.current = setTimeout(() => setLocation("/"), 1000);
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, hasAccess, requiredRole, user?.role]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  return {
    isLoading,
    hasAccess,
    user,
    isAuthenticated,
  };
}
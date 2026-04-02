import { useEffect, useRef } from "react";
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

    if (requiresAuth && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
      
      redirectTimer.current = setTimeout(() => setLocation(redirectTo), 1000);
      return;
    }

    if (requiredRole && !hasRole(requiredRole) && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: `You need ${requiredRole} role to access this page.`,
        variant: "destructive",
      });
      
      redirectTimer.current = setTimeout(() => setLocation("/"), 1000);
      return;
    }
  }, [isLoading, isAuthenticated, user, requiredRole, hasRole, toast, setLocation, redirectTo, requiresAuth]);

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
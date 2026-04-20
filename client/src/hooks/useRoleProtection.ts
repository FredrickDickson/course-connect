import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";
import { useLocation } from "wouter";

interface UseRoleProtectionOptions {
  requiredRole?: 'student' | 'instructor' | 'admin';
  requiresAuth?: boolean;
  redirectTo?: string;
  showToast?: boolean;
}

export function useRoleProtection(options: UseRoleProtectionOptions = {}) {
  const {
    requiredRole,
    requiresAuth = true,
    redirectTo = "/login",
    showToast = true,
  } = options;
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownToast = useRef(false);

  const hasAccess = (() => {
    if (isLoading) return false;

    if (requiresAuth && !isAuthenticated) return false;

    if (requiredRole && !hasRole(requiredRole)) {
      if (user?.role === "admin") return true;
      return false;
    }

    return true;
  })();

  useEffect(() => {
    if (isLoading) return;

    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }

    if (hasAccess) {
      hasShownToast.current = false;
      return;
    }

    if (requiresAuth && !isAuthenticated) {
      if (showToast && !hasShownToast.current) {
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

    if (requiredRole && !hasRole(requiredRole) && user?.role !== "admin") {
      if (showToast && !hasShownToast.current) {
        hasShownToast.current = true;
        toast({
          title: "Access Denied",
          description: `You need ${requiredRole} role to access this page.`,
          variant: "destructive",
        });
      }

      redirectTimer.current = setTimeout(() => setLocation("/"), 1000);
    }
  }, [
    hasAccess,
    isAuthenticated,
    isLoading,
    redirectTo,
    requiredRole,
    requiresAuth,
    setLocation,
    showToast,
    toast,
    user?.role,
    hasRole,
  ]);

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

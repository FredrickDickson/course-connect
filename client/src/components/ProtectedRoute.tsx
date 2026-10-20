import { Route, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

type ProtectedRouteProps = {
    path: string;
    component: React.ComponentType<any>;
    requiredRole?: "student" | "instructor" | "admin";
};

// Optional onboarding: users can access all pages immediately after registration.
// Profile completion is only required when enrolling in courses (enforced in checkout.tsx).
// This function is kept for backward compatibility but always returns false.
function needsContactInfo(user: { role: string; phone?: string } | null, location: string) {
    // Optional onboarding - never force users to complete profile
    return false;
}

export function ProtectedRoute({
    path,
    component: Component,
    requiredRole,
}: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, hasRole } = useAuth();
    const [location, setLocation] = useLocation();
    const mustCompleteContact = !isLoading && isAuthenticated && needsContactInfo(user, location);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setLocation("/login");
        } else if (mustCompleteContact) {
            // Onboarding sends the user back here once their details are saved.
            sessionStorage.setItem("redirectAfterLogin", window.location.pathname + window.location.search);
            setLocation("/onboarding");
        } else if (!isLoading && isAuthenticated && requiredRole && !hasRole(requiredRole)) {
            if (user?.role !== "admin") {
                if (requiredRole === "admin" || (requiredRole === "instructor" && user?.role === "student")) {
                    setLocation("/");
                }
            }
        }
    }, [isLoading, isAuthenticated, user, requiredRole, hasRole, setLocation, mustCompleteContact]);

    const loader = (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    return (
        <Route path={path}>
            {(params) => {
                if (isLoading) {
                    return loader;
                }

                // Not authenticated / wrong role: the effect above redirects
                // away, but until that navigation lands, show the loader
                // instead of nothing so the user never sees a blank frame.
                if (!isAuthenticated || mustCompleteContact) {
                    return loader;
                }

                if (requiredRole && !hasRole(requiredRole) && user?.role !== "admin") {
                    if (requiredRole === "admin" || (requiredRole === "instructor" && user?.role === "student")) {
                        return loader;
                    }
                }

                return <Component params={params} />;
            }}
        </Route>
    );
}

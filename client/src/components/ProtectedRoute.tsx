import { Route, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

type ProtectedRouteProps = {
    path: string;
    component: React.ComponentType<any>;
    requiredRole?: "student" | "instructor" | "admin";
};

// Routes a student may open before their phone number is on file. Everything
// else behind ProtectedRoute (checkout, sessions, courses...) requires it, so
// contact details can't be skipped by leaving onboarding early.
const CONTACT_EXEMPT_PATHS = ["/onboarding", "/profile"];

function needsContactInfo(user: { role: string; phone?: string } | null, location: string) {
    if (!user || user.role === "admin" || user.role === "instructor") return false;
    if (CONTACT_EXEMPT_PATHS.some((p) => location === p || location.startsWith(`${p}/`))) return false;
    return !user.phone;
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

import { Route, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ProtectedRouteProps = {
    path: string;
    component: React.ComponentType<any>;
    requiredRole?: "student" | "instructor" | "admin";
};

export function ProtectedRoute({
    path,
    component: Component,
    requiredRole,
}: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated, hasRole } = useAuth();
    const [, setLocation] = useLocation();
    const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

    useEffect(() => {
        if (shouldRedirect) {
            setLocation(shouldRedirect);
            setShouldRedirect(null);
        }
    }, [shouldRedirect, setLocation]);

    return (
        <Route path={path}>
            {(params) => {
                if (isLoading) {
                    return (
                        <div className="flex items-center justify-center min-h-screen">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    );
                }

                if (!isAuthenticated) {
                    setShouldRedirect("/login");
                    return null;
                }

                if (requiredRole && !hasRole(requiredRole)) {
                    // If they are an instructor but route needs admin, or student but route needs instructor
                    // Redirect to their respective dashboards or home
                    if (user?.role === "admin") return <Component params={params} />;
                    if (requiredRole === "admin" || (requiredRole === "instructor" && user?.role === "student")) {
                        setShouldRedirect("/");
                        return null;
                    }
                }

                return <Component params={params} />;
            }}
        </Route>
    );
}

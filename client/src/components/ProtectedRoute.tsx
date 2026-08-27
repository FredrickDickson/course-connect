import { Route, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

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

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            setLocation("/login");
        } else if (!isLoading && isAuthenticated && requiredRole && !hasRole(requiredRole)) {
            if (user?.role !== "admin") {
                if (requiredRole === "admin" || (requiredRole === "instructor" && user?.role === "student")) {
                    setLocation("/");
                }
            }
        }
    }, [isLoading, isAuthenticated, user, requiredRole, hasRole, setLocation]);

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
                if (!isAuthenticated) {
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

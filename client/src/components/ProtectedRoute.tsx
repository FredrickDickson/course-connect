import { Route, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

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
                    setLocation("/login");
                    return null;
                }

                if (requiredRole && !hasRole(requiredRole)) {
                    // If they are an instructor but route needs admin, or student but route needs instructor
                    // Redirect to their respective dashboards or home
                    if (user?.role === "admin") return <Component params={params} />;
                    if (requiredRole === "admin" || (requiredRole === "instructor" && user?.role === "student")) {
                        setLocation("/");
                        return null;
                    }
                }

                return <Component params={params} />;
            }}
        </Route>
    );
}

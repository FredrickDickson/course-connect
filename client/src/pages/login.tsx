import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import cimaLogo from "@/assets/cima-logo.png";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });

      // Redirect based on user role
      if (data.user.role === 'admin') {
        window.location.href = "/admin-dashboard";
      } else if (data.user.role === 'instructor') {
        window.location.href = "/instructor-dashboard";
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src={cimaLogo} alt="CIMA Logo" className="h-16 w-auto" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your CIMA Learn account
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pl-10"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password">
                  <span className="text-sm text-primary hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  data-testid="password-toggle"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="login-button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              data-testid="google-login-button"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isLoading}
              onClick={() => {
                window.location.href = "/api/auth/microsoft";
              }}
              data-testid="microsoft-login-button"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M13 1h10v10H13z" />
                <path fill="#7fba00" d="M1 13h10v10H1z" />
                <path fill="#ffb900" d="M13 13h10v10H13z" />
              </svg>
              Continue with Microsoft
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register">
              <span className="text-primary hover:underline font-medium cursor-pointer">
                Get Started
              </span>
            </Link>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms-of-service">
              <span className="text-primary hover:underline cursor-pointer">
                Terms of Service
              </span>
            </Link>{" "}
            and{" "}
            <Link href="/privacy-policy">
              <span className="text-primary hover:underline cursor-pointer">
                Privacy Policy
              </span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

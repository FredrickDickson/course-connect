import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Home } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const { t, isRTL } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed');
      }

      toast({
        title: t("auth.welcomeBack"),
        description: t("messages.signInSuccess"),
      });

      // Check if onboarding is completed
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("profile_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // If no profile exists or profile is not completed, go to onboarding
      const profileComplete = (profileData as any)?.profile_completed ?? false;

      if (!profileData || !profileComplete) {
        setLocation("/onboarding");
        return;
      }

      // Redirect based on role or stored destination
      const redirect = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      
      if (redirect) {
        window.location.assign(redirect);
      } else {
        // Get user role from metadata or default to student
        const role = data.user.user_metadata?.role || "student";
        const destination =
          role === "admin"
            ? "/admin"
            : role === "instructor"
              ? "/instructor"
              : "/dashboard";
        window.location.assign(destination);
      }
    } catch (err: any) {
      setError(err.message || t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 relative"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Back to Home Button */}
      <Link href="/">
        <Button
          variant="ghost"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Home</span>
          <Home className="h-4 w-4 sm:hidden" />
        </Button>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="text-center">
            <CardTitle className="text-2xl">{t("auth.welcomeBack")}</CardTitle>
            <CardDescription>{t("auth.signInAccount")}</CardDescription>
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
              <Label htmlFor="email">{t("auth.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("auth.emailPlaceholder")}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Link href="/forgot-password">
                  <span className="text-sm text-primary hover:underline cursor-pointer">
                    {t("auth.forgotPassword")}
                  </span>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.passwordPlaceholder")}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  aria-label={
                    showPassword ? t("common.close") : t("common.view")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                t("auth.signIn")
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                {t("auth.orContinueWith")}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading}
            onClick={handleGoogleLogin}
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
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link href="/register">
              <span className="text-primary hover:underline font-medium cursor-pointer">
                {t("auth.getStarted")}
              </span>
            </Link>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            {t("auth.agreeToTerms")}{" "}
            <Link href="/terms-of-service">
              <span className="text-primary hover:underline cursor-pointer">
                {t("auth.termsOfService")}
              </span>
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/privacy-policy">
              <span className="text-primary hover:underline cursor-pointer">
                {t("auth.privacyPolicy")}
              </span>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

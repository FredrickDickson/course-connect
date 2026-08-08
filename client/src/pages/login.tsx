import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import cimaLogo from "/images/logo.jpeg";

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

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = (session.user.user_metadata?.role ?? "student").toLowerCase();
        if (role === "admin") {
          window.location.href = "/admin";
        } else if (role === "instructor") {
          window.location.href = "/instructor";
        } else {
          window.location.href = "/home";
        }
      }
    };
    checkAuth();
  }, []);

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

      const role = (data.user.user_metadata?.role ?? "student").toLowerCase();

      // Check if onboarding is completed
      const { data: profileData } = await (supabase as typeof supabase)
        .from("profiles")
        .select("profile_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();

      // If no profile exists or profile is not completed, go to onboarding
      const profileComplete = (profileData as { profile_completed?: boolean } | null)?.profile_completed ?? false;

      if (role !== "admin" && (!profileData || !profileComplete)) {
        setLocation("/onboarding");
        return;
      }

      // Redirect based on role or stored destination
      const redirect = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");

      if (role === "admin") {
        window.location.href = "/admin";
        return;
      }

      if (redirect) {
        window.location.href = redirect;
      } else {
        const destination =
          role === "instructor"
            ? "/instructor"
            : "/home";
        window.location.href = destination;
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || t("common.error"));
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
      className="min-h-screen flex bg-white"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Left Side - Large Background Image */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        {/* Large Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=2400&auto=format&fit=crop&q=80"
          alt="Professional legal workspace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000]/90 via-[#610000]/85 to-black/80"></div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <Link href="/" className="inline-flex items-center hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          <div className="space-y-8">
            <img 
              src={cimaLogo} 
              alt="CIMA Logo" 
              className="h-20 w-auto mb-8 rounded-xl"
            />
            <div className="space-y-4">
              <h1 className="text-6xl font-bold leading-tight">
                Welcome to<br />CIMA Learn
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-md font-light">
                Professional ADR education recognized by the world's leading arbitral institutions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-8 text-sm text-white/70">
            <span>© 2026 CIMA Learn</span>
            <span>•</span>
            <Link href="/privacy-policy">
              <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            </Link>
            <span>•</span>
            <Link href="/terms-of-service">
              <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="space-y-6">
              {/* Logo - Mobile Only */}
              <div className="flex justify-center lg:hidden">
                <img 
                  src={cimaLogo} 
                  alt="CIMA Logo" 
                  className="h-16 w-16 object-contain rounded-lg"
                />
              </div>

              {/* Header */}
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-bold text-gray-900">
                  {t("auth.welcomeBack")}
                </h2>
                <p className="text-sm text-gray-600">
                  {t("auth.signInAccount")}
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="rounded-xl border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    {t("auth.email")}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-12 pl-12 pr-4 rounded-xl border-gray-200 focus:border-[#8b0000] focus:ring-[#8b0000] text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      {t("auth.password")}
                    </Label>
                    <Link href="/forgot-password">
                      <span className="text-sm text-[#8b0000] hover:text-[#610000] cursor-pointer transition-colors font-medium">
                        {t("auth.forgotPassword")}
                      </span>
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.passwordPlaceholder")}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-12 pl-12 pr-12 rounded-xl border-gray-200 focus:border-[#8b0000] focus:ring-[#8b0000] text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? t("common.close") : t("common.view")}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-[#8b0000] hover:bg-[#610000] text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium tracking-wider">
                    {t("auth.orContinueWith")}
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 font-medium text-base transition-all"
                disabled={isLoading}
                onClick={handleGoogleLogin}
              >
                <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              {/* Sign Up Link */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  {t("auth.noAccount")}{" "}
                  <Link href="/register">
                    <span className="text-[#8b0000] hover:text-[#610000] font-semibold cursor-pointer transition-colors">
                      {t("auth.getStarted")}
                    </span>
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center text-xs text-gray-500">
            {t("auth.agreeToTerms")}{" "}
            <Link href="/terms-of-service">
              <span className="text-[#8b0000] hover:underline cursor-pointer">
                {t("auth.termsOfService")}
              </span>
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/privacy-policy">
              <span className="text-[#8b0000] hover:underline cursor-pointer">
                {t("auth.privacyPolicy")}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

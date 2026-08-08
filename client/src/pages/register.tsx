import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, X, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import cimaLogo from "/images/logo.jpeg";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
          window.location.href = "/dashboard";
        }
      }
    };
    checkAuth();
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        options: {
          data: {
            firstName: formData.firstName.trim(),
            middleName: formData.middleName.trim(),
            lastName: formData.lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      // Save name fields to users table
      const { error: userError } = await supabase.from("users").update({
        first_name: formData.firstName.trim(),
        middle_name: formData.middleName.trim() || null,
        last_name: formData.lastName.trim(),
      }).eq("id", data.user.id);

      if (userError) {
        console.error("Error saving name to users table:", userError);
      }

      // Check if email confirmation is required
      if (data.session === null) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please click it to complete your registration.",
        });
        setLocation("/verify-email");
      } else {
        toast({
          title: "Account created successfully!",
          description: "Welcome to CIMA Learn. Let's get started.",
        });
        // Full-page redirect, not setLocation: /onboarding is a ProtectedRoute,
        // and a same-SPA navigation can outrace AuthContext picking up the
        // just-created session, bouncing the new user to /login. login.tsx
        // uses the same window.location.href pattern for its own redirects
        // for the same reason.
        window.location.href = "/onboarding";
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex bg-white">
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
                Join<br />CIMA Learn
              </h1>
              <p className="text-xl text-white/90 leading-relaxed max-w-md font-light">
                Begin your journey to international ADR excellence with globally recognized certifications.
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
      <div className="flex-1 flex items-center justify-center p-4 lg:p-6 overflow-y-auto bg-gray-50">
        <div className="w-full max-w-md my-auto">
          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
            <div className="space-y-5">
              {/* Logo - Mobile Only */}
              <div className="flex justify-center lg:hidden">
                <img 
                  src={cimaLogo} 
                  alt="CIMA Logo" 
                  className="h-16 w-16 object-contain rounded-lg"
                />
              </div>

              {/* Header */}
              <div className="space-y-1 text-center">
                <h2 className="font-sf-pro-display text-xl sm:text-2xl text-[#610000]">
                  Get Started
                </h2>
                <p className="font-sf-pro-text text-xs sm:text-sm text-neutral-600">
                  Create your CIMA Learn account
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
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="font-sf-pro-text text-xs font-medium text-neutral-700">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-9 pl-8 rounded-lg border-neutral-200 focus:border-[#610000] focus:ring-[#610000] font-sf-pro-text text-xs transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="font-sf-pro-text text-xs font-medium text-neutral-700">
                      Last Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                        className="h-9 pl-8 rounded-lg border-neutral-200 focus:border-[#610000] focus:ring-[#610000] font-sf-pro-text text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="email" className="font-sf-pro-text text-xs font-medium text-neutral-700">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-10 pl-10 rounded-lg border-neutral-200 focus:border-[#610000] focus:ring-[#610000] font-sf-pro-text text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label htmlFor="password" className="font-sf-pro-text text-xs font-medium text-neutral-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-10 pl-10 pr-10 rounded-lg border-neutral-200 focus:border-[#610000] focus:ring-[#610000] font-sf-pro-text text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="font-sf-pro-text text-xs font-medium text-neutral-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-10 pl-10 pr-10 rounded-lg border-neutral-200 focus:border-[#610000] focus:ring-[#610000] font-sf-pro-text text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && (
                    <div className="flex items-center space-x-1 text-[10px] mt-0.5">
                      {passwordsMatch ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 text-red-500" />
                          <span className="text-red-500 font-medium">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked as boolean }))}
                    disabled={isLoading}
                    className="border-neutral-300 h-5 w-5"
                  />
                  <label htmlFor="agreeToTerms" className="text-xs sm:text-sm text-neutral-600 font-sf-pro-text cursor-pointer">
                    I agree to the{" "}
                    <Link href="/terms-of-service">
                      <span className="text-[#610000] hover:text-[#8b0000] font-medium transition-colors">Terms</span>
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy-policy">
                      <span className="text-[#610000] hover:text-[#8b0000] font-medium transition-colors">Privacy</span>
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 bg-[#610000] hover:bg-[#8b0000] text-white rounded-lg font-sf-pro-text font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  disabled={isLoading || !formData.agreeToTerms}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-neutral-500 font-sf-pro-text font-medium tracking-wider">
                    Or sign up with
                  </span>
                </div>
              </div>

              {/* Google Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-lg border-2 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 font-sf-pro-text font-medium text-xs sm:text-sm transition-all"
                disabled={isLoading}
                onClick={handleGoogleSignup}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>

              {/* Sign In Link */}
              <div className="text-center pt-1">
                <p className="text-[10px] sm:text-xs text-neutral-600 font-sf-pro-text">
                  Already have an account?{" "}
                  <Link href="/login">
                    <span className="text-[#610000] hover:text-[#8b0000] font-semibold cursor-pointer transition-colors">
                      Sign In
                    </span>
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false
  });

  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  const checkPasswordStrength = (password: string) => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  };

  const isPasswordValid = Object.values(passwordStrength).every(Boolean);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy");
      return;
    }
    if (!isPasswordValid) {
      setError("Password does not meet security requirements");
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

      // Check if email confirmation is required
      if (data.session === null) {
        // Email confirmation required
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please click it to complete your registration.",
        });
        setLocation("/verify-email");
      } else {
        // Auto-confirmed (development mode or email confirmation disabled)
        toast({
          title: "Account created successfully!",
          description: "Welcome to CIMA Learn. Let's get started.",
        });
        setLocation("/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "password") checkPasswordStrength(value);
  };

  const handleGoogleSignup = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/auth/callback" },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12 relative">
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
            <CardTitle className="text-2xl">Get Started</CardTitle>
            <CardDescription>Create your CIMA Learn account</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="firstName" name="firstName" placeholder="John" value={formData.firstName} onChange={handleChange} required disabled={isLoading} className="pl-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="lastName" name="lastName" placeholder="Doe" value={formData.lastName} onChange={handleChange} required disabled={isLoading} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" name="email" type="email" placeholder="your.email@example.com" value={formData.email} onChange={handleChange} required disabled={isLoading} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={formData.password} onChange={handleChange} required disabled={isLoading} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isLoading} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2 space-y-1 text-xs">
                  <PasswordRequirement met={passwordStrength.hasMinLength} text="At least 8 characters" />
                  <PasswordRequirement met={passwordStrength.hasUpperCase} text="One uppercase letter" />
                  <PasswordRequirement met={passwordStrength.hasLowerCase} text="One lowercase letter" />
                  <PasswordRequirement met={passwordStrength.hasNumber} text="One number" />
                  <PasswordRequirement met={passwordStrength.hasSpecialChar} text="One special character" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} required disabled={isLoading} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="flex items-center space-x-2 text-xs mt-1">
                  {passwordsMatch ? (
                    <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600">Passwords match</span></>
                  ) : (
                    <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">Passwords do not match</span></>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox id="agreeToTerms" checked={formData.agreeToTerms} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreeToTerms: checked as boolean }))} disabled={isLoading} />
              <label htmlFor="agreeToTerms" className="text-sm text-muted-foreground leading-tight">
                I agree to the{" "}
                <Link href="/terms-of-service"><span className="text-primary hover:underline cursor-pointer">Terms of Service</span></Link>{" "}
                and{" "}
                <Link href="/privacy-policy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !formData.agreeToTerms}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : "Create Account"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" disabled={isLoading} onClick={handleGoogleSignup}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center">
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login"><span className="text-primary hover:underline font-medium cursor-pointer">Sign In</span></Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn("flex items-center space-x-2", met ? "text-green-600" : "text-muted-foreground")}>
      {met ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}

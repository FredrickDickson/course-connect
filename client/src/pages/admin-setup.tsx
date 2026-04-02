import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Settings, LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must contain a special character"),
  confirmPassword: z.string(),
  setupKey: z.string().min(1, "Setup key is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignupForm = z.infer<typeof signupSchema>;
type LoginForm = z.infer<typeof loginSchema>;

export default function AdminSetup() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: result } = await supabase.functions.invoke("admin-setup", {
          body: { checkOnly: true },
        });
        const exists = result?.adminExists === true;
        setAdminExists(exists);
        setActiveTab(exists ? "login" : "signup");
      } catch {
        setAdminExists(false);
        setActiveTab("signup");
      }
    };
    checkAdmin();
  }, []);

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", setupKey: "" },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSignup = async (data: SignupForm) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("admin-setup", {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          setupKey: data.setupKey,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({ title: "Admin Account Created", description: "Signing you in..." });
      
      // Auto-login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (loginError) throw loginError;
      
      // Wait for auth state to propagate before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      setLocation("/admin");
    } catch (error: any) {
      toast({ title: "Setup Failed", description: error.message || "Failed to setup admin account", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLogin = async (data: LoginForm) => {
    setIsSubmitting(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // Verify user is admin
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        throw new Error("This account does not have admin privileges. Please use the regular login page.");
      }

      toast({ title: "Welcome back, Admin!", description: "Redirecting to dashboard..." });
      // Wait for auth state to propagate before navigating
      await new Promise(resolve => setTimeout(resolve, 500));
      setLocation("/admin");
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (adminExists === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">CIMA Learn Admin</CardTitle>
            <CardDescription>Admin portal for platform management</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">
                <LogIn className="w-4 h-4 mr-2" />Sign In
              </TabsTrigger>
              <TabsTrigger value="signup">
                <Settings className="w-4 h-4 mr-2" />Setup
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@cimalearn.org" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                    ) : (
                      <><LogIn className="w-4 h-4 mr-2" />Sign In to Admin</>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup">
              {adminExists && (
                <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  An admin account already exists. New admin accounts can only be created by an existing admin from the dashboard.
                </div>
              )}
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl><Input placeholder="John" {...field} data-testid="input-first-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl><Input placeholder="Doe" {...field} data-testid="input-last-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="admin@cimalearn.org" {...field} data-testid="input-admin-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter a strong password" {...field} data-testid="input-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl><Input type="password" placeholder="Confirm your password" {...field} data-testid="input-confirm-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="setupKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup Key</FormLabel>
                        <FormControl><Input type="password" placeholder="Enter setup key" {...field} data-testid="input-setup-key" /></FormControl>
                        <FormMessage />
                        {!adminExists && (
                          <p className="text-xs text-muted-foreground">Default key: CIMA_ADMIN_SETUP_2024</p>
                        )}
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting || (adminExists === true)} data-testid="button-setup-admin">
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting up...</>
                    ) : (
                      <><Settings className="w-4 h-4 mr-2" />Setup Admin Account</>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

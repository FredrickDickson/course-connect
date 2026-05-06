import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap,
  FileText,
  Video,
  Upload,
  CheckCircle,
  Users,
  BookOpen,
  Award,
  DollarSign,
  Star,
  Clock,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const instructorApplicationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  bio: z.string().min(100, "Bio must be at least 100 characters").max(500, "Bio must be less than 500 characters"),
  experience: z.string().min(100, "Please provide detailed professional experience"),
  qualifications: z.string().min(50, "Please list your qualifications and certifications"),
  previousTeaching: z.string().min(50, "Please describe your teaching experience"),
  areasOfExpertise: z.array(z.string()).min(1, "Select at least one area of expertise"),
  agreedToTerms: z.boolean().refine(val => val === true, "You must agree to the terms and conditions"),
});

type InstructorApplicationForm = z.infer<typeof instructorApplicationSchema>;

const expertiseAreas = [
  "International Arbitration",
  "Commercial Mediation",
  "Cross-Border Disputes",
  "Investment Arbitration",
  "Construction Arbitration",
  "Employment Mediation",
  "Family Mediation",
  "Online Dispute Resolution",
  "Negotiation Techniques",
  "Conflict Resolution",
  "Maritime Arbitration",
  "Energy Disputes"
];

// Instructor Signup/Login Component
function InstructorAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
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
  const passwordsMatch = signupData.password === signupData.confirmPassword && signupData.confirmPassword !== "";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const { data, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            first_name: signupData.firstName,
            last_name: signupData.lastName,
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        // We let the backend auto-provision the user with the default 'student' role
        // on the first API call. This ensures no client-side role escalation.
        console.log("Instructor account created in Supabase Auth");
      }

      if (data.session) {
        toast({
          title: "Instructor account created!",
          description: "Welcome to CIMA. Complete your application to start teaching.",
        });
        // Page will re-render with authenticated state and show the application form
        window.location.reload();
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link. Please verify your email to continue.",
        });
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (authError) throw authError;

      // Check role
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profile?.role !== "instructor") {
        toast({
          title: "Not an instructor account",
          description: "This account is registered as a student. Please create a new instructor account.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Continue with your instructor application.",
      });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <GraduationCap className="w-12 h-12 text-primary mx-auto mb-3" />
        <h2 className="text-2xl font-bold">Instructor Account</h2>
        <p className="text-muted-foreground mt-1">
          Create a dedicated instructor account or sign in to your existing one.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="signup">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signup">Create Account</TabsTrigger>
          <TabsTrigger value="login">Sign In</TabsTrigger>
        </TabsList>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Instructor Account</CardTitle>
              <CardDescription>This is separate from any student account you may have.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signupFirstName">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signupFirstName" placeholder="John" value={signupData.firstName} onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))} required disabled={isLoading} className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupLastName">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signupLastName" placeholder="Doe" value={signupData.lastName} onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))} required disabled={isLoading} className="pl-10" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signupEmail" type="email" placeholder="instructor@example.com" value={signupData.email} onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))} required disabled={isLoading} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">Use a different email than your student account.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signupPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" value={signupData.password} onChange={(e) => { setSignupData(prev => ({ ...prev, password: e.target.value })); checkPasswordStrength(e.target.value); }} required disabled={isLoading} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupData.password && (
                    <div className="mt-2 space-y-1 text-xs">
                      <PasswordReq met={passwordStrength.hasMinLength} text="At least 8 characters" />
                      <PasswordReq met={passwordStrength.hasUpperCase} text="One uppercase letter" />
                      <PasswordReq met={passwordStrength.hasLowerCase} text="One lowercase letter" />
                      <PasswordReq met={passwordStrength.hasNumber} text="One number" />
                      <PasswordReq met={passwordStrength.hasSpecialChar} text="One special character" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupConfirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signupConfirm" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={signupData.confirmPassword} onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))} required disabled={isLoading} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupData.confirmPassword && (
                    <div className="flex items-center space-x-2 text-xs mt-1">
                      {passwordsMatch ? (
                        <><CheckCircle2 className="h-3 w-3 text-green-500" /><span className="text-green-600">Passwords match</span></>
                      ) : (
                        <><X className="h-3 w-3 text-destructive" /><span className="text-destructive">Passwords do not match</span></>
                      )}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : "Create Instructor Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sign In as Instructor</CardTitle>
              <CardDescription>Sign in with your existing instructor account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="loginEmail" type="email" placeholder="instructor@example.com" value={loginData.email} onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))} required disabled={isLoading} className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="loginPassword" type="password" placeholder="••••••••" value={loginData.password} onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))} required disabled={isLoading} className="pl-10" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : "Sign In"}
                </Button>

                <div className="text-center">
                  <Link href="/forgot-password">
                    <span className="text-sm text-primary hover:underline cursor-pointer">Forgot password?</span>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PasswordReq({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={cn("flex items-center space-x-2", met ? "text-green-600" : "text-muted-foreground")}>
      {met ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}

export default function BecomeInstructor() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const ext = file.name.split('.').pop();
    const filePath = `${folder}/${user!.id}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleCvUpload = async (file: File) => {
    setCvFile(file);
    setCvUploading(true);
    try {
      const url = await uploadFile(file, 'instructor-cv', 'cv');
      setCvUrl(url);
      toast({ title: "CV uploaded successfully" });
    } catch (err: any) {
      toast({ title: "CV upload failed", description: err.message, variant: "destructive" });
      setCvFile(null);
    } finally {
      setCvUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setVideoFile(file);
    setVideoUploading(true);
    try {
      const url = await uploadFile(file, 'instructor-videos', 'intro');
      setVideoUrl(url);
      toast({ title: "Video uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Video upload failed", description: err.message, variant: "destructive" });
      setVideoFile(null);
    } finally {
      setVideoUploading(false);
    }
  };

  const form = useForm<InstructorApplicationForm>({
    resolver: zodResolver(instructorApplicationSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      bio: "",
      experience: "",
      qualifications: "",
      previousTeaching: "",
      areasOfExpertise: [],
      agreedToTerms: false,
    },
  });

  const goToStep2 = async () => {
    const isValid = await form.trigger(["firstName", "lastName", "email", "phone", "bio"]);
    if (isValid) setStep(2);
  };

  const handleExpertiseChange = (area: string, checked: boolean) => {
    const nextSelected = checked
      ? [...selectedExpertise, area]
      : selectedExpertise.filter((item) => item !== area);

    setSelectedExpertise(nextSelected);
    form.setValue("areasOfExpertise", nextSelected, { shouldDirty: true, shouldValidate: true });

    if (nextSelected.length > 0) {
      form.clearErrors("areasOfExpertise");
    }
  };

  const goToStep3 = async () => {
    form.setValue("areasOfExpertise", selectedExpertise, { shouldDirty: true, shouldValidate: true });
    const isValid = await form.trigger(["experience", "qualifications", "previousTeaching", "areasOfExpertise"]);
    if (isValid) setStep(3);
  };

  const submitApplication = useMutation({
    mutationFn: async (data: InstructorApplicationForm) => {
      if (!user) throw new Error("You must be logged in to apply");

      const { error } = await supabase.from("instructor_applications").insert({
        user_id: user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        bio: data.bio,
        experience: data.experience,
        qualifications: data.qualifications,
        previous_teaching: data.previousTeaching,
        areas_of_expertise: data.areasOfExpertise,
        cv_url: cvUrl,
        video_intro_url: videoUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 3-5 business days.",
      });
      setLocation("/instructor");
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InstructorApplicationForm) => {
    submitApplication.mutate({
      ...data,
      areasOfExpertise: selectedExpertise,
    });
  };

  const onInvalid = (errors: any) => {
    if (errors.firstName || errors.lastName || errors.email || errors.phone || errors.bio) {
      setStep(1);
    } else if (errors.experience || errors.qualifications || errors.previousTeaching || errors.areasOfExpertise) {
      setStep(2);
    }

    toast({
      title: "Please complete the required fields",
      description: "Review the highlighted inputs before submitting your application.",
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Become a CIMA Instructor
            </h1>
            <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
              Share your expertise in Alternative Dispute Resolution and help professionals worldwide advance their careers.
            </p>

            {/* Benefits */}
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Global Reach</h3>
                <p className="text-primary-foreground/80">Teach thousands of students worldwide</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Earn Revenue</h3>
                <p className="text-primary-foreground/80">Generate income from your expertise</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Build Authority</h3>
                <p className="text-primary-foreground/80">Establish yourself as a thought leader</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth or Application */}
      {!isAuthenticated ? (
        <InstructorAuth />
      ) : (
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-center mb-4">Instructor Application</h2>
              <p className="text-muted-foreground text-center mb-4">
                Please provide detailed information about your background and expertise.
              </p>
              <Alert className="max-w-2xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Application Process:</strong> Your application will be reviewed by our team within 3-5 business days. 
                  Once approved, you'll receive an email confirmation and can immediately start creating courses.
                </AlertDescription>
              </Alert>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>1</div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>2</div>
                <div className={`w-16 h-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>3</div>
              </div>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-8">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Tell us about yourself and your professional background.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" {...form.register("firstName")} placeholder="Your first name" />
                        {form.formState.errors.firstName && <p className="text-sm text-destructive mt-1">{form.formState.errors.firstName.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" {...form.register("lastName")} placeholder="Your last name" />
                        {form.formState.errors.lastName && <p className="text-sm text-destructive mt-1">{form.formState.errors.lastName.message}</p>}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" {...form.register("email")} placeholder="your.email@example.com" />
                        {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" {...form.register("phone")} placeholder="+1 (555) 123-4567" />
                        {form.formState.errors.phone && <p className="text-sm text-destructive mt-1">{form.formState.errors.phone.message}</p>}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="bio">Professional Bio</Label>
                      <Textarea id="bio" {...form.register("bio")} placeholder="Tell us about your professional background..." rows={4} />
                      <p className="text-xs text-muted-foreground mt-1">{form.watch("bio")?.length || 0}/500 characters (minimum 100)</p>
                      {form.formState.errors.bio && <p className="text-sm text-destructive mt-1">{form.formState.errors.bio.message}</p>}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" onClick={goToStep2}>Next Step</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <GraduationCap className="w-5 h-5 mr-2" />
                      Professional Experience
                    </CardTitle>
                    <CardDescription>Share your expertise and qualifications in ADR.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="experience">Professional Experience</Label>
                      <Textarea id="experience" {...form.register("experience")} placeholder="Describe your professional experience in ADR..." rows={4} />
                      {form.formState.errors.experience && <p className="text-sm text-destructive mt-1">{form.formState.errors.experience.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="qualifications">Qualifications & Certifications</Label>
                      <Textarea id="qualifications" {...form.register("qualifications")} placeholder="List your education, certifications..." rows={4} />
                      {form.formState.errors.qualifications && <p className="text-sm text-destructive mt-1">{form.formState.errors.qualifications.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="previousTeaching">Teaching Experience</Label>
                      <Textarea id="previousTeaching" {...form.register("previousTeaching")} placeholder="Describe any previous teaching experience..." rows={3} />
                      {form.formState.errors.previousTeaching && <p className="text-sm text-destructive mt-1">{form.formState.errors.previousTeaching.message}</p>}
                    </div>
                    <div>
                      <Label>Areas of Expertise</Label>
                      <p className="text-sm text-muted-foreground mb-3">Select all areas where you have expertise to teach.</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {expertiseAreas.map((area) => (
                          <div key={area} className="flex items-center space-x-2">
                            <Checkbox
                              id={area}
                              checked={selectedExpertise.includes(area)}
                              onCheckedChange={(checked) => handleExpertiseChange(area, checked === true)}
                            />
                            <Label htmlFor={area} className="text-sm font-normal">{area}</Label>
                          </div>
                        ))}
                      </div>
                      {form.formState.errors.areasOfExpertise && <p className="text-sm text-destructive mt-2">{form.formState.errors.areasOfExpertise.message}</p>}
                    </div>
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setStep(1)}>Previous</Button>
                      <Button type="button" onClick={goToStep3}>Next Step</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Documents & Final Steps
                    </CardTitle>
                    <CardDescription>Upload supporting documents and review your application.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>CV/Resume (Optional)</Label>
                      {cvUrl ? (
                        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="font-medium text-green-900 dark:text-green-100">CV uploaded</p>
                                <p className="text-sm text-green-700 dark:text-green-300">{cvFile?.name}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setCvUrl(null); setCvFile(null); }}>Change</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">Upload your CV or resume (PDF, DOC, DOCX — max 10MB)</p>
                          <label>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  if (f.size > 10 * 1024 * 1024) {
                                    toast({ title: "File too large", description: "Maximum size is 10MB", variant: "destructive" });
                                    return;
                                  }
                                  handleCvUpload(f);
                                }
                              }}
                              disabled={cvUploading}
                            />
                            <Button variant="outline" size="sm" asChild disabled={cvUploading}>
                              <span>{cvUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Choose File"}</span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Video Introduction (Optional)</Label>
                      {videoUrl ? (
                        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="font-medium text-green-900 dark:text-green-100">Video uploaded</p>
                                <p className="text-sm text-green-700 dark:text-green-300">{videoFile?.name}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setVideoUrl(null); setVideoFile(null); }}>Change</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                          <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">Record a 2-3 minute introduction video (MP4, MOV, WebM — max 500MB)</p>
                          <label>
                            <input
                              type="file"
                              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  if (f.size > 500 * 1024 * 1024) {
                                    toast({ title: "File too large", description: "Maximum size is 500MB", variant: "destructive" });
                                    return;
                                  }
                                  handleVideoUpload(f);
                                }
                              }}
                              disabled={videoUploading}
                            />
                            <Button variant="outline" size="sm" asChild disabled={videoUploading}>
                              <span>{videoUploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Upload Video"}</span>
                            </Button>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="agreedToTerms"
                        checked={form.watch("agreedToTerms")}
                        onCheckedChange={(checked) => form.setValue("agreedToTerms", checked as boolean)}
                      />
                      <Label htmlFor="agreedToTerms" className="text-sm leading-relaxed">
                        I agree to CIMA's instructor terms and conditions, including content guidelines, revenue sharing agreement, and professional conduct standards.
                      </Label>
                    </div>
                    {form.formState.errors.agreedToTerms && <p className="text-sm text-destructive">{form.formState.errors.agreedToTerms.message}</p>}

                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">What happens next?</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Our team will review your application within 3-5 business days</li>
                        <li>• We may contact you for additional information or an interview</li>
                        <li>• Once approved, you'll receive access to create and publish courses</li>
                        <li>• You'll be notified via email about the status of your application</li>
                      </ul>
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setStep(2)}>Previous</Button>
                      <Button type="submit" disabled={submitApplication.isPending || !form.watch("agreedToTerms")}>
                        {submitApplication.isPending ? (
                          <><Clock className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4 mr-2" />Submit Application</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </form>

            {/* Why Teach Section */}
            <Card className="mt-12">
              <CardHeader>
                <CardTitle>Why Teach with CIMA?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Star className="w-4 h-4 mr-2 text-accent" />
                      Professional Platform
                    </h4>
                    <p className="text-sm text-muted-foreground">Join a respected platform dedicated to Alternative Dispute Resolution education.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Users className="w-4 h-4 mr-2 text-primary" />
                      Global Community
                    </h4>
                    <p className="text-sm text-muted-foreground">Connect with ADR professionals and students from around the world.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-secondary" />
                      Course Creation Tools
                    </h4>
                    <p className="text-sm text-muted-foreground">Access powerful tools to create engaging courses with video, quizzes, and resources.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-2 text-accent" />
                      Recognition & Impact
                    </h4>
                    <p className="text-sm text-muted-foreground">Build your reputation while making a meaningful impact on the ADR field.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}

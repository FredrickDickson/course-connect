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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation } from "wouter";
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
  Clock
} from "lucide-react";

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

export default function BecomeInstructor() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);

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

  const submitApplication = useMutation({
    mutationFn: async (data: InstructorApplicationForm) => {
      if (!isAuthenticated) {
        throw new Error("You must be logged in to apply");
      }
      
      await apiRequest("POST", "/api/instructor-applications", {
        ...data,
        areasOfExpertise: selectedExpertise,
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 3-5 business days.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="text-center">
            <CardContent className="p-8">
              <GraduationCap className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">Login Required</h2>
              <p className="text-muted-foreground mb-6">
                You need to be logged in to apply as an instructor. If you don't have an account yet, sign up first.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/login">
                  <Button>Log In to Continue</Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline">Create Account</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Footer />
      </div>
    );
  }

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

      {/* Application Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-center mb-4">Instructor Application</h2>
            <p className="text-muted-foreground text-center">
              Please provide detailed information about your background and expertise.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                2
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                3
              </div>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Tell us about yourself and your professional background.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        {...form.register("firstName")}
                        placeholder="Your first name"
                      />
                      {form.formState.errors.firstName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        {...form.register("lastName")}
                        placeholder="Your last name"
                      />
                      {form.formState.errors.lastName && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="your.email@example.com"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="+1 (555) 123-4567"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      {...form.register("bio")}
                      placeholder="Tell us about your professional background, current role, and what motivates you to teach..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.watch("bio")?.length || 0}/500 characters (minimum 100)
                    </p>
                    {form.formState.errors.bio && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.bio.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={() => setStep(2)}>
                      Next Step
                    </Button>
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
                  <CardDescription>
                    Share your expertise and qualifications in ADR.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="experience">Professional Experience</Label>
                    <Textarea
                      id="experience"
                      {...form.register("experience")}
                      placeholder="Describe your professional experience in Alternative Dispute Resolution, including years of practice, notable cases, and current position..."
                      rows={4}
                    />
                    {form.formState.errors.experience && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.experience.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="qualifications">Qualifications & Certifications</Label>
                    <Textarea
                      id="qualifications"
                      {...form.register("qualifications")}
                      placeholder="List your education, certifications, bar admissions, and relevant qualifications..."
                      rows={4}
                    />
                    {form.formState.errors.qualifications && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.qualifications.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="previousTeaching">Teaching Experience</Label>
                    <Textarea
                      id="previousTeaching"
                      {...form.register("previousTeaching")}
                      placeholder="Describe any previous teaching, training, or mentoring experience..."
                      rows={3}
                    />
                    {form.formState.errors.previousTeaching && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.previousTeaching.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Areas of Expertise</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select all areas where you have expertise to teach.
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {expertiseAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={area}
                            checked={selectedExpertise.includes(area)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedExpertise([...selectedExpertise, area]);
                              } else {
                                setSelectedExpertise(selectedExpertise.filter(e => e !== area));
                              }
                            }}
                          />
                          <Label htmlFor={area} className="text-sm font-normal">
                            {area}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedExpertise.length === 0 && (
                      <p className="text-sm text-destructive mt-2">
                        Please select at least one area of expertise.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(1)}>
                      Previous
                    </Button>
                    <Button type="button" onClick={() => setStep(3)}>
                      Next Step
                    </Button>
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
                  <CardDescription>
                    Upload supporting documents and review your application.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload Placeholders */}
                  <div>
                    <Label>CV/Resume (Optional)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Upload your CV or resume (PDF, DOC, or DOCX)
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" disabled>
                        Choose File (Coming Soon)
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Video Introduction (Optional)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      <Video className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Record a 2-3 minute introduction video (MP4, MOV, or AVI)
                      </p>
                      <Button variant="outline" size="sm" className="mt-2" disabled>
                        Upload Video (Coming Soon)
                      </Button>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreedToTerms"
                      checked={form.watch("agreedToTerms")}
                      onCheckedChange={(checked) => form.setValue("agreedToTerms", checked as boolean)}
                    />
                    <Label htmlFor="agreedToTerms" className="text-sm leading-relaxed">
                      I agree to CIMA's instructor terms and conditions, including content guidelines, 
                      revenue sharing agreement, and professional conduct standards.
                    </Label>
                  </div>
                  {form.formState.errors.agreedToTerms && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.agreedToTerms.message}
                    </p>
                  )}

                  {/* Submit */}
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
                    <Button type="button" variant="outline" onClick={() => setStep(2)}>
                      Previous
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitApplication.isPending || !form.watch("agreedToTerms")}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {submitApplication.isPending ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Submit Application
                        </>
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
                    <Star className="w-4 h-4 mr-2 text-yellow-500" />
                    Professional Platform
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Join a respected platform dedicated to Alternative Dispute Resolution education.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2 text-blue-500" />
                    Global Community
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Connect with ADR professionals and students from around the world.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-green-500" />
                    Course Creation Tools
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Access powerful tools to create engaging courses with video, quizzes, and resources.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Award className="w-4 h-4 mr-2 text-purple-500" />
                    Recognition & Impact
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Build your reputation while making a meaningful impact on the ADR field.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
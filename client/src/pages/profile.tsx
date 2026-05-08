import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvatarUpload from "@/components/avatar-upload";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Mail,
  Globe,
  Clock,
  BookOpen,
  Award,
  Edit2,
  Save,
  X,
  ArrowLeft,
  Building2,
  Briefcase,
  GraduationCap,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import CertificatePreviewModal from "@/components/dashboard/certificate-preview-modal";
import type { CertificateData } from "@/lib/certificate-generator";
import { PATHWAY_TYPES, type PathwayType } from "@shared/pathways";

const INDUSTRIES = [
  "Legal", "Business / Corporate", "Public Sector / Government", "Academic / Education",
  "Financial Services", "Construction / Real Estate", "Energy / Oil & Gas", "Maritime / Shipping",
  "Technology", "Healthcare", "Other",
];

const ROLE_CATEGORIES = [
  "Legal Practitioner", "Business Professional", "Public Sector Official",
  "Academic / Researcher", "Arbitrator / Mediator", "Student", "Other",
];

const EDUCATION_LEVELS = [
  "High School / Secondary", "Diploma / Certificate", "Bachelor's Degree",
  "Master's Degree", "Doctorate / PhD", "Professional Qualification",
];

const EXPERIENCE_LEVELS = [
  "0-2 years", "3-5 years", "6-10 years", "11-15 years", "16-20 years", "20+ years",
];

const ADR_OPTIONS = [
  { value: "none", label: "None" },
  { value: "associate", label: "Part I (Associate)" },
  { value: "member", label: "Part II (Member)" },
  { value: "fellow", label: "Part III (Fellow)" },
];

const TIMEZONES = [
  "UTC-12:00 (Baker Island)",
  "UTC-11:00 (American Samoa)",
  "UTC-10:00 (Hawaii)",
  "UTC-09:30 (Marquesas Islands)",
  "UTC-09:00 (Alaska)",
  "UTC-08:00 (Pacific Time)",
  "UTC-07:00 (Mountain Time)",
  "UTC-06:00 (Central Time)",
  "UTC-05:00 (Eastern Time)",
  "UTC-04:00 (Atlantic Time)",
  "UTC-03:30 (Newfoundland)",
  "UTC-03:00 (Buenos Aires)",
  "UTC-02:00 (Fernando de Noronha)",
  "UTC-01:00 (Azores)",
  "UTC+00:00 (London, Dublin)",
  "UTC+01:00 (Central European Time)",
  "UTC+02:00 (Eastern European Time)",
  "UTC+03:00 (Moscow, Istanbul)",
  "UTC+03:30 (Tehran)",
  "UTC+04:00 (Dubai, Baku)",
  "UTC+04:30 (Kabul)",
  "UTC+05:00 (Karachi, Tashkent)",
  "UTC+05:30 (India, Sri Lanka)",
  "UTC+05:45 (Nepal)",
  "UTC+06:00 (Dhaka, Almaty)",
  "UTC+06:30 (Yangon)",
  "UTC+07:00 (Bangkok, Jakarta)",
  "UTC+08:00 (Beijing, Singapore)",
  "UTC+08:30 (Pyongyang)",
  "UTC+09:00 (Tokyo, Seoul)",
  "UTC+09:30 (Adelaide)",
  "UTC+10:00 (Sydney, Melbourne)",
  "UTC+10:30 (Lord Howe Island)",
  "UTC+11:00 (Solomon Islands)",
  "UTC+12:00 (Auckland, Fiji)",
  "UTC+12:45 (Chatham Islands)",
  "UTC+13:00 (Samoa)",
  "UTC+14:00 (Line Islands)",
];

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);

  // Certificate modal state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [activeCertData, setActiveCertData] = useState<CertificateData | null>(null);

  const [basicForm, setBasicForm] = useState({
    firstName: "", middleName: "", lastName: "", bio: "", country: "", timezone: "",
  });

  const [profForm, setProfForm] = useState({
    phone: "", whatsapp: "", address: "", institution: "", jobTitle: "",
    yearsExperience: "", industry: "", roleCategory: "", educationLevel: "",
    adrExperience: "none",
  });

  // Fetch profile from profiles table
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch enrollments
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<any[]>({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      // Get payment enrollments from course_enrollments
      const { data: paymentEnrollments, error: paymentError } = await supabase
        .from("course_enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user!.id)
        .neq("payment_status", "cancelled");
      if (paymentError) throw paymentError;
      
      // Get progress enrollments from enrollments table
      const { data: progressEnrollments, error: progressError } = await supabase
        .from("enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user!.id);
      if (progressError) throw progressError;
      
      // Combine and deduplicate by course_id
      const allEnrollments = [...(paymentEnrollments || []), ...(progressEnrollments || [])];
      const uniqueEnrollments = allEnrollments.reduce((acc: any[], enrollment) => {
        const existing = acc.find(e => e.course_id === enrollment.course_id);
        if (!existing) {
          acc.push(enrollment);
        }
        return acc;
      }, []);
      
      return uniqueEnrollments;
    },
    enabled: !!user?.id,
  });

  // Fetch member record
  const { data: memberRecord } = useQuery({
    queryKey: ["my-member-record", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("members")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Initialize forms
  useEffect(() => {
    if (user) {
      setBasicForm({
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        bio: user.bio || "",
        country: user.country || "",
        timezone: user.timezone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      setProfForm({
        phone: profile.phone || "",
        whatsapp: profile.whatsapp || "",
        address: profile.address || "",
        institution: profile.institution || "",
        jobTitle: profile.job_title || "",
        yearsExperience: profile.years_experience || "",
        industry: profile.industry || "",
        roleCategory: profile.role_category || "",
        educationLevel: profile.education_level || "",
        adrExperience: profile.adr_experience || "none",
      });
    }
  }, [profile]);

  // Save basic info
  const saveBasicMutation = useMutation({
    mutationFn: async (data: any) => {
      const fullName = `${data.firstName} ${data.middleName} ${data.lastName}`.trim().replace(/\s+/g, " ");

      // Update users table
      const { error: userError } = await (supabase as any)
        .from("users")
        .update({
          first_name: data.firstName,
          middle_name: data.middleName || null,
          last_name: data.lastName,
          bio: data.bio,
          country: data.country,
          timezone: data.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);
      if (userError) throw userError;

      // Update profiles table (full_name, country, timezone)
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: fullName,
          country: data.country,
          timezone: data.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user!.id);
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      toast({ title: "Personal info updated" });
      setIsEditingBasic(false);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  // Save professional info
  const saveProfMutation = useMutation({
    mutationFn: async (data: typeof profForm) => {
      const payload = {
        user_id: user!.id,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        institution: data.institution,
        job_title: data.jobTitle,
        years_experience: data.yearsExperience,
        industry: data.industry,
        role_category: data.roleCategory,
        education_level: data.educationLevel,
        adr_experience: data.adrExperience,
        full_name: `${basicForm.firstName} ${basicForm.lastName}`.trim(),
        country: basicForm.country,
        profile_completed: !!(data.institution && data.industry && data.roleCategory && data.educationLevel),
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Professional profile updated" });
      setIsEditingProfessional(false);
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  // Profile completion
  const completionChecks = [
    { label: "Name", done: !!(user?.firstName && user?.lastName) },
    { label: "Country", done: !!basicForm.country },
    { label: "Phone", done: !!profForm.phone },
    { label: "Institution", done: !!profForm.institution },
    { label: "Industry", done: !!profForm.industry },
    { label: "Role category", done: !!profForm.roleCategory },
    { label: "Education", done: !!profForm.educationLevel },
    { label: "ADR experience", done: profForm.adrExperience !== "none" },
  ];
  const completionPercent = Math.round((completionChecks.filter((c) => c.done).length / completionChecks.length) * 100);
  const missingFields = completionChecks.filter((c) => !c.done);

  const completedCourses = enrollments.filter((e: any) => e.completed_at);
  const inProgressCourses = enrollments.filter((e: any) => !e.completed_at);

  // Helper functions for certificate data
  function normaliseLevel(level?: string | null): "associate" | "member" | "fellow" {
    const l = (level || "").toLowerCase();
    if (l.includes("fellow")) return "fellow";
    if (l.includes("member")) return "member";
    return "associate";
  }

  function normalisePathway(track?: string | null): PathwayType {
    return (track || "").toLowerCase().includes("med")
      ? PATHWAY_TYPES.MEDIATION
      : PATHWAY_TYPES.ARBITRATION;
  }

  // Handle opening certificate preview
  const openPreview = async (course: any, completedAt: string) => {
    // Best-effort: record issuance so admins can audit. Ignore failures (e.g., unique conflict).
    try {
      await supabase.from("certificates").upsert(
        {
          user_id: user!.id,
          track: (course.track || "ARBITRATION").toUpperCase(),
          level: (course.level || "associate").toUpperCase(),
          pathway: "STANDARD",
          post_nominal: "",
          certificate_number: `${course.id.slice(0, 8).toUpperCase()}-${user!.id.slice(0, 6).toUpperCase()}`,
          issued_at: completedAt,
        },
        { onConflict: "user_id,track,level" } as any,
      );
    } catch {
      // Non-fatal
    }

    const fullName = [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Member";

    setActiveCertData({
      fullName,
      membershipLevel: normaliseLevel(course.level),
      memberId: `${course.id.slice(0, 8).toUpperCase()}`,
      issueDate: completedAt,
      expiryDate: new Date(new Date(completedAt).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      pathway: normalisePathway(course.track),
    });
    setCertModalOpen(true);
  };

  // Handle course query parameter to auto-open certificate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get("course");
    const tab = params.get("tab");

    if (courseId && tab === "certificates" && completedCourses.length > 0) {
      const targetCourse = completedCourses.find((e: any) => e.course_id === courseId);
      if (targetCourse && targetCourse.completed_at) {
        // Auto-open certificate preview
        openPreview(targetCourse.course, targetCourse.completed_at);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [completedCourses]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
        </Link>

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <AvatarUpload
                currentAvatarUrl={profile?.avatar_url}
                userId={user.id}
                userName={`${user.firstName} ${user.lastName}`}
                onAvatarChange={(url) => {
                  qc.invalidateQueries({ queryKey: ["my-profile"] });
                }}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{user.firstName} {user.middleName} {user.lastName}</h1>
                    {memberRecord && (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{memberRecord.post_nominal || memberRecord.part}</Badge>
                        <span className="text-xs text-muted-foreground">Member ID: {memberRecord.member_id}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3.5 w-3.5" /> {user.email}
                    </p>
                  </div>
                  <Badge variant={user.role === "admin" ? "default" : user.role === "instructor" ? "secondary" : "outline"}>
                    {user.role}
                  </Badge>
                </div>

                {/* Profile Completion */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Profile Completeness</span>
                    <span className="text-sm font-bold text-primary">{completionPercent}%</span>
                  </div>
                  <Progress value={completionPercent} className="h-2 mb-2" />
                  {missingFields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {missingFields.map((f) => (
                        <span key={f.label} className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3 h-3" /> {f.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info"><User className="h-4 w-4 mr-2" />Information</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-2" />My Courses ({enrollments.length})</TabsTrigger>
            <TabsTrigger value="certificates"><Award className="h-4 w-4 mr-2" />Certificates ({completedCourses.length})</TabsTrigger>
          </TabsList>

          {/* ===== INFORMATION TAB ===== */}
          <TabsContent value="info" className="space-y-6 mt-6">
            {/* Personal Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                  <CardDescription>Basic contact details</CardDescription>
                </div>
                {!isEditingBasic ? (
                  <Button onClick={() => setIsEditingBasic(true)} variant="outline" size="sm" aria-label="Edit basic information">
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveBasicMutation.mutate(basicForm)} disabled={saveBasicMutation.isPending} aria-label="Save basic information">
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingBasic(false); setBasicForm({ firstName: user.firstName || "", middleName: user.middleName || "", lastName: user.lastName || "", bio: user.bio || "", country: user.country || "", timezone: user.timezone || "" }); }} aria-label="Cancel editing basic information">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">First Name</Label>
                    {isEditingBasic ? (
                      <Input value={basicForm.firstName} onChange={(e) => setBasicForm({ ...basicForm, firstName: e.target.value })} />
                    ) : (
                      <p className="font-medium">{basicForm.firstName || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Middle Name (Optional)</Label>
                    {isEditingBasic ? (
                      <Input value={basicForm.middleName} onChange={(e) => setBasicForm({ ...basicForm, middleName: e.target.value })} placeholder="Optional" />
                    ) : (
                      <p className="font-medium">{basicForm.middleName || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Last Name</Label>
                    {isEditingBasic ? (
                      <Input value={basicForm.lastName} onChange={(e) => setBasicForm({ ...basicForm, lastName: e.target.value })} />
                    ) : (
                      <p className="font-medium">{basicForm.lastName || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  {isEditingBasic ? (
                    <Textarea value={basicForm.bio} onChange={(e) => setBasicForm({ ...basicForm, bio: e.target.value })} rows={3} placeholder="Tell us about yourself..." />
                  ) : (
                    <p className="text-sm text-muted-foreground">{basicForm.bio || "No bio added yet"}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" /> Country</Label>
                    {isEditingBasic ? (
                      <Input value={basicForm.country} onChange={(e) => setBasicForm({ ...basicForm, country: e.target.value })} placeholder="e.g. Ghana" />
                    ) : (
                      <p className="font-medium">{basicForm.country || "—"}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Timezone</Label>
                    {isEditingBasic ? (
                      <Select value={basicForm.timezone} onValueChange={(v) => setBasicForm({ ...basicForm, timezone: v })}>
                        <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="font-medium">{basicForm.timezone || "—"}</p>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Member Since:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Professional Profile</CardTitle>
                  <CardDescription>Career and qualification details — reused across enrollments</CardDescription>
                </div>
                {!isEditingProfessional ? (
                  <Button onClick={() => setIsEditingProfessional(true)} variant="outline" size="sm" aria-label="Edit professional information">
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveProfMutation.mutate(profForm)} disabled={saveProfMutation.isPending} aria-label="Save professional information">
                      <Save className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setIsEditingProfessional(false); if (profile) setProfForm({ phone: profile.phone || "", whatsapp: profile.whatsapp || "", address: profile.address || "", institution: profile.institution || "", jobTitle: profile.job_title || "", yearsExperience: profile.years_experience || "", industry: profile.industry || "", roleCategory: profile.role_category || "", educationLevel: profile.education_level || "", adrExperience: profile.adr_experience || "none" }); }} aria-label="Cancel editing professional information">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <div className="text-center py-6 text-muted-foreground">Loading profile...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
                        {isEditingProfessional ? (
                          <Input value={profForm.phone} onChange={(e) => setProfForm({ ...profForm, phone: e.target.value })} placeholder="+233..." />
                        ) : (
                          <p className="font-medium">{profForm.phone || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">WhatsApp</Label>
                        {isEditingProfessional ? (
                          <Input value={profForm.whatsapp} onChange={(e) => setProfForm({ ...profForm, whatsapp: e.target.value })} placeholder="+233..." />
                        ) : (
                          <p className="font-medium">{profForm.whatsapp || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</Label>
                      {isEditingProfessional ? (
                        <Input value={profForm.address} onChange={(e) => setProfForm({ ...profForm, address: e.target.value })} placeholder="Street, City" />
                      ) : (
                        <p className="font-medium">{profForm.address || "—"}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Institution / Firm</Label>
                        {isEditingProfessional ? (
                          <Input value={profForm.institution} onChange={(e) => setProfForm({ ...profForm, institution: e.target.value })} />
                        ) : (
                          <p className="font-medium">{profForm.institution || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Job Title</Label>
                        {isEditingProfessional ? (
                          <Input value={profForm.jobTitle} onChange={(e) => setProfForm({ ...profForm, jobTitle: e.target.value })} />
                        ) : (
                          <p className="font-medium">{profForm.jobTitle || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                        {isEditingProfessional ? (
                          <Select value={profForm.yearsExperience} onValueChange={(v) => setProfForm({ ...profForm, yearsExperience: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{EXPERIENCE_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">{profForm.yearsExperience || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Industry</Label>
                        {isEditingProfessional ? (
                          <Select value={profForm.industry} onValueChange={(v) => setProfForm({ ...profForm, industry: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">{profForm.industry || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Role Category</Label>
                        {isEditingProfessional ? (
                          <Select value={profForm.roleCategory} onValueChange={(v) => setProfForm({ ...profForm, roleCategory: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{ROLE_CATEGORIES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">{profForm.roleCategory || "—"}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Education Level</Label>
                        {isEditingProfessional ? (
                          <Select value={profForm.educationLevel} onValueChange={(v) => setProfForm({ ...profForm, educationLevel: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{EDUCATION_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <p className="font-medium">{profForm.educationLevel || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="w-3 h-3" /> ADR Experience</Label>
                      {isEditingProfessional ? (
                        <Select value={profForm.adrExperience} onValueChange={(v) => setProfForm({ ...profForm, adrExperience: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ADR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <p className="font-medium capitalize">{profForm.adrExperience === "none" ? "Not specified" : profForm.adrExperience}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== COURSES TAB ===== */}
          <TabsContent value="courses" className="mt-6">
            <div className="space-y-6">
              {inProgressCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>In Progress ({inProgressCourses.length})</CardTitle>
                    <CardDescription>Courses you're currently taking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inProgressCourses.map((enrollment: any) => (
                        <Link key={enrollment.id} href={`/learn/${enrollment.course_id}/${enrollment.course.id}`}>
                          <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                            {enrollment.course.thumbnail_url && (
                              <img src={enrollment.course.thumbnail_url} alt={enrollment.course.title} className="w-24 h-16 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold">{enrollment.course.title}</h4>
                              <p className="text-sm text-muted-foreground">{enrollment.course.subtitle}</p>
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <div className="flex-1 bg-secondary rounded-full h-2">
                                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${enrollment.progress}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Continue Learning</Button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {completedCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Completed ({completedCourses.length})</CardTitle>
                    <CardDescription>Courses you've finished</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {completedCourses.map((enrollment: any) => (
                        <div key={enrollment.id} className="border rounded-lg p-4">
                          {enrollment.course.thumbnail_url && (
                            <img src={enrollment.course.thumbnail_url} alt={enrollment.course.title} className="w-full h-32 object-cover rounded mb-3" />
                          )}
                          <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Completed: {new Date(enrollment.completed_at!).toLocaleDateString()}</span>
                            <Badge variant="secondary"><Award className="h-3 w-3 mr-1" />Certified</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {enrollments.length === 0 && !isLoadingEnrollments && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Courses Yet</h3>
                    <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
                    <Link href="/course-catalog"><Button>Browse Courses</Button></Link>
                  </CardContent>
                </Card>
              )}

              {isLoadingEnrollments && (
                <LoadingState message="Loading your courses..." />
              )}
            </div>
          </TabsContent>

          {/* ===== CERTIFICATES TAB ===== */}
          <TabsContent value="certificates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Certificates</CardTitle>
                <CardDescription>
                  View and download your course completion certificates.
                  <span className="block mt-1 text-xs text-muted-foreground">
                    Note: You receive one certificate per track per level. Additional courses at the same level are recorded as supplementary training.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedCourses.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedCourses.map((enrollment: any) => (
                      <div key={enrollment.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{enrollment.course.title}</h4>
                            <p className="text-xs text-muted-foreground">{new Date(enrollment.completed_at!).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => openPreview(enrollment.course, enrollment.completed_at!)}
                        >
                          View Certificate
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground">Complete courses to earn certificates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Certificate Preview Modal */}
      {activeCertData && (
        <CertificatePreviewModal
          open={certModalOpen}
          onOpenChange={setCertModalOpen}
          data={activeCertData}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ArrowRight, CheckCircle, User, Briefcase, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";

const PROFESSIONAL_BACKGROUNDS = [
  "Lawyer / Legal Practitioner",
  "Judge / Judicial Officer",
  "Academic / Lecturer",
  "ADR Practitioner",
  "Corporate Executive",
  "Government Official",
  "Student",
  "Other",
];

const QUALIFICATIONS = [
  "LLB / Law Degree",
  "LLM",
  "PhD",
  "Non-law Degree",
  "Professional Certification",
  "Other",
];

const EXPERIENCE_OPTIONS = [
  "None",
  "Less than 2 years",
  "2–5 years",
  "5–10 years",
  "10+ years",
];

const REFERRAL_SOURCES = [
  "Website",
  "Social Media",
  "Referral from colleague",
  "Email newsletter",
  "Conference / event",
  "Other",
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    nationality: "",
    country: "",
    city: "",
    phone: "",
    whatsapp: "",
    address: "",
    profile_photo_url: "",
    job_title: "",
    organisation: "",
    professional_background: "",
    highest_qualification: "",
    years_experience: "",
    linkedin_url: "",
    referral_source: "",
  });

  // Load existing profile data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setForm(prev => ({
          ...prev,
          full_name: data.full_name || `${user.firstName} ${user.lastName}`.trim(),
          email: user.email || "",
          date_of_birth: data.date_of_birth || "",
          gender: data.gender || "",
          nationality: data.nationality || "",
          country: data.country || "",
          city: data.city || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          address: data.address || "",
          profile_photo_url: data.profile_photo_url || "",
          job_title: data.job_title || "",
          organisation: data.organisation || data.institution || "",
          professional_background: data.professional_background || "",
          highest_qualification: data.highest_qualification || data.education_level || "",
          years_experience: data.years_experience || "",
          linkedin_url: data.linkedin_url || "",
          referral_source: data.referral_source || "",
        }));
        // If step 1 is done, resume at step 2
        if (data.phone && data.country && !data.bio_data_completed) {
          setStep(2);
        }
      } else {
        setForm(prev => ({
          ...prev,
          full_name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email || "",
        }));
      }
      setIsLoading(false);
    };
    load();
  }, [user]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "phone" && whatsappSameAsPhone) {
      setForm(prev => ({ ...prev, whatsapp: value }));
    }
  };

  const saveStep1 = async () => {
    if (!user) return;
    if (!form.date_of_birth || !form.gender || !form.nationality || !form.country || !form.city || !form.phone || !form.address) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        full_name: form.full_name,
        date_of_birth: form.date_of_birth,
        gender: form.gender,
        nationality: form.nationality,
        country: form.country,
        city: form.city,
        phone: form.phone,
        whatsapp: form.whatsapp || form.phone,
        address: form.address,
        profile_photo_url: form.profile_photo_url,
      }, { onConflict: "user_id" });

      if (error) throw error;
      toast.success("Personal info saved!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStep2 = async () => {
    if (!user) return;
    if (!form.job_title || !form.organisation || !form.professional_background || !form.highest_qualification || !form.years_experience || !form.referral_source) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        job_title: form.job_title,
        organisation: form.organisation,
        institution: form.organisation,
        professional_background: form.professional_background,
        highest_qualification: form.highest_qualification,
        education_level: form.highest_qualification,
        years_experience: form.years_experience,
        linkedin_url: form.linkedin_url,
        referral_source: form.referral_source,
        bio_data_completed: true,
        membership_level: "associate",
        level_assigned_by: "system",
        level_assigned_at: new Date().toISOString(),
        level_assignment_reason: "New user — default Associate level",
        profile_completed: true,
      }, { onConflict: "user_id" });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: user.id,
        event_type: "profile_completed",
        description: "Profile onboarding completed",
        metadata: { level: "associate" },
      });

      toast.success("Profile complete! Welcome to CIMA Learn.");
      
      // Redirect to stored destination or dashboard
      const redirect = sessionStorage.getItem("redirectAfterLogin");
      sessionStorage.removeItem("redirectAfterLogin");
      setLocation(redirect || "/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = form.full_name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Step {step} of 2</span>
            <span className="text-sm text-muted-foreground">{step === 1 ? "Personal" : "Professional"}</span>
          </div>
          <div className="flex gap-2">
            <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Pre-filled read-only fields */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={form.profile_photo_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{form.full_name}</p>
                  <p className="text-sm text-muted-foreground">{form.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth *</Label>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={e => updateField("date_of_birth", e.target.value)}
                    max={new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <div className="flex gap-2">
                    {GENDERS.map(g => (
                      <Button
                        key={g.value}
                        type="button"
                        variant={form.gender === g.value ? "default" : "outline"}
                        size="sm"
                        className="flex-1"
                        onClick={() => updateField("gender", g.value)}
                      >
                        {g.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nationality *</Label>
                  <Select value={form.nationality} onValueChange={v => updateField("nationality", v)}>
                    <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Country of Residence *</Label>
                  <Select value={form.country} onValueChange={v => updateField("country", v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={e => updateField("city", e.target.value)}
                  placeholder="e.g. Accra"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={e => updateField("phone", e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp {whatsappSameAsPhone ? "" : "(optional)"}</Label>
                  <div className="space-y-2">
                    <Input
                      type="tel"
                      value={whatsappSameAsPhone ? form.phone : form.whatsapp}
                      onChange={e => updateField("whatsapp", e.target.value)}
                      placeholder="+233 XX XXX XXXX"
                      disabled={whatsappSameAsPhone}
                    />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sameAsPhone"
                        checked={whatsappSameAsPhone}
                        onCheckedChange={(checked) => {
                          setWhatsappSameAsPhone(!!checked);
                          if (checked) updateField("whatsapp", form.phone);
                        }}
                      />
                      <label htmlFor="sameAsPhone" className="text-xs text-muted-foreground">Same as phone</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Address *</Label>
                <Textarea
                  value={form.address}
                  onChange={e => updateField("address", e.target.value)}
                  placeholder="Your current address"
                  maxLength={200}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground text-right">{form.address.length}/200</p>
              </div>

              <Button onClick={saveStep1} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save & Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Professional Background</CardTitle>
                  <CardDescription>Help us understand your experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    value={form.job_title}
                    onChange={e => updateField("job_title", e.target.value)}
                    placeholder="e.g. Legal Counsel"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organisation / Employer *</Label>
                  <Input
                    value={form.organisation}
                    onChange={e => updateField("organisation", e.target.value)}
                    placeholder="e.g. Accra Law Chambers"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Professional Background *</Label>
                <Select value={form.professional_background} onValueChange={v => updateField("professional_background", v)}>
                  <SelectTrigger><SelectValue placeholder="Select background" /></SelectTrigger>
                  <SelectContent>
                    {PROFESSIONAL_BACKGROUNDS.map(bg => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Highest Qualification *</Label>
                  <Select value={form.highest_qualification} onValueChange={v => updateField("highest_qualification", v)}>
                    <SelectTrigger><SelectValue placeholder="Select qualification" /></SelectTrigger>
                    <SelectContent>
                      {QUALIFICATIONS.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Years of Legal / ADR Experience *</Label>
                  <Select value={form.years_experience} onValueChange={v => updateField("years_experience", v)}>
                    <SelectTrigger><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_OPTIONS.map(exp => (
                        <SelectItem key={exp} value={exp}>{exp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>LinkedIn Profile URL (optional)</Label>
                <Input
                  value={form.linkedin_url}
                  onChange={e => updateField("linkedin_url", e.target.value)}
                  placeholder="https://linkedin.com/in/yourname"
                />
              </div>

              <div className="space-y-2">
                <Label>How did you hear about CIMA? *</Label>
                <Select value={form.referral_source} onValueChange={v => updateField("referral_source", v)}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCES.map(src => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={saveStep2} className="flex-1" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Complete My Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

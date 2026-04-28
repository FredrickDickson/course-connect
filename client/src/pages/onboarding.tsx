import { useState, useEffect, useMemo } from "react";

import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, ArrowRight, CheckCircle, User, Briefcase, Loader2, Sparkles, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/contexts/AuthContext";

import { toast } from "sonner";

import { COUNTRIES } from "@/lib/countries";

import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

import { Calendar } from "@/components/ui/calendar";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, FieldLabel } from "@/components/ui/field";
import PhoneInput from "@/components/ui/phone-input";
import type { Country } from "react-phone-number-input";

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

const EXPERIENCE_YEARS_MAP: Record<string, number> = {

  "None": 0,

  "Less than 2 years": 1,

  "2–5 years": 3,

  "5–10 years": 7,

  "10+ years": 12,

};

type ExperienceChoice = "undecided" | "yes" | "no";

type ReviewStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";

interface ProfessionalProfileStatus {

  id: string;

  reviewStatus: ReviewStatus;

  assignedLevel?: string | null;

  submittedAt?: string | null;

}

const REVIEW_STATUS_COPY: Record<Exclude<ReviewStatus, "DRAFT">, { title: string; description: string; variant?: "default" | "destructive" }> = {

  UNDER_REVIEW: {

    title: "Professional profile under review",

    description: "You already have Associate access. Our admissions team typically reviews submissions within 48 hours.",

  },

  APPROVED: {

    title: "Profile approved",

    description: "You’ve been upgraded based on your experience. Head to your dashboard to see newly unlocked courses.",

  },

  REJECTED: {

    title: "Profile reviewed",

    description: "We couldn’t upgrade you this time, but you can continue through the Associate track and build evidence for a future review.",

    variant: "destructive",

  },

  MORE_INFO_REQUIRED: {

    title: "More information requested",

    description: "Please check your email for the reviewer’s note and re-submit the requested details when ready.",

  },

};

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

  const [dateOfBirthOpen, setDateOfBirthOpen] = useState(false);



  const [experienceChoice, setExperienceChoice] = useState<ExperienceChoice>("undecided");
  const [profileStatus, setProfileStatus] = useState<ProfessionalProfileStatus | null>(null);
  const [isExperienceSubmitting, setIsExperienceSubmitting] = useState(false);

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

    referral_code: "",

    profile_completed: false,

  });

  const phoneDefaultCountry = useMemo<Country>(() => {
    const match = COUNTRIES.find((c) => c.name === form.country);
    return ((match?.code || "GH").toUpperCase() as Country);
  }, [form.country]);

  const experienceYearsValue = useMemo(() => {
    if (!form.years_experience) return null;
    return EXPERIENCE_YEARS_MAP[form.years_experience] ?? null;
  }, [form.years_experience]);

  const today = new Date();
  const oldestAllowedDob = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
  const youngestAllowedDob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  const dobDate = form.date_of_birth ? new Date(form.date_of_birth) : undefined;
  const isDobValid = dobDate instanceof Date && !isNaN(dobDate?.getTime() || NaN);

  const nonDraftReviewStatus =

    profileStatus?.reviewStatus && profileStatus.reviewStatus !== "DRAFT"

      ? (profileStatus.reviewStatus as Exclude<ReviewStatus, "DRAFT">)

      : null;

  const experienceChoiceLocked = Boolean(nonDraftReviewStatus);

  const canResetExperience = experienceChoice !== "undecided" && !experienceChoiceLocked;

  const showProfessionalForm = experienceChoice === "yes";

  const reviewStatusCopy = nonDraftReviewStatus ? REVIEW_STATUS_COPY[nonDraftReviewStatus] : null;

  const resetExperienceFlow = () => {

    if (experienceChoiceLocked) return;

    setExperienceChoice("undecided");

    setProfileStatus(null);

  };

  const fetchProfileStatus = async () => {

    try {

      const res = await apiRequest("GET", "/api/qualification/professional-profile");

      const data = await res.json();
      setProfileStatus(data ?? null);

      if (data?.reviewStatus) {

        if (data.reviewStatus !== "DRAFT" || experienceChoice === "undecided") {

          setExperienceChoice("yes");

        }

      }

    } catch (err) {

      console.error("Failed to fetch professional profile", err);

    }

  };

  useEffect(() => {
    if (user?.role === "admin") {
      setLocation("/admin");
    }
  }, [user?.role, setLocation]);

  // Load existing profile data

  useEffect(() => {

    if (!user) return;

    const load = async () => {

      try {

        const { data, error } = await supabase

          .from("profiles")

          .select("*")

          .eq("user_id", user.id)

          .maybeSingle();


        if (error) {

          console.error("Error loading profile:", error);

          setIsLoading(false);

          return;

        }

        const d = data as any;

        if (d) {

          setForm(prev => ({

            ...prev,

            full_name: d.full_name || `${user.firstName} ${user.lastName}`.trim(),

            email: user.email || "",

            date_of_birth: d.date_of_birth || "",

            gender: d.gender || "",

            nationality: d.nationality || "",

            country: d.country || "",

            city: d.city || "",

            phone: d.phone || "",

            whatsapp: d.whatsapp || "",

            address: d.address || "",

            profile_photo_url: d.profile_photo_url || "",

            job_title: d.job_title || "",

            organisation: d.organisation || d.institution || "",

            professional_background: d.professional_background || "",

            highest_qualification: d.highest_qualification || d.education_level || "",

            years_experience: d.years_experience || "",

            linkedin_url: d.linkedin_url || "",

            referral_source: d.referral_source || "",

          }));

          if (d.phone && d.country && !d.profile_completed) {

            setStep(2);

          }

        } else {

          setForm(prev => ({

            ...prev,

            full_name: `${user.firstName} ${user.lastName}`.trim(),

            email: user.email || "",

          }));

        }

      } catch (err) {

        console.error("Unexpected error loading profile:", err);

      } finally {

        setIsLoading(false);

      }

    };

    load();
    fetchProfileStatus();

  }, [user]);



  const updateField = (field: string, value: string) => {

    setForm(prev => ({ ...prev, [field]: value }));

    

    // Handle phone number updates - sync with WhatsApp if sameAsPhone is checked

    if (field === "phone" && whatsappSameAsPhone) {

      setForm(prev => ({ 

        ...prev, 

        phone: value,

        whatsapp: value 

      }));

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



  const handleExperienceSelection = async (choice: ExperienceChoice) => {

    if (!user || isExperienceSubmitting) return;

    if (choice === experienceChoice && (choice !== "no" || experienceChoiceLocked)) {

      return;

    }

    const previousChoice = experienceChoice;

    setExperienceChoice(choice);

    setIsExperienceSubmitting(true);

    try {

      await apiRequest("POST", "/api/qualification/onboarding/experience", {

        hasExperience: choice === "yes",

      });



      if (choice === "no") {

        await supabase.from("profiles").update({ profile_completed: true }).eq("user_id", user.id);

        await supabase.from("activity_log").insert({

          user_id: user.id,

          event_type: "onboarding_completed",

          description: "Completed onboarding without prior ADR experience",

          metadata: { level: "associate", source: "experience_gate" },

        });

        toast.success("You're all set with Associate access! Redirecting you to the dashboard.");

        const redirect = sessionStorage.getItem("redirectAfterLogin");

        sessionStorage.removeItem("redirectAfterLogin");

        setLocation(redirect || "/dashboard");

        return;

      }



      if (choice === "yes") {

        toast.success("Great! Share a few professional details so we can review your profile.");

        await fetchProfileStatus();

      }

    } catch (err) {

      console.error("Failed to handle experience choice", err);

      setExperienceChoice(previousChoice);

      toast.error(err instanceof Error ? err.message : "We couldn't save your choice. Please try again.");

    } finally {

      setIsExperienceSubmitting(false);

    }

  };



  const saveStep2 = async () => {

    if (!user) return;

    if (experienceChoice !== "yes") {

      toast.error("Please confirm that you have ADR / legal experience first.");

      return;

    }

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

        profile_completed: true,

      }, { onConflict: "user_id" });



      if (error) throw error;



      const profileResponse = await apiRequest("POST", "/api/qualification/professional-profile", {

        submit: true,

        contactEmail: form.email,

        contactPhone: form.phone,

        country: form.country,

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

        linkedinUrl: form.linkedin_url || undefined,

        organization: form.organisation,

        jobTitle: form.job_title,

        yearsAdrExperience: experienceYearsValue,

        yearsLegalExperience: experienceYearsValue,

        qualifications: form.highest_qualification ? [form.highest_qualification] : undefined,

        submittedPayload: {

          ...form,

          years_experience_value: experienceYearsValue,

        },

      });

      const professionalProfile = await profileResponse.json();

      setProfileStatus(professionalProfile);

      await supabase.from("activity_log").insert({

        user_id: user.id,

        event_type: "professional_profile_submitted",

        description: "Submitted professional profile for expedited review",

        metadata: {

          reviewStatus: professionalProfile?.reviewStatus ?? "UNKNOWN",

        },

      });

      toast.success("Profile submitted! You'll keep Associate access while we review your experience.");

      await fetchProfileStatus();

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

    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 py-6 px-3 sm:py-8 sm:px-4">

      <div className="max-w-2xl mx-auto">

        {/* Progress Bar */}

        <div className="mb-8">

          <div className="flex items-center justify-between mb-3">

            <span className="text-sm font-medium text-muted-foreground">Step {step} of 2</span>

            <span className="text-sm text-muted-foreground">{step === 1 ? "Personal" : "Professional"}</span>

          </div>

          <div className="flex gap-2">

            <div className={`h-2 flex-1 rounded-full transition-all duration-300 ease-out ${step >= 1 ? "bg-primary" : "bg-muted"}`} />

            <div className={`h-2 flex-1 rounded-full transition-all duration-300 ease-out ${step >= 2 ? "bg-primary" : "bg-muted"}`} />

          </div>

        </div>



        {step === 1 && (

          <Card className="transition-shadow duration-200 hover:shadow-lg">

            <CardHeader>

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-105">

                  <User className="w-5 h-5 text-primary" aria-hidden="true" />

                </div>

                <div>

                  <CardTitle>Personal Information</CardTitle>

                  <CardDescription>Tell us about yourself</CardDescription>

                </div>

              </div>

            </CardHeader>

            <CardContent className="space-y-5">

              {/* Pre-filled read-only fields */}

              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg transition-colors duration-200 hover:bg-muted">

                <Avatar className="w-14 h-14">

                  <AvatarImage src={form.profile_photo_url} alt={form.full_name} />

                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>

                </Avatar>

                <div className="flex-1 min-w-0">

                  <p className="font-medium text-foreground truncate">{form.full_name}</p>

                  <p className="text-sm text-muted-foreground truncate">{form.email}</p>

                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <Field className="w-full">

                  <FieldLabel htmlFor="date-of-birth" className="text-sm font-medium">Date of Birth *</FieldLabel>

                  <Popover open={dateOfBirthOpen} onOpenChange={setDateOfBirthOpen}>

                    <PopoverTrigger asChild>

                      <Button

                        id="date-of-birth"

                        variant="outline"

                        data-empty={!isDobValid}

                        className={cn(

                          "w-full justify-start text-left font-normal",

                          "data-[empty=true]:text-muted-foreground"

                        )}

                      >

                        {isDobValid && dobDate ? dobDate.toLocaleDateString() : "Select date"}

                      </Button>

                    </PopoverTrigger>

                    <PopoverContent className="w-[calc(100vw-2rem)] sm:w-auto max-w-sm overflow-hidden p-0" align="start">

                      <Calendar

                        mode="single"

                        captionLayout="dropdown"

                        selected={isDobValid ? dobDate : undefined}

                        defaultMonth={isDobValid && dobDate ? dobDate : youngestAllowedDob}

                        onSelect={(date) => {

                          if (date) {

                            updateField("date_of_birth", date.toISOString().split("T")[0]);

                            setDateOfBirthOpen(false);

                          }

                        }}

                        disabled={(date) => date < oldestAllowedDob || date > youngestAllowedDob}

                        initialFocus

                      />

                    </PopoverContent>

                  </Popover>

                </Field>

                <div className="space-y-2">

                  <Label htmlFor="gender-select" className="text-sm font-medium">Gender *</Label>

                  <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="gender-select">

                    {GENDERS.map(g => (

                      <Button

                        key={g.value}

                        type="button"

                        className={cn(

                          "w-full min-h-[44px] whitespace-normal text-xs sm:text-sm px-2 transition-all duration-200 cursor-pointer",

                          form.gender === g.value

                            ? "bg-primary text-primary-foreground shadow-sm"

                            : "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"

                        )}

                        onClick={() => updateField("gender", g.value)}

                        aria-pressed={form.gender === g.value}

                      >

                        {g.label}

                      </Button>

                    ))}

                  </div>

                </div>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">

                  <Label htmlFor="nationality" className="text-sm font-medium">Nationality *</Label>

                  <Select value={form.nationality} onValueChange={(v: string) => updateField("nationality", v)}>

                    <SelectTrigger id="nationality" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select nationality" /></SelectTrigger>

                    <SelectContent className="max-h-80">

                      {COUNTRIES.map(c => (

                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                </div>

                <div className="space-y-2">

                  <Label htmlFor="country" className="text-sm font-medium">Country of Residence *</Label>

                  <Select value={form.country} onValueChange={(v: string) => updateField("country", v)}>

                    <SelectTrigger id="country" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select country" /></SelectTrigger>

                    <SelectContent className="max-h-80">

                      {COUNTRIES.map(c => (

                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>

                      ))}

                    </SelectContent>

                  </Select>

                </div>

              </div>



              <div className="space-y-2">

                <Label htmlFor="city" className="text-sm font-medium">City *</Label>

                <Input

                  id="city"

                  value={form.city}

                  onChange={e => updateField("city", e.target.value)}

                  placeholder="e.g. Accra"

                  className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                />

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="space-y-2">

                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>

                  <PhoneInput

                    id="phone"

                    defaultCountry={phoneDefaultCountry}

                    value={form.phone}

                    onChange={(value) => updateField("phone", value || "")}

                    placeholder="Enter phone number"

                    className="min-h-[44px]"

                  />

                  <p className="text-xs text-muted-foreground">We’ll use this number for SMS updates about your application.</p>

                </div>

                <div className="space-y-2">

                  <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp {whatsappSameAsPhone ? "" : "(optional)"}</Label>

                  <div className="space-y-2">

                    <PhoneInput

                      id="whatsapp"

                      defaultCountry={phoneDefaultCountry}

                      value={whatsappSameAsPhone ? form.phone : form.whatsapp}

                      onChange={(value) => {

                        if (whatsappSameAsPhone) return;

                        updateField("whatsapp", value || "");

                      }}

                      placeholder="WhatsApp number"

                      disabled={whatsappSameAsPhone}

                      className="min-h-[44px]"

                    />

                    <div className="flex items-center gap-2">

                      <Checkbox

                        id="sameAsPhone"

                        checked={whatsappSameAsPhone}

                        onCheckedChange={(checked: boolean) => {

                          setWhatsappSameAsPhone(!!checked);

                          if (checked) {

                            setForm(prev => ({ 

                              ...prev, 

                              whatsapp: prev.phone 

                            }));

                          }

                        }}

                        className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                      />

                      <label htmlFor="sameAsPhone" className="text-xs text-muted-foreground cursor-pointer select-none">Same as phone</label>

                    </div>

                    <p className="text-xs text-muted-foreground">We’ll send community invites and reminders via WhatsApp.</p>

                  </div>

                </div>

              </div>



              <div className="space-y-2">

                <Label htmlFor="address" className="text-sm font-medium">Current Address *</Label>

                <Textarea

                  id="address"

                  value={form.address}

                  onChange={e => updateField("address", e.target.value)}

                  placeholder="Your current address"

                  maxLength={200}

                  rows={2}

                  className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"

                />

                <p className="text-xs text-muted-foreground text-right" aria-live="polite">{form.address.length}/200</p>

              </div>



              <Button 

                onClick={saveStep1} 

                className="w-full min-h-[44px] transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 

                disabled={isSaving}

                aria-label="Save personal information and continue to next step"

              >

                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : null}

                Save & Continue

                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />

              </Button>

            </CardContent>

          </Card>

        )}



        {step === 2 && (

          <div className="space-y-6">

            <Card className="transition-shadow duration-200 hover:shadow-lg">

              <CardHeader>

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-105">

                    <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />

                  </div>

                  <div>

                    <CardTitle>Do you already have ADR / legal experience?</CardTitle>

                    <CardDescription>Answer to unlock the right onboarding path.</CardDescription>

                  </div>

                </div>

              </CardHeader>

              <CardContent className="space-y-4">

                <p className="text-sm text-muted-foreground">Selecting <strong>Yes</strong> lets you submit a professional profile for expedited review. Choosing <strong>No</strong> grants instant Associate access so you can start learning right away.</p>

                <div className="grid gap-3 sm:grid-cols-2">

                  <Button

                    type="button"

                    variant="outline"

                    className={cn(

                      "h-auto min-h-[88px] py-4 px-4 justify-start text-left flex-col items-start gap-1 border-dashed whitespace-normal",

                      experienceChoice === "no" ? "border-destructive bg-destructive/10 text-destructive" : "border-muted-foreground/40"

                    )}

                    onClick={() => handleExperienceSelection("no")}

                    disabled={isExperienceSubmitting || experienceChoiceLocked}

                  >

                    <div className="flex items-center gap-2 text-sm font-medium">

                      {isExperienceSubmitting && experienceChoice === "no" ? (

                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />

                      ) : (

                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />

                      )}

                      <span>No, I'm getting started</span>

                    </div>

                    <p className="text-xs text-muted-foreground break-words whitespace-normal">We'll grant Associate-level content immediately so you can explore the core pathway.</p>

                  </Button>

                  <Button

                    type="button"

                    className="h-auto min-h-[88px] py-4 px-4 justify-start text-left flex-col items-start gap-1 whitespace-normal"

                    onClick={() => handleExperienceSelection("yes")}

                    disabled={isExperienceSubmitting}

                  >

                    <div className="flex items-center gap-2 text-sm font-medium">

                      {isExperienceSubmitting && experienceChoice === "yes" ? (

                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />

                      ) : (

                        <Sparkles className="h-4 w-4" aria-hidden="true" />

                      )}

                      <span>Yes, I have ADR / legal experience</span>

                    </div>

                    <p className="text-xs text-primary break-words whitespace-normal">Submit a quick professional profile. You'll keep Associate access while we review.</p>

                  </Button>

                </div>

                {experienceChoiceLocked && reviewStatusCopy && (

                  <p className="text-xs text-muted-foreground">

                    Your answer is locked while your profile is {reviewStatusCopy.title.toLowerCase()}.

                  </p>

                )}

                {canResetExperience && (

                  <Button

                    type="button"

                    variant="ghost"

                    size="sm"

                    className="px-0 text-muted-foreground"

                    onClick={resetExperienceFlow}

                  >

                    Change my answer

                  </Button>

                )}

              </CardContent>

            </Card>

            {showProfessionalForm && (

              <Card className="transition-shadow duration-200 hover:shadow-lg">

                <CardHeader>

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-200 hover:scale-105">

                      <Briefcase className="w-5 h-5 text-primary" aria-hidden="true" />

                    </div>

                    <div>

                      <CardTitle>Professional Background</CardTitle>

                      <CardDescription>Help us understand your experience</CardDescription>

                    </div>

                  </div>

                </CardHeader>

                <CardContent className="space-y-5">

                  {reviewStatusCopy ? (

                    <Alert variant={reviewStatusCopy.variant ?? "default"}>

                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />

                      <AlertTitle>{reviewStatusCopy.title}</AlertTitle>

                      <AlertDescription>{reviewStatusCopy.description}</AlertDescription>

                    </Alert>

                  ) : (

                    <Alert className="border border-dashed">

                      <Sparkles className="h-4 w-4" aria-hidden="true" />

                      <AlertTitle>Associate access unlocked instantly</AlertTitle>

                      <AlertDescription>Submit these details so our admissions team can review you for Mentor or Fellow access while you keep progressing.</AlertDescription>

                    </Alert>

                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-2">

                      <Label htmlFor="job-title" className="text-sm font-medium">Job Title *</Label>

                      <Input

                        id="job-title"

                        value={form.job_title}

                        onChange={e => updateField("job_title", e.target.value)}

                        placeholder="e.g. Legal Counsel"

                        className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                      />

                    </div>

                    <div className="space-y-2">

                      <Label htmlFor="organisation" className="text-sm font-medium">Organisation / Employer *</Label>

                      <Input

                        id="organisation"

                        value={form.organisation}

                        onChange={e => updateField("organisation", e.target.value)}

                        placeholder="e.g. Accra Law Chambers"

                        className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                      />

                    </div>

                  </div>



                  <div className="space-y-2">

                    <Label htmlFor="professional-background" className="text-sm font-medium">Professional Background *</Label>

                    <Select value={form.professional_background} onValueChange={(v: string) => updateField("professional_background", v)}>

                      <SelectTrigger id="professional-background" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select background" /></SelectTrigger>

                      <SelectContent className="max-h-60">

                        {PROFESSIONAL_BACKGROUNDS.map(bg => (

                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>

                        ))}

                      </SelectContent>

                    </Select>

                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-2">

                      <Label htmlFor="qualification" className="text-sm font-medium">Highest Qualification *</Label>

                      <Select value={form.highest_qualification} onValueChange={(v: string) => updateField("highest_qualification", v)}>

                        <SelectTrigger id="qualification" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select qualification" /></SelectTrigger>

                        <SelectContent className="max-h-60">

                          {QUALIFICATIONS.map(q => (

                            <SelectItem key={q} value={q}>{q}</SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>

                    <div className="space-y-2">

                      <Label htmlFor="experience" className="text-sm font-medium">Years of Legal / ADR Experience *</Label>

                      <Select value={form.years_experience} onValueChange={(v: string) => updateField("years_experience", v)}>

                        <SelectTrigger id="experience" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select experience" /></SelectTrigger>

                        <SelectContent className="max-h-60">

                          {EXPERIENCE_OPTIONS.map(exp => (

                            <SelectItem key={exp} value={exp}>{exp}</SelectItem>

                          ))}

                        </SelectContent>

                      </Select>

                    </div>

                  </div>



                  <div className="space-y-2">

                    <Label htmlFor="linkedin" className="text-sm font-medium">LinkedIn Profile URL (optional)</Label>

                    <Input

                      id="linkedin"

                      value={form.linkedin_url}

                      onChange={e => updateField("linkedin_url", e.target.value)}

                      placeholder="https://linkedin.com/in/yourname"

                      className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

                    />

                  </div>



                  <div className="space-y-2">

                    <Label htmlFor="referral" className="text-sm font-medium">How did you hear about CIMA? *</Label>

                    <Select value={form.referral_source} onValueChange={(v: string) => updateField("referral_source", v)}>

                      <SelectTrigger id="referral" className="transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><SelectValue placeholder="Select source" /></SelectTrigger>

                      <SelectContent className="max-h-60">

                        {REFERRAL_SOURCES.map(src => (

                          <SelectItem key={src} value={src}>{src}</SelectItem>

                        ))}

                      </SelectContent>

                    </Select>

                  </div>



                  <div className="flex flex-col-reverse sm:flex-row gap-3">

                    <Button 

                      className="flex-1 min-h-[44px] border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 

                      onClick={() => setStep(1)}

                      aria-label="Go back to personal information step"

                    >

                      <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />

                      Back

                    </Button>

                    <Button 

                      onClick={saveStep2} 

                      className="flex-1 min-h-[44px] transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 

                      disabled={isSaving}

                      aria-label="Submit professional profile for review"

                    >

                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" /> : <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />}

                      Submit for review

                    </Button>

                  </div>

                </CardContent>

              </Card>

            )}

          </div>

        )}

      </div>

    </div>

  );

}


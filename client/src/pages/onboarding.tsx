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
    phoneCountryCode: "",
    whatsappCountryCode: "",
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
    bio_data_completed: false,
  });

  // Country codes with dialing codes
  const COUNTRY_CODES = [
    { code: "+1", name: "United States", dialingCode: "+1" },
    { code: "+44", name: "United Kingdom", dialingCode: "+44" },
    { code: "+233", name: "Ghana", dialingCode: "+233" },
    { code: "+234", name: "Nigeria", dialingCode: "+234" },
    { code: "+254", name: "Kenya", dialingCode: "+254" },
    { code: "+256", name: "Uganda", dialingCode: "+256" },
    { code: "+255", name: "Tanzania", dialingCode: "+255" },
    { code: "+27", name: "South Africa", dialingCode: "+27" },
    { code: "+91", name: "India", dialingCode: "+91" },
    { code: "+86", name: "China", dialingCode: "+86" },
    { code: "+81", name: "Japan", dialingCode: "+81" },
    { code: "+82", name: "South Korea", dialingCode: "+82" },
    { code: "+33", name: "France", dialingCode: "+33" },
    { code: "+49", name: "Germany", dialingCode: "+49" },
    { code: "+39", name: "Italy", dialingCode: "+39" },
    { code: "+34", name: "Spain", dialingCode: "+34" },
    { code: "+31", name: "Netherlands", dialingCode: "+31" },
    { code: "+46", name: "Sweden", dialingCode: "+46" },
    { code: "+47", name: "Norway", dialingCode: "+47" },
    { code: "+358", name: "Finland", dialingCode: "+358" },
    { code: "+61", name: "Australia", dialingCode: "+61" },
    { code: "+64", name: "New Zealand", dialingCode: "+64" },
    { code: "+1", name: "Canada", dialingCode: "+1" },
    { code: "+52", name: "Mexico", dialingCode: "+52" },
    { code: "+55", name: "Brazil", dialingCode: "+55" },
    { code: "+54", name: "Argentina", dialingCode: "+54" },
    { code: "+56", name: "Chile", dialingCode: "+56" },
    { code: "+57", name: "Colombia", dialingCode: "+57" },
    { code: "+58", name: "Venezuela", dialingCode: "+58" },
    { code: "+507", name: "Panama", dialingCode: "+507" },
    { code: "+506", name: "Costa Rica", dialingCode: "+506" },
    { code: "+503", name: "El Salvador", dialingCode: "+503" },
    { code: "+502", name: "Guatemala", dialingCode: "+502" },
    { code: "+504", name: "Honduras", dialingCode: "+504" },
    { code: "+505", name: "Nicaragua", dialingCode: "+505" },
    { code: "+51", name: "Peru", dialingCode: "+51" },
    { code: "+591", name: "Bolivia", dialingCode: "+591" },
    { code: "+595", name: "Paraguay", dialingCode: "+595" },
    { code: "+598", name: "Uruguay", dialingCode: "+598" },
    { code: "+20", name: "Egypt", dialingCode: "+20" },
    { code: "+212", name: "Morocco", dialingCode: "+212" },
    { code: "+213", name: "Algeria", dialingCode: "+213" },
    { code: "+216", name: "Tunisia", dialingCode: "+216" },
    { code: "+218", name: "Libya", dialingCode: "+218" },
    { code: "+962", name: "Jordan", dialingCode: "+962" },
    { code: "+964", name: "Iraq", dialingCode: "+964" },
    { code: "+966", name: "Saudi Arabia", dialingCode: "+966" },
    { code: "+971", name: "United Arab Emirates", dialingCode: "+971" },
    { code: "+968", name: "Oman", dialingCode: "+968" },
    { code: "+973", name: "Bahrain", dialingCode: "+973" },
    { code: "+974", name: "Qatar", dialingCode: "+974" },
    { code: "+965", name: "Kuwait", dialingCode: "+965" },
    { code: "+970", name: "Palestine", dialingCode: "+970" },
    { code: "+961", name: "Lebanon", dialingCode: "+961" },
    { code: "+90", name: "Turkey", dialingCode: "+90" },
    { code: "+92", name: "Pakistan", dialingCode: "+92" },
    { code: "+93", name: "Afghanistan", dialingCode: "+93" },
    { code: "+94", name: "Sri Lanka", dialingCode: "+94" },
    { code: "+880", name: "Bangladesh", dialingCode: "+880" },
    { code: "+95", name: "Myanmar", dialingCode: "+95" },
    { code: "+84", name: "Vietnam", dialingCode: "+84" },
    { code: "+62", name: "Indonesia", dialingCode: "+62" },
    { code: "+63", name: "Philippines", dialingCode: "+63" },
    { code: "+60", name: "Malaysia", dialingCode: "+60" },
    { code: "+65", name: "Singapore", dialingCode: "+65" },
    { code: "+66", name: "Thailand", dialingCode: "+66" },
    { code: "+673", name: "Brunei", dialingCode: "+673" },
    { code: "+670", name: "East Timor", dialingCode: "+670" },
    { code: "+672", name: "Australian External Territories", dialingCode: "+672" },
    { code: "+674", name: "Nauru", dialingCode: "+674" },
    { code: "+675", name: "Papua New Guinea", dialingCode: "+675" },
    { code: "+676", name: "Tonga", dialingCode: "+676" },
    { code: "+677", name: "Solomon Islands", dialingCode: "+677" },
    { code: "+678", name: "Vanuatu", dialingCode: "+678" },
    { code: "+679", name: "Fiji", dialingCode: "+679" },
    { code: "+680", name: "Palau", dialingCode: "+680" },
    { code: "+681", name: "Wallis and Futuna", dialingCode: "+681" },
    { code: "+682", name: "Cook Islands", dialingCode: "+682" },
    { code: "+683", name: "Niue", dialingCode: "+683" },
    { code: "+684", name: "American Samoa", dialingCode: "+684" },
    { code: "+685", name: "Samoa", dialingCode: "+685" },
    { code: "+686", name: "Kiribati", dialingCode: "+686" },
    { code: "+687", name: "New Caledonia", dialingCode: "+687" },
    { code: "+688", name: "Tuvalu", dialingCode: "+688" },
    { code: "+689", name: "French Polynesia", dialingCode: "+689" },
    { code: "+690", name: "Tokelau", dialingCode: "+690" },
    { code: "+691", name: "Micronesia", dialingCode: "+691" },
    { code: "+692", name: "Marshall Islands", dialingCode: "+692" },
    { code: "+850", name: "North Korea", dialingCode: "+850" },
    { code: "+852", name: "Hong Kong", dialingCode: "+852" },
    { code: "+853", name: "Macau", dialingCode: "+853" },
    { code: "+855", name: "Cambodia", dialingCode: "+855" },
    { code: "+856", name: "Laos", dialingCode: "+856" },
    { code: "+857", name: "Mongolia", dialingCode: "+857" },
    { code: "+858", name: "Mongolia (mobile)", dialingCode: "+858" },
    { code: "+870", name: "Inmarsat", dialingCode: "+870" },
    { code: "+872", name: "Inmarsat", dialingCode: "+872" },
    { code: "+873", name: "Inmarsat", dialingCode: "+873" },
    { code: "+874", name: "Inmarsat", dialingCode: "+874" },
    { code: "+875", name: "Inmarsat", dialingCode: "+875" },
    { code: "+876", name: "Inmarsat", dialingCode: "+876" },
    { code: "+877", name: "Inmarsat", dialingCode: "+877" },
    { code: "+878", name: "Universal Personal Telecommunications", dialingCode: "+878" },
    { code: "+879", name: "Universal Personal Telecommunications", dialingCode: "+879" },
    { code: "+880", name: "Bangladesh", dialingCode: "+880" },
    { code: "+881", name: "Global Mobile Satellite System", dialingCode: "+881" },
    { code: "+882", name: "International Networks", dialingCode: "+882" },
    { code: "+883", name: "International Networks", dialingCode: "+883" },
    { code: "+884", name: "International Networks", dialingCode: "+884" },
    { code: "+885", name: "International Networks", dialingCode: "+885" },
    { code: "+886", name: "Taiwan", dialingCode: "+886" },
    { code: "+888", name: "International Networks", dialingCode: "+888" },
    { code: "+889", name: "International Networks", dialingCode: "+889" },
    { code: "+960", name: "Maldives", dialingCode: "+960" },
    { code: "+961", name: "Lebanon", dialingCode: "+961" },
    { code: "+962", name: "Jordan", dialingCode: "+962" },
    { code: "+963", name: "Syria", dialingCode: "+963" },
    { code: "+964", name: "Iraq", dialingCode: "+964" },
    { code: "+965", name: "Kuwait", dialingCode: "+965" },
    { code: "+966", name: "Saudi Arabia", dialingCode: "+966" },
    { code: "+967", name: "Yemen", dialingCode: "+967" },
    { code: "+968", name: "Oman", dialingCode: "+968" },
    { code: "+970", name: "Palestine", dialingCode: "+970" },
    { code: "+971", name: "United Arab Emirates", dialingCode: "+971" },
    { code: "+972", name: "Israel", dialingCode: "+972" },
    { code: "+973", name: "Bahrain", dialingCode: "+973" },
    { code: "+974", name: "Qatar", dialingCode: "+974" },
    { code: "+975", name: "Bhutan", dialingCode: "+975" },
    { code: "+976", name: "Mongolia", dialingCode: "+976" },
    { code: "+977", name: "Nepal", dialingCode: "+977" },
    { code: "+979", name: "International Premium Rate", dialingCode: "+979" },
    { code: "+992", name: "Tajikistan", dialingCode: "+992" },
    { code: "+993", name: "Turkmenistan", dialingCode: "+993" },
    { code: "+994", name: "Azerbaijan", dialingCode: "+994" },
    { code: "+995", name: "Georgia", dialingCode: "+995" },
    { code: "+996", name: "Kyrgyzstan", dialingCode: "+996" },
    { code: "+998", name: "Uzbekistan", dialingCode: "+998" },
  ];

  // Get country code for phone number
  const getCountryCode = (countryName: string) => {
    const country = COUNTRY_CODES.find(c => c.name === countryName);
    return country?.dialingCode || "";
  };

  // Load existing profile data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

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
        if (d.phone && d.country && !d.bio_data_completed) {
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
    
    // Handle phone number updates
    if (field === "phone") {
      const fullPhoneNumber = form.phoneCountryCode ? `${form.phoneCountryCode} ${value}` : value;
      setForm(prev => ({ 
        ...prev, 
        phone: fullPhoneNumber,
        whatsapp: whatsappSameAsPhone ? fullPhoneNumber : prev.whatsapp 
      }));
    }
    
    // Handle country code changes
    if (field === "phoneCountryCode") {
      const phoneNumberOnly = form.phone.replace(form.phoneCountryCode + " ", "") || "";
      const fullPhoneNumber = value ? `${value} ${phoneNumberOnly}` : phoneNumberOnly;
      setForm(prev => ({ 
        ...prev, 
        phone: fullPhoneNumber,
        whatsapp: whatsappSameAsPhone ? fullPhoneNumber : prev.whatsapp 
      }));
    }
    
    // Handle WhatsApp updates
    if (field === "whatsapp" && !whatsappSameAsPhone) {
      setForm(prev => ({ 
        ...prev, 
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
      const { error } = await (supabase as any).from("profiles").upsert({
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
      const { error } = await (supabase as any).from("profiles").upsert({
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
      await (supabase as any).from("activity_log").insert({
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
                  <div className="flex gap-2">
                    <Select value={form.phoneCountryCode} onValueChange={v => updateField("phoneCountryCode", v)}>
                      <SelectTrigger className="w-24">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {COUNTRY_CODES.map(c => (
                          <SelectItem key={c.code} value={c.dialingCode}>
                            {c.dialingCode} ({c.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={e => updateField("phone", e.target.value)}
                      placeholder="XXX XXX XXXX"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp {whatsappSameAsPhone ? "" : "(optional)"}</Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Select 
                        value={form.whatsappCountryCode || form.phoneCountryCode} 
                        onValueChange={v => updateField("whatsappCountryCode", v)}
                        disabled={whatsappSameAsPhone}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Code" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {COUNTRY_CODES.map(c => (
                            <SelectItem key={c.code} value={c.dialingCode}>
                              {c.dialingCode} ({c.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="tel"
                        value={whatsappSameAsPhone ? 
                          form.phone.replace(form.phoneCountryCode + " ", "") || form.phone :
                          form.whatsapp.replace(form.whatsappCountryCode + " ", "") || form.whatsapp
                        }
                        onChange={e => updateField("whatsapp", e.target.value)}
                        placeholder="XXX XXX XXXX"
                        className="flex-1"
                        disabled={whatsappSameAsPhone}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sameAsPhone"
                        checked={whatsappSameAsPhone}
                        onCheckedChange={(checked) => {
                          setWhatsappSameAsPhone(!!checked);
                          if (checked) {
                            setForm(prev => ({ 
                              ...prev, 
                              whatsappCountryCode: prev.phoneCountryCode,
                              whatsapp: prev.phone 
                            }));
                          }
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

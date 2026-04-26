import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { EligibilityResponse } from "@shared/enrollmentEligibility";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Shield,
  Lock,
  Copy,
  Calendar,
  User,
  Briefcase,
  BookOpen,
  CreditCard,
  Download,
  LayoutDashboard,
} from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface EnrollmentFormProps {
  course: any;
  ticketSelections: Record<string, number>;
  ticketTypes: { name: string; price_ghs: number }[];
  onClose: () => void;
}

const PROGRAMMES = [
  "Part I — Law, Practice and Procedure in Domestic and International Arbitration",
  "Part II — Advanced Law, Practice and Procedure in Domestic and International Arbitration",
  "Part III — Arbitration Advocacy, Drafting, Evidence & Award Writing",
  "Expedited Route to Membership in International Arbitration (Oxfordshire)",
  "Expedited Route to Fellowship in International Arbitration (Oxfordshire)",
];

const INDUSTRIES = [
  "Legal",
  "Business / Corporate",
  "Public Sector / Government",
  "Academic / Education",
  "Financial Services",
  "Construction / Real Estate",
  "Energy / Oil & Gas",
  "Maritime / Shipping",
  "Technology",
  "Healthcare",
  "Other",
];

const ROLE_CATEGORIES = [
  "Legal Practitioner",
  "Business Professional",
  "Public Sector Official",
  "Academic / Researcher",
  "Arbitrator / Mediator",
  "Student",
  "Other",
];

const EDUCATION_LEVELS = [
  "High School / Secondary",
  "Diploma / Certificate",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate / PhD",
  "Professional Qualification",
];

const EXPERIENCE_LEVELS = [
  "0-2 years",
  "3-5 years",
  "6-10 years",
  "11-15 years",
  "16-20 years",
  "20+ years",
];

const ADR_EXPERIENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "associate", label: "Part I (Associate) — Studied ADR or attended short courses" },
  { value: "member", label: "Part II (Member) — Participated in or observed proceedings" },
  { value: "fellow", label: "Part III (Fellow) — Served as arbitrator/mediator or counsel" },
];

const STORAGE_KEY = "cima-enrollment-form-v2";

export default function EnrollmentForm({
  course,
  ticketSelections,
  ticketTypes,
  onClose,
}: EnrollmentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // Step 0 = Quick Start, Steps 1-4 = main form, Step 5 = success
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResponse | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const paystackLoaded = useRef(false);

  // Determine selected ticket
  const selectedTicket = Object.entries(ticketSelections).find(([, qty]) => qty > 0);
  const ticketName = selectedTicket?.[0] || "Associate";
  const ticketQty = selectedTicket?.[1] || 1;
  const ticketInfo = ticketTypes.find((t) => t.name === ticketName) || { name: ticketName, price_ghs: 5500 };
  const totalPrice = ticketInfo.price_ghs * ticketQty;

  // Determine course level for conditional fields
  const isFellowLevel = ticketName.toLowerCase().includes("fellow");

  // Form state
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      // Step 0: Quick Start
      email: parsed.email || user?.email || "",
      fullName: parsed.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      // Step 1: Identity (remaining)
      phone: parsed.phone || "",
      country: parsed.country || "Ghana",
      whatsapp: parsed.whatsapp || "",
      sameAsPhone: parsed.sameAsPhone ?? true,
      // Step 2: Professional Profile
      institution: parsed.institution || "",
      jobTitle: parsed.jobTitle || "",
      yearsExperience: parsed.yearsExperience || "",
      industry: parsed.industry || "",
      roleCategory: parsed.roleCategory || "",
      educationLevel: parsed.educationLevel || "",
      adrExperience: parsed.adrExperience || "none",
      address: parsed.address || "",
      // Step 3: Course-Specific
      personalStatement: parsed.personalStatement || "",
      programme: parsed.programme || "",
      // Step 4: Review & Pay
      paymentMethod: parsed.paymentMethod || "paystack",
      confirmAccurate: false,
      agreeTerms: false,
      consentContact: false,
      understandPayment: false,
    };
  });

  // If user is already logged in and has name+email, skip Step 0
  useEffect(() => {
    if (step === 0 && user?.email && formData.fullName.trim()) {
      setFormData((prev) => ({
        ...prev,
        email: prev.email || user.email || "",
        fullName: prev.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      }));
      // Auto-advance past Quick Start for logged-in users with name
      setStep(1);
    }
  }, [user, step]);

  // Load existing profile from DB
  useEffect(() => {
    if (!user?.id || profileLoaded) return;
    const loadProfile = async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFormData((prev: any) => ({
          ...prev,
          fullName: data.full_name || prev.fullName,
          phone: data.phone || prev.phone,
          whatsapp: data.whatsapp || prev.whatsapp,
          country: data.country || prev.country,
          address: data.address || prev.address,
          institution: data.institution || prev.institution,
          jobTitle: data.job_title || prev.jobTitle,
          yearsExperience: data.years_experience || prev.yearsExperience,
          industry: data.industry || prev.industry,
          roleCategory: data.role_category || prev.roleCategory,
          educationLevel: data.education_level || prev.educationLevel,
          adrExperience: data.adr_experience || prev.adrExperience,
        }));
      }
      setProfileLoaded(true);
    };
    loadProfile();
  }, [user?.id, profileLoaded]);

  // Auto-save to localStorage
  useEffect(() => {
    const { confirmAccurate, agreeTerms, consentContact, understandPayment, ...saveable } = formData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveable));
  }, [formData]);

  // Sync whatsapp with phone
  useEffect(() => {
    if (formData.sameAsPhone) {
      setFormData((prev) => ({ ...prev, whatsapp: prev.phone }));
    }
  }, [formData.phone, formData.sameAsPhone]);

  // Load Paystack
  useEffect(() => {
    if (!paystackLoaded.current) {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      document.body.appendChild(s);
      paystackLoaded.current = true;
    }
  }, []);

  // Auto-detect programme from course title
  useEffect(() => {
    if (!formData.programme && course?.title) {
      const title = course.title.toLowerCase();
      if (title.includes("part i") && !title.includes("part ii")) {
        setFormData((p) => ({ ...p, programme: PROGRAMMES[0] }));
      } else if (title.includes("part ii") && !title.includes("part iii")) {
        setFormData((p) => ({ ...p, programme: PROGRAMMES[1] }));
      } else if (title.includes("part iii")) {
        setFormData((p) => ({ ...p, programme: PROGRAMMES[2] }));
      } else if (title.includes("fellowship")) {
        setFormData((p) => ({ ...p, programme: PROGRAMMES[4] }));
      } else if (title.includes("membership")) {
        setFormData((p) => ({ ...p, programme: PROGRAMMES[3] }));
      }
    }
  }, [course?.title, formData.programme]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Valid email required";
    if (!formData.fullName.trim()) e.fullName = "Full name required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!formData.country) e.country = "Country required";
    if (!formData.phone.trim()) e.phone = "Phone required";
    if (!formData.whatsapp.trim()) e.whatsapp = "WhatsApp required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!formData.institution.trim()) e.institution = "Institution required";
    if (!formData.industry) e.industry = "Select your industry";
    if (!formData.roleCategory) e.roleCategory = "Select your role category";
    if (!formData.educationLevel) e.educationLevel = "Select your education level";
    if (isFellowLevel && formData.yearsExperience) {
      const years = parseInt(formData.yearsExperience);
      if (!isNaN(years) && years < 7) {
        e.yearsExperience = "Fellow candidates typically require 7+ years of experience";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!formData.personalStatement || formData.personalStatement.length < 50)
      e.personalStatement = "Minimum 50 characters required";
    if (!formData.programme) e.programme = "Select a programme";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    const profileData = {
      user_id: user.id,
      full_name: formData.fullName,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      country: formData.country,
      address: formData.address,
      institution: formData.institution,
      job_title: formData.jobTitle,
      years_experience: formData.yearsExperience,
      industry: formData.industry,
      role_category: formData.roleCategory,
      education_level: formData.educationLevel,
      adr_experience: formData.adrExperience,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    };
    await (supabase as any)
      .from("profiles")
      .upsert(profileData, { onConflict: "user_id" });
  };

  const handleNext = async () => {
    if (step === 0 && validateStep0()) {
      // Capture lead immediately
      setStep(1);
    } else if (step === 1 && validateStep1()) {
      // Save identity to profile on step 1 completion
      if (user?.id) {
        await (supabase as any).from("profiles").upsert({
          user_id: user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          country: formData.country,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // Save professional profile
      await saveProfile();
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const createProfileSnapshot = () => ({
    full_name: formData.fullName,
    email: formData.email,
    phone: formData.phone,
    whatsapp: formData.whatsapp,
    country: formData.country,
    address: formData.address,
    institution: formData.institution,
    job_title: formData.jobTitle,
    years_experience: formData.yearsExperience,
    industry: formData.industry,
    role_category: formData.roleCategory,
    education_level: formData.educationLevel,
    adr_experience: formData.adrExperience,
    snapshot_at: new Date().toISOString(),
  });

  const createEnrollment = async (paymentMethod: string, paystackRef?: string) => {
    const payload = {
      booking_ref: "",
      course_id: course.id,
      ticket_type: ticketName,
      ticket_price: ticketInfo.price_ghs,
      currency: "GHS",
      email: formData.email,
      full_name: formData.fullName,
      country: formData.country,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
      institution: formData.institution,
      address: formData.address,
      programme_selected: formData.programme,
      personal_statement: formData.personalStatement,
      payment_method: paymentMethod,
      payment_status: paymentMethod === "paystack" ? "confirmed" : paymentMethod === "invoice" ? "pending_invoice" : "pending_bank",
      paystack_reference: paystackRef || null,
      user_id: user?.id || null,
      confirmed_at: paymentMethod === "paystack" ? new Date().toISOString() : null,
      profile_snapshot: createProfileSnapshot(),
    };

    const { data, error } = await (supabase as any)
      .from("course_enrollments")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const formatLevelLabel = (level?: string | null) => {
    if (!level) return "Not assigned yet";
    const normalized = level.toString().toUpperCase();
    if (normalized === "NONE") return "No level assigned";
    if (normalized === "STUDENT") return "Student";
    if (normalized === "ASSOCIATE") return "Associate";
    if (normalized === "MEMBER") return "Member";
    if (normalized === "FELLOW") return "Fellow";
    return normalized;
  };

  const handleSubmit = async () => {
    if (!formData.confirmAccurate || !formData.agreeTerms || !formData.consentContact || !formData.understandPayment) {
      toast({ title: "Please accept all agreements", variant: "destructive" });
      return;
    }

    // Check eligibility before enrollment
    try {
      setEligibilityResult(null);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const eligibilityResponse = await fetch("/api/enrollments/check-eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          courseId: course.id,
          enrollmentLevel: ticketName.toUpperCase(),
        }),
      });

      if (!eligibilityResponse.ok) {
        throw new Error("Unable to verify eligibility");
      }

      const eligibility: EligibilityResponse = await eligibilityResponse.json();
      setEligibilityResult(eligibility);

      if (eligibility.status !== "ELIGIBLE") {
        toast({
          title: eligibility.ui.title,
          description: eligibility.ui.message,
          variant: eligibility.status === "BLOCKED" ? "destructive" : "default",
        });
        return;
      }
    } catch (err: any) {
      console.error("Eligibility check failed:", err);
      toast({
        title: "Eligibility check failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Save full profile before enrollment
    await saveProfile();

    if (formData.paymentMethod === "paystack") {
      if (!window.PaystackPop) {
        toast({ title: "Payment system loading, please wait...", variant: "destructive" });
        return;
      }
      setIsSubmitting(true);

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: formData.email,
        amount: totalPrice * 100,
        currency: "GHS",
        callback: async (response: any) => {
          try {
            const enrollment = await createEnrollment("paystack", response.reference);
            localStorage.removeItem(STORAGE_KEY);
            setEligibilityResult(null);
            setBookingResult(enrollment);
            setStep(5);
          } catch (err: any) {
            toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
          }
          setIsSubmitting(false);
        },
        onClose: () => {
          setIsSubmitting(false);
          toast({ title: "Payment cancelled", variant: "destructive" });
        },
      });
      handler.openIframe();
    } else {
      setIsSubmitting(true);
      try {
        const enrollment = await createEnrollment(formData.paymentMethod);
        localStorage.removeItem(STORAGE_KEY);
        setEligibilityResult(null);
        setBookingResult(enrollment);
        setStep(5);
      } catch (err: any) {
        toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const stepLabels = [
    { icon: User, label: "Profile" },
    { icon: Briefcase, label: "Professional" },
    { icon: BookOpen, label: "Course" },
    { icon: CreditCard, label: "Review & Pay" },
  ];
  
  // For steps 1-4, map to progress. Step 0 is pre-progress.
  const progressPercent = step === 0 ? 5 : step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : step === 4 ? 90 : 100;

  // ===== SUCCESS SCREEN (step 5) =====
  if (step === 5 && bookingResult) {
    const isPaystack = bookingResult.payment_method === "paystack";
    return (
      <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {isPaystack ? `You're registered, ${formData.fullName.split(" ")[0]}!` : "Registration Received"}
            </h1>
            <p className="text-muted-foreground">
              {isPaystack
                ? "Your place is confirmed. See you at the course!"
                : "Complete your payment to confirm your spot."}
            </p>

            <Card className="text-left">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking Reference</span>
                  <span className="font-bold text-primary">{bookingResult.booking_ref}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium text-right max-w-[60%]">{course.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ticket</span>
                  <span className="font-medium">{ticketName} — GHS {ticketInfo.price_ghs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={isPaystack ? "default" : "secondary"}>
                    {isPaystack ? "✓ Confirmed via Paystack" : bookingResult.payment_status === "pending_invoice" ? "Invoice Pending" : "Pending Bank Transfer"}
                  </Badge>
                </div>
                {course.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course Date</span>
                    <span className="font-medium">{new Date(course.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
                {course.venue && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Venue</span>
                    <span className="font-medium text-right max-w-[60%]">{course.venue}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {isPaystack && (
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to <strong>{formData.email}</strong>.
                Joining instructions will follow 7 days before the course.
              </p>
            )}

            {!isPaystack && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-sm text-amber-900">
                  {bookingResult.payment_status === "pending_invoice"
                    ? "Your spot is held for 5 business days. An invoice will be sent to your email."
                    : (
                      <>
                        <p className="font-semibold mb-2">Complete your payment using the details below:</p>
                        <p>MoMo No: 0241022964</p>
                        <p>Stanbic Bank, Accra Main — Account No: 9040012902985</p>
                        <p>Cheque payable to: Center for International Mediators and Arbitrators</p>
                        <p className="mt-2">Reference your full name and booking reference when paying.</p>
                      </>
                    )}
                </CardContent>
              </Card>
            )}

            <p className="text-sm text-muted-foreground">
              Enquiries: 0536735535 | 0241022964
            </p>

            {/* What's Next */}
            <Card className="text-left border-primary/20">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold text-foreground">What happens next?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{isPaystack ? "Payment confirmed" : "Submit payment"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                    <span>Receive confirmation email with joining instructions</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                    <span>Complete your profile for a smoother experience</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                    <span>Access course materials via your dashboard</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(bookingResult.booking_ref);
                toast({ title: "Booking reference copied!" });
              }}>
                <Copy className="w-4 h-4 mr-2" /> Copy Reference
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(course.title)}${course.start_date ? `&dates=${course.start_date.replace(/-/g, "")}` : ""}`, "_blank")}
              >
                <Calendar className="w-4 h-4 mr-2" /> Add to Calendar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Simple receipt download
                  const receipt = `
CIMA COURSE REGISTRATION RECEIPT
================================
Booking Ref: ${bookingResult.booking_ref}
Date: ${new Date().toLocaleDateString("en-GB")}

Student: ${formData.fullName}
Email: ${formData.email}
Phone: ${formData.phone}

Course: ${course.title}
Programme: ${formData.programme}
Ticket: ${ticketName}
Amount: GHS ${ticketInfo.price_ghs.toLocaleString()}.00
Payment: ${isPaystack ? "Paid via Paystack" : bookingResult.payment_status === "pending_invoice" ? "Invoice Requested" : "Pending Bank Transfer"}

Status: ${isPaystack ? "CONFIRMED" : "PENDING PAYMENT"}
================================
Center for International Mediators and Arbitrators
Enquiries: 0536735535 | 0241022964
                  `.trim();
                  const blob = new Blob([receipt], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `CIMA-Receipt-${bookingResult.booking_ref}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-2" /> Download Receipt
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => window.location.href = "/dashboard"} className="gap-2">
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </Button>
              <Button variant="ghost" onClick={onClose}>Back to Courses</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={step > 0 ? () => setStep(step === 1 && !user ? 0 : Math.max(step - 1, 1)) : onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Registration</h1>
              <p className="text-sm text-muted-foreground">{course.title}</p>
            </div>
          </div>
          {step > 0 && (
            <Badge variant="secondary" className="text-primary">
              {ticketName} — GHS {totalPrice.toLocaleString()}
            </Badge>
          )}
        </div>

        {/* Progress Steps (shown for steps 1-4) */}
        {step >= 1 && step <= 4 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              {stepLabels.map((s, i) => (
                <button
                  key={i}
                  className={`flex items-center gap-1 transition-colors ${step >= i + 1 ? "text-primary font-semibold" : ""} ${step > i + 1 ? "cursor-pointer hover:text-primary/80" : "cursor-default"}`}
                  onClick={() => { if (step > i + 1) setStep(i + 1); }}
                  disabled={step <= i + 1}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              ))}
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              Step {step} of 4
            </p>
          </div>
        )}

        {/* Returning user banner */}
        {profileLoaded && formData.institution && step === 1 && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Welcome back, <strong>{formData.fullName.split(" ")[0]}</strong> — your details have been pre-filled from your profile.</span>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP 0: Quick Start (Lead Capture) ===== */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Register for this course</h2>
              <p className="text-muted-foreground">Enter your details to get started — it only takes a few minutes.</p>
            </div>

            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{course.title}</p>
                    <p className="text-sm text-muted-foreground">{ticketName} — GHS {totalPrice.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="qs-email">Email *</Label>
                    <Input
                      id="qs-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@example.com"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="qs-name">Full Name *</Label>
                    <Input
                      id="qs-name"
                      value={formData.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      placeholder="First Last"
                      className={errors.fullName ? "border-destructive" : ""}
                    />
                    {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleNext}>
                  Continue Registration <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Your data is saved securely. You can resume later.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== STEP 1: Identity ===== */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contact Details</h2>
              <p className="text-sm text-muted-foreground">Phone, country, and messaging details</p>
            </div>

            {/* Show locked email/name */}
            <Card className="bg-muted/50">
              <CardContent className="p-3 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">Name:</span> <strong>{formData.fullName}</strong>
                    <span className="mx-2 text-muted-foreground">|</span>
                    <span className="text-muted-foreground">Email:</span> <strong>{formData.email}</strong>
                  </div>
                  {!user && (
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setStep(0)}>Edit</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="country">Country *</Label>
                <Select value={formData.country} onValueChange={(v) => updateField("country", v)}>
                  <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && <p className="text-xs text-destructive mt-1">{errors.country}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Phone (with country code) *</Label>
                <Input id="phone" type="tel" placeholder="+233..." value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className={errors.phone ? "border-destructive" : ""} />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="sameAsPhone" checked={formData.sameAsPhone} onCheckedChange={(c) => updateField("sameAsPhone", c)} />
                    <label htmlFor="sameAsPhone" className="text-xs text-muted-foreground">Same as phone</label>
                  </div>
                  <Input id="whatsapp" type="tel" placeholder="+233..." value={formData.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} disabled={formData.sameAsPhone} className={errors.whatsapp ? "border-destructive" : ""} />
                </div>
                {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleNext}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ===== STEP 2: Professional Profile ===== */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Professional Profile</h2>
              <p className="text-sm text-muted-foreground">This information is saved to your profile and reused across future enrollments.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="institution">Institution / Firm / Organisation *</Label>
                <Input id="institution" value={formData.institution} onChange={(e) => updateField("institution", e.target.value)} className={errors.institution ? "border-destructive" : ""} />
                {errors.institution && <p className="text-xs text-destructive mt-1">{errors.institution}</p>}
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => updateField("jobTitle", e.target.value)} placeholder="e.g. Senior Associate" />
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Select value={formData.yearsExperience} onValueChange={(v) => updateField("yearsExperience", v)}>
                  <SelectTrigger className={errors.yearsExperience ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_LEVELS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.yearsExperience && <p className="text-xs text-destructive mt-1">{errors.yearsExperience}</p>}
              </div>
              <div>
                <Label htmlFor="industry">Industry *</Label>
                <Select value={formData.industry} onValueChange={(v) => updateField("industry", v)}>
                  <SelectTrigger className={errors.industry ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.industry && <p className="text-xs text-destructive mt-1">{errors.industry}</p>}
              </div>
              <div>
                <Label htmlFor="roleCategory">Role Category *</Label>
                <Select value={formData.roleCategory} onValueChange={(v) => updateField("roleCategory", v)}>
                  <SelectTrigger className={errors.roleCategory ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_CATEGORIES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.roleCategory && <p className="text-xs text-destructive mt-1">{errors.roleCategory}</p>}
              </div>
              <div>
                <Label htmlFor="educationLevel">Education Level *</Label>
                <Select value={formData.educationLevel} onValueChange={(v) => updateField("educationLevel", v)}>
                  <SelectTrigger className={errors.educationLevel ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.educationLevel && <p className="text-xs text-destructive mt-1">{errors.educationLevel}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label>ADR Experience</Label>
                <RadioGroup value={formData.adrExperience} onValueChange={(v) => updateField("adrExperience", v)} className="grid sm:grid-cols-2 gap-2 mt-2">
                  {ADR_EXPERIENCE_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-start gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={opt.value} id={`adr-${opt.value}`} className="mt-0.5" />
                      <label htmlFor={`adr-${opt.value}`} className="text-sm cursor-pointer leading-relaxed">{opt.label}</label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Current Address</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Street address, city" />
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleNext}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ===== STEP 3: Course-Specific ===== */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Course Details</h2>
              <p className="text-sm text-muted-foreground">Information specific to this enrollment</p>
            </div>

            <div>
              <Label className="mb-3 block">Professional Training Programme *</Label>
              {errors.programme && <p className="text-xs text-destructive mb-2">{errors.programme}</p>}
              <RadioGroup value={formData.programme} onValueChange={(v) => updateField("programme", v)} className="space-y-2">
                {PROGRAMMES.map((p) => (
                  <div key={p} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={p} id={p} className="mt-0.5" />
                    <label htmlFor={p} className="text-sm cursor-pointer leading-relaxed">{p}</label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="personalStatement">
                Tell us about yourself and why you enrolled for this course *
              </Label>
              <Textarea
                id="personalStatement"
                value={formData.personalStatement}
                onChange={(e) => updateField("personalStatement", e.target.value)}
                rows={5}
                className={`mt-2 ${errors.personalStatement ? "border-destructive" : ""}`}
                placeholder="Minimum 50 characters..."
              />
              <div className="flex justify-between mt-1">
                {errors.personalStatement && <p className="text-xs text-destructive">{errors.personalStatement}</p>}
                <p className="text-xs text-muted-foreground ml-auto">{formData.personalStatement.length} / 50 characters</p>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleNext}>
              Continue to Review <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ===== STEP 4: Review & Payment ===== */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Review & Payment</h2>
              <p className="text-sm text-muted-foreground">Confirm your details and complete payment</p>
            </div>

            {eligibilityResult && eligibilityResult.status !== "ELIGIBLE" && (
              <Card className={`border ${eligibilityResult.status === "BLOCKED" ? "border-destructive/40 bg-destructive/5" : "border-amber-200 bg-amber-50"}`}>
                <CardContent className="p-4 flex gap-3">
                  <Shield className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">{eligibilityResult.ui.title}</p>
                      <p className="text-sm text-muted-foreground">{eligibilityResult.ui.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current level: <span className="font-medium">{formatLevelLabel(eligibilityResult.progression.currentLevel)}</span>
                      {" "}• Required level: <span className="font-medium">{formatLevelLabel(eligibilityResult.progression.requiredLevel ?? eligibilityResult.progression.targetLevel)}</span>
                    </p>
                    {eligibilityResult.ui.action?.actionTarget && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setLocation(eligibilityResult.ui.action?.actionTarget || "/qualification-pathway")}
                      >
                        {eligibilityResult.ui.action.label}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{formData.fullName}</span>
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{formData.email}</span>
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{formData.phone}</span>
                    <span className="text-muted-foreground">Country</span>
                    <span className="font-medium">{formData.country}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Professional Profile</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Institution</span>
                    <span className="font-medium">{formData.institution}</span>
                    {formData.jobTitle && <>
                      <span className="text-muted-foreground">Job Title</span>
                      <span className="font-medium">{formData.jobTitle}</span>
                    </>}
                    <span className="text-muted-foreground">Industry</span>
                    <span className="font-medium">{formData.industry}</span>
                    <span className="text-muted-foreground">ADR Experience</span>
                    <span className="font-medium capitalize">{formData.adrExperience}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Course</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Programme</span>
                    <span className="font-medium text-right">{formData.programme}</span>
                    <span className="text-muted-foreground">Ticket</span>
                    <span className="font-medium">{ticketName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment details card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm space-y-2">
                <h3 className="font-bold text-foreground">PAYMENT DETAILS</h3>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">GHS {totalPrice.toLocaleString()}.00</span>
                </div>
                <div className="border-t pt-2 mt-2 text-xs text-muted-foreground">
                  <p>MoMo No: 0241022964</p>
                  <p>Cheque: Center for International Mediators and Arbitrators</p>
                  <p>Stanbic Bank, Accra Main — Account No: 9040012902985</p>
                </div>
              </CardContent>
            </Card>

            {/* Agreement checkboxes */}
            <div className="space-y-3">
              {[
                { key: "confirmAccurate", label: "I confirm the details I have provided are accurate" },
                { key: "agreeTerms", label: "I agree to the CIMA Terms & Conditions" },
                { key: "consentContact", label: "I consent to CIMA contacting me about membership and events" },
                { key: "understandPayment", label: "I understand my place is confirmed upon receipt of payment" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-start gap-3">
                  <Checkbox id={key} checked={(formData as any)[key]} onCheckedChange={(c) => updateField(key, c)} />
                  <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                </div>
              ))}
            </div>

            {/* Payment method */}
            <div>
              <Label className="mb-3 block font-semibold">Payment Method</Label>
              <RadioGroup value={formData.paymentMethod} onValueChange={(v) => updateField("paymentMethod", v)} className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="paystack" id="pm-paystack" />
                  <label htmlFor="pm-paystack" className="text-sm cursor-pointer flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    Pay Now with Card / Mobile Money (Paystack — instant)
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="bank_transfer" id="pm-bank" />
                  <label htmlFor="pm-bank" className="text-sm cursor-pointer">Pay via Bank Transfer / Cheque (admin confirms manually)</label>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                  <RadioGroupItem value="invoice" id="pm-invoice" />
                  <label htmlFor="pm-invoice" className="text-sm cursor-pointer">Request Invoice (held 5 business days)</label>
                </div>
              </RadioGroup>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.confirmAccurate || !formData.agreeTerms || !formData.consentContact || !formData.understandPayment}
            >
              {isSubmitting ? "Processing..." : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {formData.paymentMethod === "paystack" ? `Pay GHS ${totalPrice.toLocaleString()} Now` : "Submit Registration"}
                </>
              )}
            </Button>

            {formData.paymentMethod === "paystack" && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> Secured by Paystack
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

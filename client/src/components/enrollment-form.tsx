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
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Shield,
  Lock,
  Copy,
  Download,
  Calendar,
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

const STORAGE_KEY = "cima-enrollment-form";

export default function EnrollmentForm({
  course,
  ticketSelections,
  ticketTypes,
  onClose,
}: EnrollmentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const paystackLoaded = useRef(false);

  // Determine selected ticket
  const selectedTicket = Object.entries(ticketSelections).find(([, qty]) => qty > 0);
  const ticketName = selectedTicket?.[0] || "Associate";
  const ticketQty = selectedTicket?.[1] || 1;
  const ticketInfo = ticketTypes.find((t) => t.name === ticketName) || { name: ticketName, price_ghs: 5500 };
  const totalPrice = ticketInfo.price_ghs * ticketQty;

  // Form state with localStorage persistence
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      email: parsed.email || user?.email || "",
      fullName: parsed.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      country: parsed.country || "",
      phone: parsed.phone || "",
      whatsapp: parsed.whatsapp || "",
      sameAsPhone: parsed.sameAsPhone ?? true,
      institution: parsed.institution || "",
      address: parsed.address || "",
      personalStatement: parsed.personalStatement || "",
      programme: parsed.programme || "",
      paymentMethod: parsed.paymentMethod || "paystack",
      confirmAccurate: false,
      agreeTerms: false,
      consentContact: false,
      understandPayment: false,
    };
  });

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

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = "Valid email required";
    if (!formData.fullName.trim()) e.fullName = "Full name required";
    if (!formData.country) e.country = "Country required";
    if (!formData.phone.trim()) e.phone = "Phone required";
    if (!formData.whatsapp.trim()) e.whatsapp = "WhatsApp required";
    if (!formData.institution.trim()) e.institution = "Institution required";
    if (!formData.address.trim()) e.address = "Address required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!formData.personalStatement || formData.personalStatement.length < 50)
      e.personalStatement = "Minimum 50 characters required";
    if (!formData.programme) e.programme = "Select a programme";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

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
    };

    const { data, error } = await (supabase as any)
      .from("course_enrollments")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const handlePaystack = async () => {
    if (!formData.confirmAccurate || !formData.agreeTerms || !formData.consentContact || !formData.understandPayment) {
      toast({ title: "Please accept all agreements", variant: "destructive" });
      return;
    }

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
            setBookingResult(enrollment);
            setStep(4);
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
      // Bank transfer or invoice
      setIsSubmitting(true);
      try {
        const enrollment = await createEnrollment(formData.paymentMethod);
        localStorage.removeItem(STORAGE_KEY);
        setBookingResult(enrollment);
        setStep(4);
      } catch (err: any) {
        toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
      }
      setIsSubmitting(false);
    }
  };

  const progressPercent = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  // Confirmation screen (step 4)
  if (step === 4 && bookingResult) {
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

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={() => {
                navigator.clipboard.writeText(bookingResult.booking_ref);
                toast({ title: "Booking reference copied!" });
              }}>
                <Copy className="w-4 h-4 mr-2" /> Copy Reference
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(course.title)}`, "_blank")}
              >
                <Calendar className="w-4 h-4 mr-2" /> Add to Calendar
              </Button>
              <Button onClick={onClose}>Back to Courses</Button>
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
            <Button variant="ghost" size="icon" onClick={step > 1 ? () => setStep(step - 1) : onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Registration</h1>
              <p className="text-sm text-muted-foreground">{course.title}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-primary">
            {ticketName} — GHS {totalPrice.toLocaleString()}
          </Badge>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span className={step >= 1 ? "text-primary font-semibold" : ""}>1. Personal Details</span>
            <span className={step >= 2 ? "text-primary font-semibold" : ""}>2. Background</span>
            <span className={step >= 3 ? "text-primary font-semibold" : ""}>3. Review & Payment</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" value={formData.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={errors.fullName ? "border-destructive" : ""} />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>
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
                <Label htmlFor="whatsapp">WhatsApp (with country code) *</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sameAsPhone"
                      checked={formData.sameAsPhone}
                      onCheckedChange={(c) => updateField("sameAsPhone", c)}
                    />
                    <label htmlFor="sameAsPhone" className="text-xs text-muted-foreground">Same as phone</label>
                  </div>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+233..."
                    value={formData.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    disabled={formData.sameAsPhone}
                    className={errors.whatsapp ? "border-destructive" : ""}
                  />
                </div>
                {errors.whatsapp && <p className="text-xs text-destructive mt-1">{errors.whatsapp}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="institution">Name of Institution / Office / Firm *</Label>
                <Input id="institution" value={formData.institution} onChange={(e) => updateField("institution", e.target.value)} className={errors.institution ? "border-destructive" : ""} />
                {errors.institution && <p className="text-xs text-destructive mt-1">{errors.institution}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Current Address *</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} className={errors.address ? "border-destructive" : ""} />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleNext}>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Background & Motivation */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Background & Motivation</h2>

            <div>
              <Label htmlFor="personalStatement">
                Please tell us about yourself. Also tell us where you saw the advert or learnt about the course. Kindly include why you have enrolled for this course. *
              </Label>
              <Textarea
                id="personalStatement"
                value={formData.personalStatement}
                onChange={(e) => updateField("personalStatement", e.target.value)}
                rows={6}
                className={`mt-2 ${errors.personalStatement ? "border-destructive" : ""}`}
                placeholder="Minimum 50 characters..."
              />
              <div className="flex justify-between mt-1">
                {errors.personalStatement && <p className="text-xs text-destructive">{errors.personalStatement}</p>}
                <p className="text-xs text-muted-foreground ml-auto">{formData.personalStatement.length} characters</p>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Professional Training Programme *</Label>
              {errors.programme && <p className="text-xs text-destructive mb-2">{errors.programme}</p>}
              <RadioGroup value={formData.programme} onValueChange={(v) => updateField("programme", v)} className="space-y-3">
                {PROGRAMMES.map((p) => (
                  <div key={p} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={p} id={p} className="mt-0.5" />
                    <label htmlFor={p} className="text-sm cursor-pointer leading-relaxed">{p}</label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Button className="w-full" size="lg" onClick={handleNext}>
              Continue to Review <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 3: Review & Payment */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Review & Payment</h2>

            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.fullName}</span>
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{formData.email}</span>
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{formData.phone}</span>
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span className="font-medium">{formData.whatsapp}</span>
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium">{formData.country}</span>
                  <span className="text-muted-foreground">Institution</span>
                  <span className="font-medium">{formData.institution}</span>
                  <span className="text-muted-foreground">Programme</span>
                  <span className="font-medium text-right">{formData.programme}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment details card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 text-sm space-y-2">
                <h3 className="font-bold text-foreground">PAYMENT DETAILS</h3>
                <p>Course Fee:</p>
                <p className="font-medium">GHS 5,500 (Associates) | GHS 8,500 (Fellows)</p>
                <div className="border-t pt-2 mt-2">
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
                  <Checkbox
                    id={key}
                    checked={(formData as any)[key]}
                    onCheckedChange={(c) => updateField(key, c)}
                  />
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
              onClick={handlePaystack}
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

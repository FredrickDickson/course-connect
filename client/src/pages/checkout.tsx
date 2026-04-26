import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { convertUSDtoGHS, formatCurrency, convertPayment } from "@/utils/currency";
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Shield,
  Clock,
  Users,
  Star,
  CheckCircle,
  BookOpen,
  Copy,
  Download,
  LayoutDashboard,
  Calendar,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

type CheckoutStep = "review" | "pay" | "confirm";

const STEP_CONFIG: Record<CheckoutStep, { label: string; number: number; progress: number }> = {
  review: { label: "Review", number: 1, progress: 33 },
  pay: { label: "Pay", number: 2, progress: 66 },
  confirm: { label: "Confirm", number: 3, progress: 100 },
};

export default function Checkout() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<CheckoutStep>("review");
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const paystackLoaded = useRef(false);
  const [isPaystackReady, setIsPaystackReady] = useState(false);
  const [isCompanyInvoice, setIsCompanyInvoice] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [vatId, setVatId] = useState("");

  // Load course
  const { data: course, isLoading: courseLoading } = useQuery<any>({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, instructor:users!courses_instructor_id_fkey(*)")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Check existing enrollment
  const { data: existingEnrollment } = useQuery({
    queryKey: ["enrollment-check", courseId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", user?.id!)
        .maybeSingle();
      return data;
    },
    enabled: !!courseId && !!user?.id,
  });

  // Load user profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
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

  // Load Paystack script
  useEffect(() => {
    if (!paystackLoaded.current) {
      const s = document.createElement("script");
      s.src = "https://js.paystack.co/v1/inline.js";
      s.async = true;
      s.onload = () => setIsPaystackReady(true);
      s.onerror = () => toast.error("Payment system failed to load. Please refresh.");
      document.body.appendChild(s);
      paystackLoaded.current = true;
    }
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please sign in to enroll in courses.");
      setLocation(`/login?redirect=/checkout/${courseId}`);
    }
  }, [authLoading, isAuthenticated, courseId, setLocation]);

  // Already enrolled redirect
  useEffect(() => {
    if (existingEnrollment) {
      toast.info("You're already enrolled in this course!");
      setLocation(`/learn/${courseId}/1`);
    }
  }, [existingEnrollment, courseId, setLocation]);

  // Load enrollment form data from sessionStorage (if redirected from enrollment-form.tsx)
  useEffect(() => {
    const stored = sessionStorage.getItem("enrollment_form_data");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.courseId === courseId) {
          // Pre-populate profile if needed
          console.log("Loaded enrollment form data:", data);
          // Clear after reading to prevent stale data
          sessionStorage.removeItem("enrollment_form_data");
        }
      } catch (e) {
        console.error("Failed to parse enrollment form data:", e);
      }
    }
  }, [courseId]);

  const coursePrice = parseFloat(course?.price?.toString() || "0");
  const currency = course?.currency || "USD";
  const avgRating = course?.avg_rating ? parseFloat(course.avg_rating.toString()) : 0;
  
  // Convert USD to GHS for display
  const paymentConversion = convertPayment(coursePrice);
  const amountGHS = paymentConversion.amountGHS;

  const handlePaystackPayment = async () => {
    if (!user || !course) return;

    setIsProcessing(true);

    try {
      // Initialize transaction via Edge Function
      const initResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-course-initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.id,
          enrollmentLevel: course.level?.toUpperCase() || 'ASSOCIATE',
          paymentType: isCompanyInvoice ? "company_invoice" : "individual",
          ...(isCompanyInvoice && {
            companyName,
            companyEmail,
            vatId,
          }),
          amount: coursePrice,
          currency,
          email: user.email || "",
        }),
      });

      const initData = await initResponse.json();

      if (!initResponse.ok || !initData.success) {
        const detailMsg = initData?.details?.message;
        throw new Error(detailMsg || initData.error || "Failed to initialize payment");
      }

      // Open Paystack popup with the authorization URL
      window.location.href = initData.authorization_url;
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      toast.error(error?.message || "Failed to initialize payment. Please try again.");
      setIsProcessing(false);
    }
  };

  // TODO: Work on bank transfer later
  /* const handleBankTransfer = async () => {
    if (!user || !course) return;
    setIsProcessing(true);
    try {
      // Create a pending enrollment via course_enrollments
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .insert({
          booking_ref: "",
          course_id: course.id,
          email: user.email,
          full_name: profile?.full_name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          ticket_type: "Standard",
          ticket_price: coursePrice,
          currency,
          payment_method: "bank_transfer",
          payment_status: "pending_bank",
          user_id: user.id,
          profile_snapshot: {
            full_name: profile?.full_name,
            email: user.email,
            phone: profile?.phone,
            snapshot_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) throw error;

      setBookingResult({
        reference: data.booking_ref,
        amount: coursePrice,
        currency,
        courseName: course.title,
        paymentMethod: "bank_transfer",
        bookingRef: data.booking_ref,
      });
      setStep("confirm");
    } catch (err: any) {
      toast.error("Registration failed: " + err.message);
    }
    setIsProcessing(false);
  }; */

  const handleProceedToPayment = () => {
    setStep("pay");
  };

  const handleConfirmPayment = () => {
    if (paymentMethod === "paystack") {
      handlePaystackPayment();
    } else {
      // TODO: Work on bank transfer later
      // handleBankTransfer();
      toast.error("Bank transfer is currently unavailable.");
    }
  };

  // Loading state
  if (courseLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-3 h-64 bg-muted rounded" />
              <div className="md:col-span-2 h-64 bg-muted rounded" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find this course.</p>
          <Link href="/course-catalog">
            <Button>Browse Courses</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back button */}
        <Link href={`/course/${courseId}`}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
        </Link>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-3">
            {(["review", "pay", "confirm"] as CheckoutStep[]).map((s, i) => {
              const config = STEP_CONFIG[s];
              const isActive = s === step;
              const isDone = config.number < STEP_CONFIG[step].number;
              return (
                <div
                  key={s}
                  className={`flex items-center gap-2 ${
                    isActive ? "text-primary font-semibold" : isDone ? "text-primary/70" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle className="w-4 h-4" /> : config.number}
                  </div>
                  <span className="hidden sm:inline">{config.label}</span>
                </div>
              );
            })}
          </div>
          <Progress value={STEP_CONFIG[step].progress} className="h-1.5" />
        </div>

        {/* ═══════════════ STEP 1: REVIEW ═══════════════ */}
        {step === "review" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Review Your Enrollment</h1>
              <p className="text-muted-foreground mt-1">
                Confirm the details below before proceeding to payment.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-6">
              {/* Course details */}
              <div className="md:col-span-3 space-y-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg leading-tight">{course.title}</h3>
                        {course.subtitle && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.subtitle}</p>
                        )}
                        {course.instructor && (
                          <p className="text-sm text-muted-foreground mt-2">
                            By {course.instructor.first_name} {course.instructor.last_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      {course.level && <Badge variant="secondary">{course.level}</Badge>}
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-current text-yellow-500" />
                        <span>{avgRating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.enrollment_count || 0} students</span>
                      </div>
                      {course.duration_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{course.duration_hours}h</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* What's Included */}
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3">What's Included</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                      {[
                        "Full course access",
                        "Certificate of completion",
                        "Community forum access",
                        "Mobile & desktop access",
                        "Downloadable resources",
                        "Lifetime access",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Student info */}
                <Card>
                  <CardContent className="p-5">
                    <h4 className="font-semibold mb-3">Student Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium">
                          {profile?.full_name || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email</span>
                        <span className="font-medium">{user?.email}</span>
                      </div>
                      {profile?.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-medium">{profile.phone}</span>
                        </div>
                      )}
                    </div>
                    {!profile?.profile_completed && (
                      <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Complete your profile in settings for a better experience.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Company Invoice Option - TODO: Work on this later */}
                {/* <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Invoice My Company</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isCompanyInvoice}
                          onChange={(e) => setIsCompanyInvoice(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {isCompanyInvoice && (
                      <div className="space-y-3 mt-4">
                        <div>
                          <Label htmlFor="companyName" className="text-sm">Company Name</Label>
                          <input
                            id="companyName"
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                            placeholder="ABC Corporation"
                            required={isCompanyInvoice}
                          />
                        </div>
                        <div>
                          <Label htmlFor="companyEmail" className="text-sm">Billing Email</Label>
                          <input
                            id="companyEmail"
                            type="email"
                            value={companyEmail}
                            onChange={(e) => setCompanyEmail(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                            placeholder="billing@company.com"
                            required={isCompanyInvoice}
                          />
                        </div>
                        <div>
                          <Label htmlFor="vatId" className="text-sm">VAT/Tax ID (Optional)</Label>
                          <input
                            id="vatId"
                            type="text"
                            value={vatId}
                            onChange={(e) => setVatId(e.target.value)}
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                            placeholder="VAT123456789"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card> */}
              </div>

              {/* Order summary sticky */}
              <div className="md:col-span-2">
                <Card className="md:sticky md:top-24 border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Course Price</span>
                        <span>{formatCurrency(coursePrice, 'USD')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">You'll be charged</span>
                        <span className="font-semibold text-primary">{formatCurrency(amountGHS, 'GHS')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span className="text-green-600">Free</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <div className="text-right">
                          <div className="text-primary">{formatCurrency(coursePrice, 'USD')}</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            (~{formatCurrency(amountGHS, 'GHS')} will be charged)
                          </div>
                        </div>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Price shown in USD. You will be charged in Ghana Cedis (GHS) at current exchange rate.
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleProceedToPayment}>
                      Proceed to Payment
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Secure checkout · SSL encrypted</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 2: PAY ═══════════════ */}
        {step === "pay" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Choose Payment Method</h1>
              <p className="text-muted-foreground mt-1">
                Select how you'd like to pay for <strong>{course.title}</strong>.
              </p>
            </div>

            <div className="grid md:grid-cols-5 gap-6">
              <div className="md:col-span-3 space-y-4">
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-3"
                >
                  {/* Paystack option */}
                  <Label
                    htmlFor="method-paystack"
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "paystack"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="paystack" id="method-paystack" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Pay with Card / Mobile Money</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Instant confirmation via Paystack. Supports Visa, Mastercard, and Mobile Money.
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">Recommended · Instant</Badge>
                    </div>
                  </Label>

                  {/* Bank transfer option - TODO: Work on this later */}
                  {/* <Label
                    htmlFor="method-bank"
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "bank_transfer"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value="bank_transfer" id="method-bank" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold">Bank Transfer</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay via bank transfer. Your spot is held for 5 business days while we confirm payment.
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">Manual · 1-3 days</Badge>
                    </div>
                  </Label> */}
                </RadioGroup>

                {/* Bank transfer details - TODO: Work on this later */}
                {/* {paymentMethod === "bank_transfer" && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4 text-sm text-amber-900 space-y-2">
                      <p className="font-semibold">Bank Transfer Details:</p>
                      <p>MoMo No: 0241022964</p>
                      <p>Stanbic Bank, Accra Main — Acct: 9040012902985</p>
                      <p>Cheque payable to: Center for International Mediators and Arbitrators</p>
                      <p className="mt-2 text-xs">Include your full name as the reference.</p>
                    </CardContent>
                  </Card>
                )} */}
              </div>

              {/* Price summary */}
              <div className="md:col-span-2">
                <Card className="md:sticky md:top-24 border-primary/20">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight line-clamp-2">{course.title}</p>
                        {course.level && <Badge variant="secondary" className="mt-1 text-xs">{course.level}</Badge>}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <div className="text-right">
                        <div className="text-primary">{formatCurrency(coursePrice, 'USD')}</div>
                        <div className="text-sm font-normal text-muted-foreground">
                          ({formatCurrency(amountGHS, 'GHS')} charged)
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" onClick={() => setStep("review")} className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={isProcessing || (paymentMethod === "paystack" && !isPaystackReady)}
                        size="lg"
                        className="w-full h-12 text-base font-semibold"
                        aria-label={
                          isProcessing
                            ? "Processing payment"
                            : paymentMethod === "paystack" && !isPaystackReady
                              ? "Loading payment system"
                              : `Pay ${formatCurrency(amountGHS, 'GHS')} for ${course.title}`
                        }
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Processing Payment
                          </>
                        ) : paymentMethod === "paystack" && !isPaystackReady ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Loading Payment
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            {paymentMethod === "paystack" ? `Pay ${formatCurrency(amountGHS, 'GHS')}` : "Submit Registration"}
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      <span>256-bit SSL encryption</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP 3: CONFIRM ═══════════════ */}
        {step === "confirm" && bookingResult && (
          <div className="max-w-lg mx-auto space-y-6 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                {bookingResult.paymentMethod === "bank_transfer"
                  ? "Registration Received!"
                  : "Payment Successful!"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {bookingResult.paymentMethod === "bank_transfer"
                  ? "Complete your bank transfer to confirm your enrollment."
                  : `You're now enrolled in ${bookingResult.courseName}. Start learning right away!`}
              </p>
            </div>

            <Card className="text-left">
              <CardContent className="p-5 space-y-3 text-sm">
                {bookingResult.bookingRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Booking Ref</span>
                    <span className="font-bold text-primary">{bookingResult.bookingRef}</span>
                  </div>
                )}
                {bookingResult.reference && !bookingResult.bookingRef && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Ref</span>
                    <span className="font-mono text-xs">{bookingResult.reference}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium text-right max-w-[60%]">{bookingResult.courseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{bookingResult.currency} {bookingResult.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={bookingResult.paymentMethod === "bank_transfer" ? "secondary" : "default"}>
                    {bookingResult.paymentMethod === "bank_transfer" ? "Pending Payment" : "✓ Confirmed"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* TODO: Work on bank transfer later */}
            {/* {bookingResult.paymentMethod === "bank_transfer" && (
              <Card className="text-left border-amber-200 bg-amber-50">
                <CardContent className="p-4 text-sm text-amber-900 space-y-1">
                  <p className="font-semibold">Complete your payment:</p>
                  <p>MoMo No: 0241022964</p>
                  <p>Stanbic Bank, Accra Main — Acct: 9040012902985</p>
                  <p className="text-xs mt-2">Your spot is held for 5 business days.</p>
                </CardContent>
              </Card>
            )} */}

            {/* What's Next */}
            <Card className="text-left border-primary/20">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold">What happens next?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {[
                    bookingResult.paymentMethod === "bank_transfer" ? "Submit payment via bank transfer" : "Payment confirmed ✓",
                    "Confirmation email sent to your inbox",
                    "Access course materials via your dashboard",
                    "Complete your profile to unlock all features",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${i === 0 && bookingResult.paymentMethod !== "bank_transfer" ? "text-green-500" : "text-muted-foreground/40"}`} />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {bookingResult.paymentMethod !== "bank_transfer" && (
                <Link href={`/learn/${courseId}/1`}>
                  <Button size="lg">
                    <BookOpen className="w-4 h-4 mr-2" /> Start Learning
                  </Button>
                </Link>
              )}
              <Link href="/dashboard">
                <Button variant={bookingResult.paymentMethod === "bank_transfer" ? "default" : "outline"} size="lg">
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Go to Dashboard
                </Button>
              </Link>
              {bookingResult.bookingRef && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    navigator.clipboard.writeText(bookingResult.bookingRef);
                    toast.success("Booking reference copied!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Ref
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              A confirmation email has been sent to {user?.email}. For support, contact us at{" "}
              <Link href="/contact" className="underline">our help center</Link>.
            </p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

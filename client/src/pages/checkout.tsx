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
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
  Tag,
  X,
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
  const [accessCode, setAccessCode] = useState("");
  const [appliedToken, setAppliedToken] = useState<null | {
    token: string;
    discountType: string;
    discountValue: number;
    discountedAmount: number;
    currency: string;
  }>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

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
      setLocation(`/learn/${courseId}`);
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
  const currency: "USD" | "GHS" = course?.currency === "GHS" ? "GHS" : "USD";
  const avgRating = course?.avg_rating ? parseFloat(course.avg_rating.toString()) : 0;

  // Effective price after any applied access/coupon code. This is purely
  // a display convenience — the server always re-validates the code and
  // computes the authoritative price itself before charging or enrolling.
  const effectivePrice = appliedToken ? appliedToken.discountedAmount : coursePrice;
  const isFreeViaToken = !!appliedToken && appliedToken.discountedAmount === 0;

  // Convert to GHS for display/charging. No-op when the course is already
  // priced in GHS; converts via the fixed rate when priced in USD.
  const paymentConversion = convertPayment(effectivePrice, currency);
  const amountGHS = paymentConversion.amountGHS;
  // Only show "you'll be charged in a different currency" messaging when a
  // real conversion happened — a GHS-priced course is charged exactly what
  // is displayed, there's nothing to disclose.
  const isConverted = currency === "USD";

  const CODE_ERROR_MESSAGES: Record<string, string> = {
    course_not_found: "Course not found.",
    invalid_token: "This code is not valid.",
    token_disabled: "This code has been disabled.",
    token_course_mismatch: "This code is not valid for this course.",
    token_expired: "This code has expired.",
    token_exhausted: "This code has already been used.",
  };

  const handleApplyCode = async () => {
    if (!accessCode.trim() || !courseId) return;
    setIsValidatingCode(true);
    try {
      const { data, error } = await supabase.rpc("validate_course_access_token" as never, {
        _token: accessCode.trim(),
        _course_id: courseId,
      } as never);
      const result: any = Array.isArray(data) ? data[0] : data;
      if (error || !result?.valid) {
        toast.error(CODE_ERROR_MESSAGES[result?.reason] || "Invalid or expired code");
        setAppliedToken(null);
        return;
      }
      setAppliedToken({
        token: accessCode.trim(),
        discountType: result.discount_type,
        discountValue: result.discount_value,
        discountedAmount: result.discounted_amount,
        currency: result.currency,
      });
      toast.success(
        result.discount_value === 100
          ? "Access code applied — this course is free!"
          : `Code applied — ${result.discount_value}% off`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to validate code");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleRemoveCode = () => {
    setAppliedToken(null);
    setAccessCode("");
  };

  const handlePaystackPayment = async () => {
    if (!user || !course) return;

    setIsProcessing(true);

    try {
      // Initialize transaction via Edge Function. Send the user's own
      // session token (not the anon key) so the function can verify the
      // caller actually is the userId being enrolled/charged.
      const { data: { session } } = await supabase.auth.getSession();
      const initResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paystack-course-initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.id,
          enrollmentLevel: course.programme_type === 'ADJUNCT_COURSE' ? null : (course.level?.toUpperCase() || 'ASSOCIATE'),
          programmeType: course.programme_type || 'PROFESSIONAL_PROGRAMME',
          paymentType: isCompanyInvoice ? "company_invoice" : "individual",
          ...(isCompanyInvoice && {
            companyName,
            companyEmail,
            vatId,
          }),
          amount: effectivePrice,
          currency,
          email: user.email || "",
          ...(appliedToken && { accessCode: appliedToken.token }),
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

  const handleTokenRedeem = async () => {
    if (!user || !course || !appliedToken) return;

    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-access-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: course.id,
          userId: user.id,
          token: appliedToken.token,
          enrollmentLevel: course.programme_type === "ADJUNCT_COURSE" ? null : (course.level?.toUpperCase() || "ASSOCIATE"),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to redeem code");
      }

      // Note: deliberately not invalidating the ["enrollment-check", ...]
      // query here — doing so would trigger the existing "already
      // enrolled" redirect effect above and skip straight past this
      // confirmation step before the user sees it. The dashboard's own
      // enrollment list/stats caches still need invalidating though,
      // otherwise they keep serving the pre-redemption data for up to
      // the 5-minute default staleTime.
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard-stats"] });
      setBookingResult({
        reference: data.orderId,
        amount: 0,
        currency,
        courseName: course.title,
        paymentMethod: "access_token",
      });
      setStep("confirm");
    } catch (err: any) {
      toast.error(err?.message || "Failed to redeem code");
    } finally {
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
    if (isFreeViaToken) {
      handleTokenRedeem();
    } else if (paymentMethod === "paystack") {
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
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex-1">
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
                          <CourseThumbnail src={course.thumbnail_url} alt={course.title} className="w-full h-full" />
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
                        <span className={appliedToken ? "line-through text-muted-foreground" : ""}>
                          {formatCurrency(coursePrice, currency)}
                        </span>
                      </div>
                      {appliedToken && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>
                            {appliedToken.discountValue === 100 ? "Access Code Discount" : "Coupon Discount"}
                          </span>
                          <span>-{formatCurrency(coursePrice - effectivePrice, currency)}</span>
                        </div>
                      )}
                      {!isFreeViaToken && isConverted && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">You'll be charged</span>
                          <span className="font-semibold text-primary">{formatCurrency(amountGHS, 'GHS')}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span className="text-green-600">Free</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Access / coupon code */}
                    <div className="space-y-2">
                      <Label htmlFor="access-code" className="text-sm font-medium flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" /> Have an access or coupon code?
                      </Label>
                      {appliedToken ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                          <span className="text-green-800 font-medium flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> {appliedToken.token} applied
                          </span>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={handleRemoveCode}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            id="access-code"
                            placeholder="Enter code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            onClick={handleApplyCode}
                            disabled={!accessCode.trim() || isValidatingCode}
                          >
                            {isValidatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      )}
                    </div>

                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <div className="text-right">
                          <div className="text-primary">{formatCurrency(effectivePrice, currency)}</div>
                          {!isFreeViaToken && isConverted && (
                            <div className="text-sm font-normal text-muted-foreground">
                              (~{formatCurrency(amountGHS, 'GHS')} will be charged)
                            </div>
                          )}
                        </div>
                      </div>
                      {!isFreeViaToken && isConverted && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              Price shown in USD. You will be charged in Ghana Cedis (GHS) at current exchange rate.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <Button className="w-full" size="lg" onClick={handleProceedToPayment}>
                      {isFreeViaToken ? "Continue" : "Proceed to Payment"}
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
                {isFreeViaToken ? (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-green-800 font-semibold">
                        <Tag className="w-5 h-5" />
                        Access code applied
                      </div>
                      <p className="text-sm text-green-700 mt-2">
                        Your access code covers the full cost of this course. No payment is required — click
                        below to complete your enrollment.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
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
                        <span className="font-semibold">Pay Full Amount Now</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Instant confirmation via Paystack. Supports Visa, Mastercard, and Mobile Money.
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">Recommended · Instant Access</Badge>
                    </div>
                  </Label>

                  {/* Part Payment option */}
                  <Label
                    htmlFor="method-part-payment"
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "part_payment"
                        ? "border-[#5A2633] bg-[#5A2633]/5"
                        : "border-border hover:border-[#5A2633]/30"
                    }`}
                  >
                    <RadioGroupItem value="part_payment" id="method-part-payment" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#5A2633]" />
                        <span className="font-semibold">Part Payment Option</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay in installments. Contact us to arrange a payment plan that works for you.
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs border-[#5A2633]/30 text-[#5A2633]">Flexible · Contact Required</Badge>
                    </div>
                  </Label>

                  {/* Group Payment option */}
                  <Label
                    htmlFor="method-group-payment"
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      paymentMethod === "group_payment"
                        ? "border-[#5A2633] bg-[#5A2633]/5"
                        : "border-border hover:border-[#5A2633]/30"
                    }`}
                  >
                    <RadioGroupItem value="group_payment" id="method-group-payment" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#5A2633]" />
                        <span className="font-semibold">Group / Corporate Payment</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Enrolling multiple people? Contact us for group rates and corporate packages.
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs border-[#5A2633]/30 text-[#5A2633]">Bulk Discount · Contact for Quote</Badge>
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
                )}

                {/* Part Payment & Group Payment Contact Info */}
                {(paymentMethod === "part_payment" || paymentMethod === "group_payment") && (
                  <Card className="border-[#5A2633]/20 bg-[#5A2633]/5">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#5A2633]/10 rounded-lg">
                          {paymentMethod === "part_payment" ? (
                            <Clock className="w-5 h-5 text-[#5A2633]" />
                          ) : (
                            <Users className="w-5 h-5 text-[#5A2633]" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#5A2633] mb-1">
                            {paymentMethod === "part_payment" ? "Part Payment Arrangement" : "Group Enrollment"}
                          </h4>
                          <p className="text-sm text-[#6b5d4f]">
                            {paymentMethod === "part_payment" 
                              ? "Contact us to set up a flexible payment plan for this course."
                              : "Get special rates for group enrollments. Perfect for teams and organizations."}
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-[#5A2633]/20" />

                      <div className="space-y-3">
                        <p className="text-sm font-medium text-[#5A2633]">Contact us via:</p>
                        
                        {/* WhatsApp Button */}
                        <a
                          href={`https://wa.me/233508528180?text=${encodeURIComponent(
                            `Hi, I'm interested in ${paymentMethod === "part_payment" ? "part payment" : "group enrollment"} for the course: ${course.title}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-white border-2 border-[#5A2633]/20 rounded-lg hover:border-[#5A2633]/40 hover:bg-[#5A2633]/5 transition-all group"
                        >
                          <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm text-gray-900">WhatsApp Us</p>
                            <p className="text-xs text-gray-600">+233 50 852 8180</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#5A2633] group-hover:translate-x-1 transition-transform" />
                        </a>

                        {/* Email Button */}
                        <a
                          href={`mailto:info@thecima.org?subject=${encodeURIComponent(
                            paymentMethod === "part_payment" ? "Part Payment Request" : "Group Enrollment Inquiry"
                          )}&body=${encodeURIComponent(
                            `Hi,\n\nI'm interested in ${paymentMethod === "part_payment" ? "setting up a part payment plan" : "group enrollment"} for the following course:\n\nCourse: ${course.title}\nPrice: ${formatCurrency(coursePrice, currency)}\n\nPlease let me know the next steps.\n\nThank you!`
                          )}`}
                          className="flex items-center gap-3 p-3 bg-white border-2 border-[#5A2633]/20 rounded-lg hover:border-[#5A2633]/40 hover:bg-[#5A2633]/5 transition-all group"
                        >
                          <div className="p-2 bg-[#5A2633]/10 rounded-lg group-hover:bg-[#5A2633]/20 transition-colors">
                            <svg className="w-5 h-5 text-[#5A2633]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-sm text-gray-900">Email Us</p>
                            <p className="text-xs text-gray-600">info@thecima.org</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#5A2633] group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>

                      <div className="bg-white rounded-lg p-3 border border-[#5A2633]/20">
                        <p className="text-xs text-[#6b5d4f]">
                          <strong className="text-[#5A2633]">Note:</strong> {paymentMethod === "part_payment" 
                            ? "Part payment plans are subject to approval. Our team will respond within 24 hours with available options."
                            : "Group rates available for 3+ enrollments. Corporate packages include bulk discounts and customized training options."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                          <CourseThumbnail src={course.thumbnail_url} alt={course.title} className="w-full h-full" />
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
                        <div className="text-primary">{formatCurrency(effectivePrice, currency)}</div>
                        {!isFreeViaToken && isConverted && (
                          <div className="text-sm font-normal text-muted-foreground">
                            ({formatCurrency(amountGHS, 'GHS')} charged)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" onClick={() => setStep("review")} className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                      </Button>
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={
                          isProcessing || 
                          paymentMethod === "part_payment" || 
                          paymentMethod === "group_payment" ||
                          (!isFreeViaToken && paymentMethod === "paystack" && !isPaystackReady)
                        }
                        size="lg"
                        className="w-full h-12 text-base font-semibold"
                        aria-label={
                          isProcessing
                            ? "Processing payment"
                            : isFreeViaToken
                              ? `Complete enrollment in ${course.title}`
                              : paymentMethod === "paystack" && !isPaystackReady
                                ? "Loading payment system"
                                : `Pay ${formatCurrency(amountGHS, 'GHS')} for ${course.title}`
                        }
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {isFreeViaToken ? "Enrolling" : "Processing Payment"}
                          </>
                        ) : isFreeViaToken ? (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Complete Enrollment
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
                  : bookingResult.paymentMethod === "access_token"
                    ? "You're Enrolled!"
                    : "Payment Successful!"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {bookingResult.paymentMethod === "bank_transfer"
                  ? "Complete your bank transfer to confirm your enrollment."
                  : `You now have full access to ${bookingResult.courseName}. Start learning right away!`}
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
                    {bookingResult.paymentMethod === "bank_transfer"
                      ? "Pending Payment"
                      : bookingResult.paymentMethod === "access_token"
                        ? "✓ Redeemed"
                        : "✓ Confirmed"}
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
                <Link href={`/learn/${courseId}`}>
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

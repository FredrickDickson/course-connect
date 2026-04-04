import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  CreditCard,
  Shield,
  Clock,
  Users,
  Star,
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { CourseWithDetails } from "@shared/schema";

// PayStack configuration
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function Checkout() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const scriptLoaded = useRef(false);
  const [useStateFixed] = useState(0); // Dummy for trigger
  const [isPaystackReady, setIsPaystackReady] = useState(false);
  const [paystackLoadError, setPaystackLoadError] = useState<string | null>(
    null,
  );

  const paystackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: course, isLoading } = useQuery<any>({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, instructor:users!courses_instructor_id_fkey(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load PayStack script with timeout
  useEffect(() => {
    if (!scriptLoaded.current) {
      const script = document.createElement("script");
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;

      // Set timeout for script loading
      paystackTimeoutRef.current = setTimeout(() => {
        if (!window.PaystackPop) {
          setPaystackLoadError(
            "Payment system failed to load. Please check your connection and try again.",
          );
          toast({
            title: "Payment System Error",
            description:
              "Failed to load payment system. Please refresh the page.",
            variant: "destructive",
          });
        }
      }, 10000); // 10 second timeout

      script.onload = () => {
        if (paystackTimeoutRef.current) {
          clearTimeout(paystackTimeoutRef.current);
        }
        setIsPaystackReady(true);
      };

      script.onerror = () => {
        if (paystackTimeoutRef.current) {
          clearTimeout(paystackTimeoutRef.current);
        }
        setPaystackLoadError("Failed to load payment system.");
        toast({
          title: "Payment System Error",
          description:
            "Failed to load payment system. Please check your connection.",
          variant: "destructive",
        });
      };

      document.body.appendChild(script);
      scriptLoaded.current = true;
    }

    return () => {
      if (paystackTimeoutRef.current) {
        clearTimeout(paystackTimeoutRef.current);
      }
    };
  }, [toast]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ courseId: id }),
      });
      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: "Order Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePayment = async () => {
    if (!user || !course) {
      toast({
        title: "Payment Error",
        description: "Missing user or course information.",
        variant: "destructive",
      });
      return;
    }

    if (!window.PaystackPop) {
      toast({
        title: "Payment System Not Ready",
        description:
          paystackLoadError ||
          "Payment system is still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync();

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user?.email || "",
        amount: Math.round(parseFloat(course.price.toString()) * 100), // Convert to kobo
        currency: course.currency || "USD",
        ref: order.paystackReference,
        callback: async function (response: any) {
          if (response.status === "success") {
            // Verify payment on server
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();
              const verifyResponse = await fetch("/api/verify-payment", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ reference: response.reference }),
              });

              const verifyResult = await verifyResponse.json();

              if (verifyResult.success) {
                toast({
                  title: "Payment Successful!",
                  description: "You have been enrolled in the course.",
                });

                // Invalidate relevant queries
                queryClient.invalidateQueries({
                  queryKey: ["enrollment-check", id, user?.id],
                });
                queryClient.invalidateQueries({
                  queryKey: ["enrollments", user?.id],
                });

                // Redirect to course
                setLocation(`/learn/${id}/1`);
              } else {
                toast({
                  title: "Payment Verification Failed",
                  description: "Please contact support if this persists.",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error("Verification error:", error);
              toast({
                title: "Payment Verification Error",
                description:
                  "Please contact support to confirm your enrollment.",
                variant: "destructive",
              });
            }
          }
        },
        onClose: function () {
          toast({
            title: "Payment Cancelled",
            description: "You can retry the payment anytime.",
            variant: "destructive",
          });
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to purchase courses.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="h-64 bg-muted rounded"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-96 bg-muted rounded"></div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Course Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The course you're trying to purchase doesn't exist.
          </p>
          <Link href="/courses">
            <Button>Browse Courses</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const coursePrice = parseFloat(course.price?.toString() || "0");
  const avgRating = course.avg_rating
    ? parseFloat(course.avg_rating.toString())
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/courses" className="hover:text-primary">
              Courses
            </Link>
            <span>/</span>
            <Link href={`/courses/${id}`} className="hover:text-primary">
              {course.title}
            </Link>
            <span>/</span>
            <span className="text-foreground">Checkout</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/courses/${id}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <h1
            className="text-3xl font-bold text-foreground"
            data-testid="checkout-title"
          >
            Complete Your Enrollment
          </h1>
          <p className="text-muted-foreground mt-2">
            Secure checkout with industry-standard encryption
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Course Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Course Details</span>
                  <Badge variant="secondary" className="ml-auto">
                    {course.level}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">
                          {course.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className="font-semibold text-lg mb-1"
                      data-testid="course-title"
                    >
                      {course.title}
                    </h3>
                    {course.subtitle && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {course.subtitle}
                      </p>
                    )}
                    {course.instructor && (
                      <p className="text-sm text-muted-foreground">
                        By {course.instructor.first_name}{" "}
                        {course.instructor.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 fill-current text-yellow-500" />
                      <span>{avgRating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{course.enrollment_count} students</span>
                    </div>
                    {course.duration_hours && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{course.duration_hours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* What's Included */}
            <Card>
              <CardHeader>
                <CardTitle>What's Included</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span>Lifetime access to course content</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span>Certificate of completion</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span>Access to course discussions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    </div>
                    <span>Mobile and desktop access</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Summary</span>
                </CardTitle>
                <CardDescription>
                  Review your order before completing payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Course Price</span>
                    <span className="font-medium" data-testid="course-price">
                      ${coursePrice.toFixed(2)} {course.currency || "USD"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span data-testid="total-price">
                    ${coursePrice.toFixed(2)} {course.currency || "USD"}
                  </span>
                </div>

                <div className="pt-4">
                  {paystackLoadError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">
                        {paystackLoadError}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-600"
                        onClick={() => window.location.reload()}
                      >
                        <i className="fas fa-redo mr-2"></i>
                        Retry Loading Payment
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={handlePayment}
                    disabled={createOrderMutation.isPending || !isPaystackReady}
                    className="w-full"
                    size="lg"
                    data-testid="pay-now-button"
                  >
                    {createOrderMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : !isPaystackReady ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Loading Payment...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Now</span>
                      </div>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center space-y-2 pt-4">
                  <div className="flex items-center justify-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>Secure 256-bit SSL encryption</span>
                  </div>
                  <p>
                    By clicking "Pay Now", you agree to our Terms of Service and
                    Privacy Policy. You'll be charged immediately upon
                    successful payment.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Money Back Guarantee */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-800 mb-1">
                      30-Day Money-Back Guarantee
                    </h4>
                    <p className="text-sm text-green-700">
                      If you're not satisfied with this course, we'll refund
                      your payment within 30 days of purchase.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

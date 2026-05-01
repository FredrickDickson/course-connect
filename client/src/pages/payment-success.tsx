import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, PlayCircle, Home } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [reference, setReference] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('reference') || params.get('trxref');
    setReference(ref);
  }, []);

  const verifyPaymentMutation = useMutation({
    mutationFn: async (ref: string) => {
      const res = await apiRequest('POST', '/api/verify-payment', { reference: ref });
      return await res.json();
    },
    onSuccess: async (response: any) => {
      if (response?.success) {
        // Invalidate every enrollment-related cache so gated pages unlock immediately
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/enrollments'] }),
          queryClient.invalidateQueries({ queryKey: ['enrollment-check'] }),
          queryClient.invalidateQueries({ queryKey: ['enrollments'] }),
        ]);

        // Server returns { success, data: paystackTransaction }
        // where paystackTransaction.metadata.courseId is set during checkout init.
        const tx = response?.data;
        const enrolledCourseId =
          tx?.metadata?.courseId ||
          tx?.data?.metadata?.courseId; // defensive: in case raw paystack envelope leaks through

        if (enrolledCourseId) {
          setLocation(`/course/${enrolledCourseId}`);
          return;
        }

        setLocation('/dashboard');
      }
    },
  });

  useEffect(() => {
    if (reference && isAuthenticated && !isLoading) {
      verifyPaymentMutation.mutate(reference);
    }
  }, [reference, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Loading...</h1>
              <p className="text-muted-foreground">Please wait while we verify your session.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Invalid Payment Reference</h1>
              <p className="text-muted-foreground mb-6">
                We couldn't find a payment reference in the URL.
              </p>
              <Link href="/course-catalog">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (verifyPaymentMutation.isPending) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Verifying Payment...</h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your payment.
              </p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (verifyPaymentMutation.isError || !verifyPaymentMutation.data?.success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Payment Verification Failed</h1>
              <p className="text-muted-foreground mb-6">
                We couldn't verify your payment. Please contact support if you believe this is an error.
              </p>
              <div className="flex gap-4 justify-center">
                <Link href="/contact">
                  <Button variant="outline">Contact Support</Button>
                </Link>
                <Link href="/course-catalog">
                  <Button>
                    <Home className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const paymentData = verifyPaymentMutation.data?.data;
  const finalCourseId =
    paymentData?.metadata?.courseId ||
    paymentData?.data?.metadata?.courseId;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-3xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-4">
                Thank you for your purchase. You are now enrolled in the course!
              </p>
              
              {paymentData && (
                <div className="bg-muted p-6 rounded-lg space-y-3 text-left max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction Reference:</span>
                    <span className="font-medium">{paymentData.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium">
                      {paymentData.currency} {(paymentData.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  {paymentData.metadata?.courseName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Course:</span>
                      <span className="font-medium">{paymentData.metadata.courseName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium text-primary">Completed</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center pt-6">
              {finalCourseId ? (
                <>
                  <Link href={`/course/${finalCourseId}`}>
                    <Button size="lg" className="bg-primary hover:bg-primary/90">
                      <PlayCircle className="h-5 w-5 mr-2" />
                      Start Learning
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline" size="lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/dashboard">
                    <Button size="lg">
                      View My Courses
                    </Button>
                  </Link>
                  <Link href="/course-catalog">
                    <Button variant="outline" size="lg">
                      Browse More Courses
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <div className="text-center pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to your registered email address.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

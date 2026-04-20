/**
 * Membership Renewal Page
 * Shows renewal summary, payment options, and confirmation
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { downloadCertificate } from "@/lib/certificate-generator";
import {
  CheckCircle, Shield, Lock, ArrowLeft, Download, CreditCard, Building, FileText,
} from "lucide-react";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const LEVEL_LABELS: Record<string, string> = {
  associate: "Associate",
  member: "Member",
  fellow: "Fellow",
};

const POST_NOMINALS: Record<string, string> = {
  associate: "ACIMArb",
  member: "MCIMArb",
  fellow: "FCIMArb",
};

// Default renewal fees per level (admin-configurable in future)
const RENEWAL_FEES: Record<string, number> = {
  associate: 3500,
  member: 5000,
  fellow: 7500,
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function RenewMembership() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState("paystack");
  const [isProcessing, setIsProcessing] = useState(false);
  const [renewalResult, setRenewalResult] = useState<any>(null);
  const paystackLoaded = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

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

  const { data: membership, isLoading } = useQuery({
    queryKey: ["membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: renewalHistory = [] } = useQuery({
    queryKey: ["renewal-history", membership?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewal_history" as any)
        .select("*")
        .eq("member_id", membership!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!membership?.id,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">No Active Membership</h1>
          <p className="text-muted-foreground mb-6">You don't have a CIMA membership to renew.</p>
          <a href="https://thecima.org/cima-qualification-pathways/" target="_blank" rel="noopener noreferrer">
          <Button>View Qualification Pathways</Button>
        </a>
        </div>
        <Footer />
      </div>
    );
  }

  const level = membership.membership_level;
  const renewalFee = RENEWAL_FEES[level] || 5000;
  const isExpired = membership.status === "expired";
  const postNominal = POST_NOMINALS[level] || membership.post_nominal || "";

  const processRenewal = async (method: string, paystackRef?: string) => {
    const today = new Date();
    const newExpiry = new Date(today);
    newExpiry.setDate(newExpiry.getDate() + 365);

    const todayStr = today.toISOString().split("T")[0];
    const expiryStr = newExpiry.toISOString().split("T")[0];

    // Update member record
    const { error: memberErr } = await (supabase as any)
      .from("members")
      .update({
        issue_date: todayStr,
        expiry_date: expiryStr,
        status: "active",
        renewal_count: (membership.renewal_count || 0) + 1,
      })
      .eq("id", membership.id);

    if (memberErr) throw memberErr;

    // Insert renewal history
    const { error: historyErr } = await (supabase as any)
      .from("renewal_history")
      .insert({
        member_id: membership.id,
        renewal_date: todayStr,
        new_expiry_date: expiryStr,
        amount_paid: renewalFee,
        currency: "GHS",
        payment_method: method,
        payment_reference: paystackRef || null,
        created_by: user?.id || null,
      });

    if (historyErr) throw historyErr;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["membership"] });
    queryClient.invalidateQueries({ queryKey: ["renewal-history"] });

    setRenewalResult({
      newIssueDate: todayStr,
      newExpiryDate: expiryStr,
      amount: renewalFee,
      method,
    });
  };

  const handlePayment = async () => {
    if (paymentMethod === "paystack") {
      if (!window.PaystackPop) {
        toast({ title: "Payment system loading, please wait...", variant: "destructive" });
        return;
      }
      setIsProcessing(true);
      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: membership.email,
        amount: renewalFee * 100,
        currency: "GHS",
        metadata: {
          member_id: membership.member_id,
          type: "membership_renewal",
        },
        callback: async (response: any) => {
          try {
            await processRenewal("paystack", response.reference);
            toast({ title: "Membership renewed successfully!" });
          } catch (err: any) {
            toast({ title: "Renewal failed", description: err.message, variant: "destructive" });
          }
          setIsProcessing(false);
        },
        onClose: () => {
          setIsProcessing(false);
          toast({ title: "Payment cancelled", variant: "destructive" });
        },
      });
      handler.openIframe();
    } else {
      // Bank transfer
      setIsProcessing(true);
      try {
        // Don't update status yet — admin confirms manually
        const today = new Date();
        const newExpiry = new Date(today);
        newExpiry.setDate(newExpiry.getDate() + 365);
        const todayStr = today.toISOString().split("T")[0];
        const expiryStr = newExpiry.toISOString().split("T")[0];

        await (supabase as any)
          .from("renewal_history")
          .insert({
            member_id: membership.id,
            renewal_date: todayStr,
            new_expiry_date: expiryStr,
            amount_paid: renewalFee,
            currency: "GHS",
            payment_method: "bank_transfer",
            notes: "Pending bank transfer confirmation",
            created_by: user?.id || null,
          });

        setRenewalResult({
          newIssueDate: todayStr,
          newExpiryDate: expiryStr,
          amount: renewalFee,
          method: "bank_transfer",
          pending: true,
        });
        toast({ title: "Renewal request submitted" });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
      setIsProcessing(false);
    }
  };

  const handleDownloadNewCert = async () => {
    if (!renewalResult) return;
    await downloadCertificate({
      fullName: membership.full_name,
      membershipLevel: level,
      memberId: membership.member_id,
      issueDate: renewalResult.newIssueDate,
      expiryDate: renewalResult.newExpiryDate,
    });
  };

  // CONFIRMATION SCREEN
  if (renewalResult) {
    const isPaid = renewalResult.method === "paystack";
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold">
              {isPaid
                ? `Membership Renewed, ${membership.full_name.split(" ")[0]}!`
                : "Renewal Request Submitted"}
            </h1>

            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member ID</span>
                  <span className="font-mono font-bold">{membership.member_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium">{postNominal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">New Issue Date</span>
                  <span className="font-medium">{formatDate(renewalResult.newIssueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span className="font-medium">{formatDate(renewalResult.newExpiryDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={isPaid ? "default" : "secondary"}>
                    {isPaid ? `GHS ${renewalResult.amount.toLocaleString()} — Confirmed` : "Pending Bank Transfer"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {!isPaid && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4 text-sm text-amber-900">
                  <p className="font-semibold mb-2">Complete your payment:</p>
                  <p>MoMo No: 0241022964</p>
                  <p>Stanbic Bank, Accra Main — Account No: 9040012902985</p>
                  <p className="mt-2">Reference your full name and Member ID when paying.</p>
                  <p className="mt-2">Your membership will be renewed once payment is confirmed by CIMA.</p>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              {isPaid && (
                <Button onClick={handleDownloadNewCert}>
                  <Download className="w-4 h-4 mr-2" /> Download New Certificate
                </Button>
              )}
              <Button variant="outline" onClick={() => setLocation("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // RENEWAL SUMMARY
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <Button variant="ghost" onClick={() => setLocation("/dashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-2">
          {isExpired ? "Reinstate Your Membership" : "Renew Your Membership"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isExpired
            ? "Your membership has expired. Renew to reinstate your post-nominals and panel listing."
            : "Extend your CIMA membership for another 12 months."}
        </p>

        {/* Member Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Member</p>
                <p className="font-semibold">{membership.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member ID</p>
                <p className="font-mono font-bold">{membership.member_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level</p>
                <p className="font-medium">{LEVEL_LABELS[level]} ({postNominal})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Expiry</p>
                <p className="font-medium">{membership.expiry_date ? formatDate(membership.expiry_date) : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's Included */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What's included in your renewal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              "Membership extended for 12 months",
              "New certificate issued with updated dates",
              isExpired ? "Post-nominals reinstated" : "Post-nominals maintained",
              "Panel listing maintained",
              "Access to member resources and network",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fee */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Renewal Fee</p>
              <p className="text-2xl font-bold text-primary">GHS {renewalFee.toLocaleString()}</p>
            </div>
            <Badge variant="outline" className="text-primary border-primary text-lg px-4 py-1">
              {postNominal}
            </Badge>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="paystack" id="paystack" />
                <Label htmlFor="paystack" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-4 h-4" />
                  Pay by Card / Mobile Money (Paystack — GHS)
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                <RadioGroupItem value="bank_transfer" id="bank" />
                <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Building className="w-4 h-4" />
                  Pay via Bank Transfer / Cheque (admin confirms)
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          onClick={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            "Processing..."
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              {paymentMethod === "paystack" ? "Pay & Renew Now" : "Submit Renewal Request"}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" /> Secured by {paymentMethod === "paystack" ? "Paystack" : "CIMA"}
        </p>

        {/* Renewal History */}
        {renewalHistory.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Renewal History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {renewalHistory.map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">Renewal #{renewalHistory.length - i}</p>
                      <p className="text-muted-foreground">{formatDate(r.renewal_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{r.currency} {Number(r.amount_paid).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.payment_method?.replace("_", " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}

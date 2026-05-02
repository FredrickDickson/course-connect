/**
 * Membership Renewal Page
 * Shows renewal summary, payment options, and confirmation
 * Implements tiered pricing based on World Bank income classifications
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatPrice, type Currency } from "../../../shared/renewal-pricing";
import {
  CheckCircle, Shield, Lock, ArrowLeft, CreditCard, Building, FileText, Mail, AlertTriangle,
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

const PART_LABELS: Record<string, string> = {
  associate: "Part I (Associate)",
  member: "Part II (Member)",
  fellow: "Part III (Fellow)",
};

interface PricingData {
  income_tier: string;
  membership_level: string;
  country_code: string;
  country_name: string;
  default_currency: Currency;
  available_currencies: Currency[];
  is_late: boolean;
  renewal_anniversary: string;
  organization: {
    id: string;
    name: string;
    discount_percentage: number;
  } | null;
  pricing_options: Array<{
    currency: Currency;
    baseAmount: number;
    lateSurcharge: number;
    totalAmount: number;
    discountAmount: number;
    discountPercentage: number;
    isLate: boolean;
  }>;
}

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
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
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

  // Fetch tier-based pricing
  const { data: pricingData, isLoading: pricingLoading } = useQuery<PricingData>({
    queryKey: ["renewal-pricing", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/renewal/pricing?user_id=${user!.id}`);
      if (!response.ok) throw new Error("Failed to fetch pricing");
      const result = await response.json();
      return result.data;
    },
    enabled: !!user,
  });

  // Set default currency when pricing data loads
  useEffect(() => {
    if (pricingData && !selectedCurrency) {
      setSelectedCurrency(pricingData.default_currency);
    }
  }, [pricingData, selectedCurrency]);

  if (authLoading || isLoading || pricingLoading) {
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

  const level = membership.part;
  
  // Get pricing for selected currency
  const selectedPricing = pricingData?.pricing_options.find(p => p.currency === selectedCurrency);
  const renewalFee = selectedPricing?.totalAmount || 0;
  const isExpired = membership.status === "expired";
  const postNominal = POST_NOMINALS[level] || membership.post_nominal || "";
  
  // Get tier info
  const incomeTier = pricingData?.income_tier || 'LOWER_MIDDLE_INCOME';
  const isLate = pricingData?.is_late || false;
  const organization = pricingData?.organization;

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
        income_tier: incomeTier,
      })
      .eq("id", membership.id);

    if (memberErr) throw memberErr;

    // Insert renewal history with tier information
    const { error: historyErr } = await (supabase as any)
      .from("renewal_history")
      .insert({
        member_id: membership.id,
        renewal_date: todayStr,
        new_expiry_date: expiryStr,
        amount_paid: selectedPricing?.baseAmount || renewalFee,
        currency: selectedCurrency,
        payment_method: method,
        payment_reference: paystackRef || null,
        created_by: user?.id || null,
        income_tier: incomeTier,
        currency_used: selectedCurrency,
        base_amount: selectedPricing?.baseAmount || renewalFee,
        surcharge_amount: selectedPricing?.lateSurcharge || 0,
        discount_amount: selectedPricing?.discountAmount || 0,
        discount_percentage: selectedPricing?.discountPercentage || 0,
        is_late: isLate,
      });

    if (historyErr) throw historyErr;

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["membership"] });
    queryClient.invalidateQueries({ queryKey: ["renewal-history"] });
    queryClient.invalidateQueries({ queryKey: ["renewal-pricing"] });

    setRenewalResult({
      newIssueDate: todayStr,
      newExpiryDate: expiryStr,
      amount: renewalFee,
      currency: selectedCurrency,
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
        currency: selectedCurrency,
        metadata: {
          member_id: membership.member_id,
          type: "renewal",
          full_name: membership.full_name,
          membership_level: level,
          email: membership.email,
          currency: selectedCurrency,
          income_tier: incomeTier,
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
            amount_paid: selectedPricing?.baseAmount || renewalFee,
            currency: selectedCurrency,
            payment_method: "bank_transfer",
            notes: "Pending bank transfer confirmation",
            created_by: user?.id || null,
          });

        setRenewalResult({
          newIssueDate: todayStr,
          newExpiryDate: expiryStr,
          amount: renewalFee,
          currency: selectedCurrency,
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


  // CONFIRMATION SCREEN
  if (renewalResult) {
    const isPaid = renewalResult.method === "paystack";
    const currency = renewalResult.currency || selectedCurrency;
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
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-500">Current Part</span>
                  <span className="font-bold text-gray-900">{PART_LABELS[level] || level}</span>
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
                    {isPaid ? `${formatPrice(renewalResult.amount, currency)} — Confirmed` : "Pending Bank Transfer"}
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
                <Card className="bg-blue-50 border-blue-200 max-w-md">
                  <CardContent className="p-4 text-sm text-blue-900">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">Certificate on the way!</p>
                        <p>Your renewed certificate will be emailed to {membership.email} within a few minutes.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[/* eslint-disable @typescript-eslint/no-unused-vars */
                { label: "Part I", value: "associate", post: "ACIMArb" },
                { label: "Part II", value: "member", post: "MCIMArb" },
                { label: "Part III", value: "fellow", post: "FCIMArb" },
              ].map((p) => (
                <div
                  key={p.value}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    level === p.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-muted bg-muted/20 opacity-40"
                  }`}
                >
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">{p.label}</p>
                  <p className="text-lg font-bold text-gray-900">{p.post}</p>
                </div>
              ))}
            </div>
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
              "New certificate emailed to you within minutes",
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

        {/* Tier Information */}
        {pricingData && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">
                    {incomeTier === 'HIGH_INCOME' ? 'High-Income Jurisdiction' : 'Lower-Middle-Income Jurisdiction'}
                  </p>
                  <p className="text-sm text-blue-800">
                    Your renewal fee is based on World Bank income classification for {pricingData.country_name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Late Renewal Warning */}
        {isLate && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>Late Renewal:</strong> Your renewal is past the deadline. A 15% administrative surcharge has been applied.
            </AlertDescription>
          </Alert>
        )}

        {/* Organization Discount */}
        {organization && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900">Organization Discount Applied</p>
                  <p className="text-sm text-green-800">{organization.name} — {organization.discount_percentage}% discount</p>
                </div>
                <Badge className="bg-green-600 text-white">
                  -{organization.discount_percentage}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currency Selector */}
        {pricingData && pricingData.available_currencies.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Select Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as Currency)} className="space-y-3">
                {pricingData.available_currencies.map((currency) => {
                  const pricing = pricingData.pricing_options.find(p => p.currency === currency);
                  return (
                    <div key={currency} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50">
                      <RadioGroupItem value={currency} id={`currency-${currency}`} />
                      <Label htmlFor={`currency-${currency}`} className="flex items-center justify-between cursor-pointer flex-1">
                        <span>{currency}</span>
                        <span className="font-semibold">{formatPrice(pricing?.totalAmount || 0, currency)}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Fee */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Renewal Fee</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(renewalFee, selectedCurrency)}</p>
              </div>
              <Badge variant="outline" className="text-primary border-primary text-lg px-4 py-1">
                {postNominal}
              </Badge>
            </div>
            
            {/* Price Breakdown */}
            {selectedPricing && (selectedPricing.lateSurcharge > 0 || selectedPricing.discountAmount > 0) && (
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Amount</span>
                  <span>{formatPrice(selectedPricing.baseAmount, selectedCurrency)}</span>
                </div>
                {selectedPricing.lateSurcharge > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Late Surcharge (15%)</span>
                    <span>+{formatPrice(selectedPricing.lateSurcharge, selectedCurrency)}</span>
                  </div>
                )}
                {selectedPricing.discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Organization Discount ({selectedPricing.discountPercentage}%)</span>
                    <span>-{formatPrice(selectedPricing.discountAmount, selectedCurrency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(selectedPricing.totalAmount, selectedCurrency)}</span>
                </div>
              </div>
            )}
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
                  Pay by Card / Mobile Money (Paystack — {selectedCurrency})
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

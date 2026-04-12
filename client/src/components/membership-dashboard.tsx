/**
 * Membership Dashboard Section
 * Shows certificate status, download, share, renewal, and upgrade prompts
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CertificatePreviewModal from "@/components/dashboard/certificate-preview-modal";
import {
  Award, Download, Share2, RefreshCw, ArrowRight, Shield, Clock, CheckCircle, AlertTriangle, XCircle, Eye,
} from "lucide-react";
import { Link } from "wouter";

const POST_NOMINALS: Record<string, string> = {
  associate: "ACIMArb",
  member: "MCIMArb",
  fellow: "FCIMArb",
};

const LEVEL_LABELS: Record<string, string> = {
  associate: "Associate",
  member: "Member",
  fellow: "Fellow",
};

const NEXT_LEVEL: Record<string, { level: string; label: string }> = {
  associate: { level: "member", label: "MCIMArb" },
  member: { level: "fellow", label: "FCIMArb" },
};

function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft?: number }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    case "expiring":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          <AlertTriangle className="h-3 w-3 mr-1" /> Expiring in {daysLeft} days
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="h-3 w-3 mr-1" /> Expired
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
  }
}

export default function MembershipDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading membership status...
        </CardContent>
      </Card>
    );
  }

  if (!membership) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-1">No Active Membership</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Join the CIMA community and earn your professional designation.
          </p>
          <Link href="/qualification-pathway">
            <Button variant="default">
              View Qualification Pathways <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const daysLeft = membership.expiry_date ? getDaysUntilExpiry(membership.expiry_date) : null;
  const nextLevel = NEXT_LEVEL[membership.membership_level];

  const handleDownload = async () => {
    try {
      toast({ title: "Generating certificate..." });
      await downloadCertificate({
        fullName: membership.full_name,
        membershipLevel: membership.membership_level as "associate" | "member" | "fellow",
        memberId: membership.member_id,
        issueDate: membership.issue_date || new Date().toISOString(),
        expiryDate: membership.expiry_date || new Date().toISOString(),
      });
      toast({ title: "Certificate downloaded" });
    } catch (err) {
      console.error("Certificate download error:", err);
      toast({ 
        title: "Failed to generate certificate", 
        description: "Please try again or use the print option from your certificate page.",
        variant: "destructive" 
      });
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/verify/${membership.member_id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Verification link copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            CIMA Membership
          </CardTitle>
          <StatusBadge status={membership.status} daysLeft={daysLeft ?? undefined} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Level & Post-Nominal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Membership Level</p>
            <p className="text-lg font-semibold">
              {LEVEL_LABELS[membership.membership_level] || membership.membership_level}
            </p>
          </div>
          <Badge variant="outline" className="text-primary border-primary font-bold text-base px-3 py-1">
            {POST_NOMINALS[membership.membership_level] || membership.post_nominal}
          </Badge>
        </div>

        {/* Member ID & Expiry */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Member ID</p>
            <p className="font-mono font-bold">{membership.member_id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium">
              {membership.expiry_date
                ? new Date(membership.expiry_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })
                : "—"}
            </p>
            {daysLeft !== null && daysLeft > 0 && daysLeft <= 60 && (
              <p className="text-xs text-amber-600 font-medium">{daysLeft} days remaining</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {membership.status !== "pending" && (
            <>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Download Certificate
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
            </>
          )}
          {(membership.status === "expiring" || membership.status === "expired") && (
            <Link href="/renew-membership">
              <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                <RefreshCw className="h-4 w-4 mr-1" /> {membership.status === "expired" ? "Renew to Reinstate" : "Renew Now"}
              </Button>
            </Link>
          )}
        </div>

        {/* Upgrade prompt */}
        {nextLevel && membership.status === "active" && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-amber-800">
              Ready to progress to <span className="font-bold">{nextLevel.label}</span>?{" "}
              <Link href="/qualification-pathway" className="underline font-semibold">
                View requirements →
              </Link>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

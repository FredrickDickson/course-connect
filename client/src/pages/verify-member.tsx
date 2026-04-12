/**
 * Public Certificate Verification Page
 * Accessible without login — allows employers, courts, and institutions to verify credentials.
 */
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Shield, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
const cimaLogo = "/images/cima_logo.png";

interface MemberVerification {
  full_name: string;
  membership_level: string;
  status: string;
  issue_date: string;
  expiry_date: string;
  member_id: string;
  post_nominal: string;
}

const LEVEL_LABEL: Record<string, string> = {
  associate: "Associate Member (ACIMArb)",
  member: "Member (MCIMArb)",
  fellow: "Fellow (FCIMArb)",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function VerifyMember() {
  const [, params] = useRoute("/verify/:memberId");
  const memberId = params?.memberId || "";
  const [member, setMember] = useState<MemberVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!memberId) return;
    (async () => {
      const { data, error } = await supabase
        .from("members" as any)
        .select("full_name, membership_level, status, issue_date, expiry_date, member_id, post_nominal")
        .eq("member_id", memberId)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setMember(data as unknown as MemberVerification);
      }
      setLoading(false);
    })();
  }, [memberId]);

  const isValid = member && member.expiry_date && new Date(member.expiry_date) >= new Date();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={cimaLogo} alt="CIMA" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-bold text-center mb-2 font-serif text-gray-900">
          Certificate Verification
        </h1>
        <p className="text-sm text-center text-gray-500 mb-8">
          The Center for International Mediators and Arbitrators
        </p>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {notFound && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-red-800">Member Not Found</h2>
              <p className="text-red-600 text-sm mt-1">
                No member was found with ID <span className="font-mono font-bold">{memberId}</span>.
                Please check the ID and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {member && !loading && (
          <Card className={isValid ? "border-green-200" : "border-red-200"}>
            <CardContent className="pt-6">
              {/* Status badge */}
              <div className="flex justify-center mb-4">
                {isValid ? (
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">✓ VALID</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-full">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">✗ EXPIRED</span>
                  </div>
                )}
              </div>

              <div className="space-y-4 mt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Member Name</p>
                  <p className="text-xl font-semibold text-gray-900">{member.full_name}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500">Membership Level</p>
                  <p className="text-lg font-medium text-primary">
                    {LEVEL_LABEL[member.membership_level] || member.membership_level}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center border-t pt-4">
                  <div>
                    <p className="text-xs text-gray-500">Issue Date</p>
                    <p className="font-medium text-sm">{member.issue_date ? formatDate(member.issue_date) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expiry Date</p>
                    <p className="font-medium text-sm">{member.expiry_date ? formatDate(member.expiry_date) : "—"}</p>
                  </div>
                </div>

                <div className="text-center border-t pt-4">
                  <p className="text-xs text-gray-500">Member ID</p>
                  <p className="font-mono font-bold text-lg">{member.member_id}</p>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-500 leading-relaxed">
                  This certificate was issued by the Center for International Mediators and Arbitrators,
                  Registered in England & Wales (No. 16140063).
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

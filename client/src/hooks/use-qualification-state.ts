import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PathwayOption {
  type: "STANDARD" | "EXPEDITED";
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  name: string;
  postNominal: string;
  description: string;
  duration: string;
  format: string;
  assessment: string;
  action: "enroll" | "apply" | "apply_expedited";
  eligibility: string;
  outcome: string;
  modules?: string[];
  requirements?: string[];
  isRecommended?: boolean;
  recommendationReason?: string;
}

interface EligibilityCheck {
  canApply: boolean;
  reason?: string;
  eligibilityType?: string;
}

interface QualificationState {
  userLevel: string;
  pathways: {
    arbitration: PathwayOption[];
    mediation: PathwayOption[];
  };
  eligibilityChecks: {
    member: EligibilityCheck;
    fellow: EligibilityCheck;
  };
  loading: boolean;
  error: string | null;
}

export function useQualificationState(): QualificationState & {
  refetch: () => void;
} {
  const [state, setState] = useState<QualificationState>({
    userLevel: "NONE",
    pathways: { arbitration: [], mediation: [] },
    eligibilityChecks: { member: { canApply: false }, fellow: { canApply: false } },
    loading: true,
    error: null,
  });

  const fetchQualificationState = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      // For now, return mock data until API endpoints are implemented
      // TODO: Replace with actual API calls when backend is ready
      const mockPathways = {
        arbitration: [
          {
            type: "STANDARD" as const,
            level: "ASSOCIATE" as const,
            name: "Associate (ACIMArb)",
            postNominal: "ACIMArb",
            description: "Foundation course in arbitration",
            duration: "2–3 days",
            format: "In-person / Virtual",
            assessment: "Multiple choice",
            action: "enroll" as const,
            eligibility: "All professionals (law/non-law), no prior ADR training required",
            outcome: "Certificate of Completion, eligible for ACIMArb, progress to Member level",
            isRecommended: true,
            recommendationReason: "Best starting point for your arbitration career",
          },
          {
            type: "EXPEDITED" as const,
            level: "MEMBER" as const,
            name: "Expedited Member (MCIMArb)",
            postNominal: "MCIMArb",
            description: "14-day assessment for experienced professionals",
            duration: "14 days",
            format: "Remote assessment",
            assessment: "Written assessment",
            action: "apply_expedited" as const,
            eligibility: "LL.M holders, ACIMArb members, or experienced legal professionals",
            outcome: "Certificate of Membership, eligible for FCIMArb",
            requirements: [
              "LL.M degree OR 3+ years legal experience",
              "Professional writing assessment",
              "Understanding of arbitration principles"
            ]
          }
        ],
        mediation: [
          {
            type: "STANDARD" as const,
            level: "ASSOCIATE" as const,
            name: "Associate (ACIMed)",
            postNominal: "ACIMed",
            description: "Foundation course in mediation",
            duration: "3 days",
            format: "In-person / Virtual",
            assessment: "Multiple choice assessment",
            action: "enroll" as const,
            eligibility: "Open to all professionals, no prior mediation training required",
            outcome: "Certificate of Completion, eligible for ACIMed designation",
          }
        ]
      };

      setState({
        userLevel: "NONE", // Would come from API
        pathways: mockPathways,
        eligibilityChecks: {
          member: { canApply: true, eligibilityType: "EXPERIENCED_LEGAL" },
          fellow: { canApply: false, reason: "Must complete Member level first" },
        },
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error("Error fetching qualification state:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load qualification data"
      }));
    }
  };

  useEffect(() => {
    fetchQualificationState();
  }, []);

  return {
    ...state,
    refetch: fetchQualificationState,
  };
}

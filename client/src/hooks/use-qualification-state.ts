import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getEligibility,
  getQualificationState,
  getTrackPathways,
  type ApiPathwayOption,
} from "@/lib/qualification-api";
import type {
  PathwayOption,
  PathwayEligibilityMap,
  Track,
  TrackLevel,
  EnrollmentLevel,
  PathwayType,
} from "@/types/qualification";

type TrackPathways = Record<Track, PathwayOption[]>;
type TrackEligibilityMap = Record<Track, PathwayEligibilityMap>;

interface QualificationHookState {
  loading: boolean;
  error: string | null;
  hasSession: boolean;
  userLevel: Record<Track, TrackLevel>;
  pathways: TrackPathways;
  eligibilityChecks: TrackEligibilityMap;
}

const TRACKS: Track[] = ["ARBITRATION", "MEDIATION"];

const EMPTY_ELIGIBILITY: TrackEligibilityMap = {
  ARBITRATION: {
    member: { canApply: false },
    fellow: { canApply: false },
  },
  MEDIATION: {
    member: {
      canApply: false,
      reason: "Expedited routes are not available on the Mediation track.",
    },
    fellow: {
      canApply: false,
      reason: "Expedited routes are not available on the Mediation track.",
    },
  },
};

const INITIAL_STATE: QualificationHookState = {
  loading: true,
  error: null,
  hasSession: false,
  userLevel: {
    ARBITRATION: "NONE",
    MEDIATION: "NONE",
  },
  pathways: {
    ARBITRATION: [],
    MEDIATION: [],
  },
  eligibilityChecks: EMPTY_ELIGIBILITY,
};

const PATHWAY_LIBRARY: Record<Track, Record<string, Partial<PathwayOption>>> = {
  ARBITRATION: {
    "STANDARD_ASSOCIATE": {
      postNominal: "ACIMArb",
      description: "Foundation course covering arbitration law, practice, and procedure.",
      duration: "2–3 days",
      format: "In-person / Virtual",
      assessment: "Multiple choice assessment",
      eligibility: "Open to all professionals — no prior ADR training required.",
      outcome: "Certificate of Completion, eligible for ACIMArb post-nominal.",
      modules: [
        "Introduction to Arbitration & ADR",
        "Arbitration Agreements",
        "Domestic & International Legal Framework",
        "Arbitration Proceedings and Practice",
        "Recognition and Enforcement of Foreign Awards",
        "Mock Arbitrations & Workshops",
      ],
    },
    "STANDARD_MEMBER": {
      postNominal: "MCIMArb",
      description: "Applied practice track diving deeper into complex arbitral work.",
      duration: "3–5 days",
      format: "In-person / Virtual",
      assessment: "Written or exemption exam",
      eligibility: "ACIMArb (or equivalent) plus legal/ADR training.",
      outcome: "Certificate of Membership, progress toward FCIMArb.",
      modules: [
        "Arbitration Case Management",
        "Ethics, Cybersecurity & AI in ADR",
        "Mediation Law and Practice",
        "Cross-border Arbitral Practice",
        "Mock Arbitrations & Mediations",
      ],
    },
    "STANDARD_FELLOW": {
      postNominal: "FCIMArb",
      description: "Mastery level culminating in dissertation and award-writing.",
      duration: "5-day intensive + dissertation (2–8 weeks)",
      format: "Hybrid",
      assessment: "Take-home award writing + peer interview",
      eligibility: "MCIMArb or equivalent plus senior practice experience.",
      outcome: "FCIMArb designation, listing on CIMA panels.",
      modules: [
        "Advanced Award Writing",
        "Settlement & Consent Awards",
        "Dissertation Guidance",
        "Emerging Markets Practice",
        "Peer Interview & Portfolio Review",
      ],
    },
    "EXPEDITED_MEMBER": {
      postNominal: "MCIMArb",
      description: "14-day expedited assessment for LL.M holders and seasoned professionals.",
      duration: "14-day remote assessment",
      format: "Self-paced (remote)",
      assessment: "Scenario-based written submission",
      eligibility: "LL.M degree, ACIMArb status, or 3+ years ADR/legal experience.",
      outcome: "MCIMArb credential upon approval.",
      requirements: [
        "Upload CV / professional résumé",
        "Provide qualifications summary",
        "Detail ADR or legal case experience",
      ],
    },
    "EXPEDITED_FELLOW": {
      postNominal: "FCIMArb",
      description: "48-hour award-writing challenge for senior arbitrators.",
      duration: "48-hour remote submission",
      format: "Self-paced (remote)",
      assessment: "Award writing exam + portfolio review",
      eligibility: "MCIMArb plus 7+ years ADR or 10+ years legal experience.",
      outcome: "FCIMArb credential, panel listing, and mentoring eligibility.",
      requirements: [
        "Professional portfolio",
        "Award-writing samples",
        "Documented case experience",
      ],
    },
  },
  MEDIATION: {
    "STANDARD_ASSOCIATE": {
      postNominal: "ACIMed",
      description: "Foundation course in mediation law, skills, and simulations.",
      duration: "3 days",
      format: "In-person / Virtual",
      assessment: "Multiple choice assessment",
      eligibility: "Open to all professionals, no prior mediation experience required.",
      outcome: "Certificate of Completion, ACIMed designation.",
      modules: [
        "Introduction to Mediation",
        "Mediation Skills & Techniques",
        "Negotiation Theory",
        "Conflict Resolution",
        "Simulated Mediation Exercises",
      ],
    },
    "STANDARD_MEMBER": {
      postNominal: "MCIMed",
      description: "Advanced mediation practice with supervised simulations.",
      duration: "5 days",
      format: "In-person / Virtual",
      assessment: "Simulated mediation + written assessment",
      eligibility: "ACIMed completion required.",
      outcome: "Certificate of Membership, progress toward FCIMed.",
      modules: [
        "Advanced Mediation Techniques",
        "Cross-Cultural Mediation",
        "Commercial & Family Mediation",
        "Online Dispute Resolution",
        "Capstone Simulations",
      ],
    },
    "STANDARD_FELLOW": {
      postNominal: "FCIMed",
      description: "Fellowship pathway with dissertation and supervised practice.",
      duration: "6–8 days + dissertation",
      format: "Hybrid",
      assessment: "Dissertation + supervised mediation practice",
      eligibility: "MCIMed plus 20 mediations or 10 years mediation experience.",
      outcome: "FCIMed designation, panel eligibility.",
      modules: [
        "Dispute Systems Design",
        "Mediation Advocacy",
        "Restorative Justice",
        "Research & Dissertation",
        "Supervised Practice",
      ],
    },
  },
};

const RECOMMENDATION_COPY: Record<EnrollmentLevel, string> = {
  ASSOCIATE: "Start at Associate to unlock the rest of the pathway.",
  MEMBER: "Advance to Member to qualify for Fellowship.",
  FELLOW: "Complete the Fellowship to reach mastery status.",
};

const POST_NOMINALS: Record<Track, Record<EnrollmentLevel, string>> = {
  ARBITRATION: {
    ASSOCIATE: "ACIMArb",
    MEMBER: "MCIMArb",
    FELLOW: "FCIMArb",
  },
  MEDIATION: {
    ASSOCIATE: "ACIMed",
    MEMBER: "MCIMed",
    FELLOW: "FCIMed",
  },
};

export function useQualificationState() {
  const [state, setState] = useState<QualificationHookState>(INITIAL_STATE);

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setState({ ...INITIAL_STATE, loading: false });
      return;
    }

    try {
      const [qualificationState, eligibility, arbitrationPathways, mediationPathways] = await Promise.all([
        getQualificationState(),
        getEligibility(),
        getTrackPathways("ARBITRATION"),
        getTrackPathways("MEDIATION"),
      ]);

      if (!qualificationState || !eligibility || arbitrationPathways === null || mediationPathways === null) {
        throw new Error("Unable to load qualification data");
      }

      const userLevel = extractUserLevels(qualificationState);
      const arbitration = buildPathwayOptions("ARBITRATION", arbitrationPathways, userLevel.ARBITRATION);
      const mediation = buildPathwayOptions("MEDIATION", mediationPathways, userLevel.MEDIATION);

      setState({
        loading: false,
        error: null,
        hasSession: true,
        userLevel,
        pathways: {
          ARBITRATION: arbitration,
          MEDIATION: mediation,
        },
        eligibilityChecks: {
          ARBITRATION: deriveEligibilityChecks("ARBITRATION", arbitration),
          MEDIATION: deriveEligibilityChecks("MEDIATION", mediation),
        },
      });
    } catch (error) {
      console.error("Error fetching qualification data", error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load qualification data",
        hasSession: true,
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

function extractUserLevels(state: any): Record<Track, TrackLevel> {
  return {
    ARBITRATION: normalizeTrackLevel(state?.tracks?.arbitration?.level),
    MEDIATION: normalizeTrackLevel(state?.tracks?.mediation?.level),
  };
}

function normalizeTrackLevel(level?: string | null): TrackLevel {
  const normalized = level?.toString().toUpperCase();
  if (normalized === "STUDENT" || normalized === "ASSOCIATE" || normalized === "MEMBER" || normalized === "FELLOW") {
    return normalized as TrackLevel;
  }
  return "NONE";
}

function buildPathwayOptions(
  track: Track,
  apiPathways: ApiPathwayOption[],
  trackLevel: TrackLevel,
): PathwayOption[] {
  const nextStandardLevel = getNextStandardLevel(trackLevel);

  return apiPathways.map((pathway) => {
    const key = `${pathway.type}_${pathway.level}` as const;
    const details = PATHWAY_LIBRARY[track][key] ?? {};
    const isRecommended = pathway.type === "STANDARD" && nextStandardLevel === pathway.level;

    return {
      type: pathway.type,
      level: pathway.level,
      name: pathway.name,
      postNominal: details.postNominal ?? POST_NOMINALS[track][pathway.level],
      description: details.description ?? pathway.description,
      duration: details.duration ?? "Varies",
      format: details.format ?? "In-person / Virtual",
      assessment: details.assessment ?? "Assessment required",
      action: pathway.action,
      eligibility: details.eligibility ?? pathway.description,
      outcome: details.outcome ?? "",
      modules: details.modules,
      requirements: details.requirements,
      isRecommended,
      recommendationReason: isRecommended ? RECOMMENDATION_COPY[pathway.level] : undefined,
    };
  });
}

function getNextStandardLevel(level: TrackLevel): EnrollmentLevel | null {
  switch (level) {
    case "NONE":
    case "STUDENT":
      return "ASSOCIATE";
    case "ASSOCIATE":
      return "MEMBER";
    case "MEMBER":
      return "FELLOW";
    default:
      return null;
  }
}

function deriveEligibilityChecks(track: Track, pathways: PathwayOption[]): PathwayEligibilityMap {
  if (track === "MEDIATION") {
    return {
      member: {
        canApply: false,
        reason: "Expedited routes are not available on the Mediation track.",
      },
      fellow: {
        canApply: false,
        reason: "Expedited routes are not available on the Mediation track.",
      },
    };
  }

  const memberExpedited = pathways.find((p) => p.type === "EXPEDITED" && p.level === "MEMBER");
  const fellowExpedited = pathways.find((p) => p.type === "EXPEDITED" && p.level === "FELLOW");

  return {
    member: memberExpedited
      ? { canApply: true, reason: memberExpedited.description }
      : {
          canApply: false,
          reason: "Meet the Associate prerequisites or experience threshold to unlock expedited review.",
        },
    fellow: fellowExpedited
      ? { canApply: true, reason: fellowExpedited.description }
      : {
          canApply: false,
          reason: "You must hold MCIMArb and meet senior experience requirements.",
        },
  };
}

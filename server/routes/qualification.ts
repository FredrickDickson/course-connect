/**
 * Qualification Pathway Routes
 * Handles qualification status, expedited applications, eligibility checks, certificates, and fellowship applications
 * Updated for multi-track system (Arbitration and Mediation)
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
import {
  getQualificationStatus,
  getAvailablePathways,
  createExpeditedApplication,
  getUserExpeditedApplications,
  getExpeditedApplicationById,
  hasPendingApplication,
  uploadApplicationDocument,
  submitQualificationAssessment,
  updateUserQualificationLevel,
  getAllExpeditedApplications,
  updateExpeditedApplicationStatus,
  getAllFellowshipApplications,
  updateFellowshipApplicationStatus,
  getExpeditedPricing,
  attachPaymentReference,
} from "../storage/qualification";
import {
  getUserQualificationState,
  getEligibilityState,
  canTakeCourse,
  canApplyExpeditedMember,
  canApplyExpeditedFellow,
  canApplyFellowship,
  getAvailablePathwaysForTrack,
} from "../storage/qualificationState";
import {
  createCertificate,
  getUserCertificates,
  getCertificateByNumber,
  revokeCertificate,
  updateCertificateUrl,
  getCertificateDataForPDF,
  getUserCertificateStats,
} from "../storage/certificates";
import {
  handleCourseCompletion,
  handleExpeditedApproval,
  handleFellowshipApproval,
  getUserProgressionHistory,
  checkUpgradeEligibility,
} from "../storage/progression";
import {
  saveProfessionalProfileDraft,
  getProfessionalProfileByUserId,
  listProfessionalProfiles,
  getProfessionalProfileById as fetchProfessionalProfileById,
  addProfessionalDocument,
  getProfessionalDocuments,
  deleteProfessionalDocument,
  updateProfessionalProfileReview,
  setUserAssignedLevel,
} from "../storage/professionalProfiles";
import type { ProfessionalProfileRecord } from "../storage/professionalProfiles";
import type { ProfessionalDocument } from "../../shared/schema";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireAdmin } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";
import {
  expeditedApplicationSchema,
  applicationDocumentSchema,
  qualificationAssessmentSchema,
  fellowshipApplicationSchema,
  studentMembershipSchema,
} from "../../shared/schema";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

type TrackType = "ARBITRATION" | "MEDIATION";
type ReviewStatusType = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";
type QualificationLevelType = "NONE" | "ASSOCIATE" | "MEMBER" | "FELLOW";
type DecisionLevelSource = "EXPEDITED" | "ADMIN" | "DEFAULT" | "MIGRATION";
type DocumentType = "CV" | "CERTIFICATE" | "LICENSE" | "PORTFOLIO" | "REFERENCE" | "AWARD" | "OTHER";

const TRACK_VALUES: TrackType[] = ["ARBITRATION", "MEDIATION"];
const REVIEW_STATUS_VALUES: ReviewStatusType[] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"];
const LEVEL_VALUES: QualificationLevelType[] = ["NONE", "ASSOCIATE", "MEMBER", "FELLOW"];
const DOCUMENT_TYPES: DocumentType[] = ["CV", "CERTIFICATE", "LICENSE", "PORTFOLIO", "REFERENCE", "AWARD", "OTHER"];

interface DecisionMapping {
  reviewStatus: ReviewStatusType;
  assignedLevel?: QualificationLevelType;
  levelSource?: DecisionLevelSource;
}

function normalizeTrack(value: unknown): TrackType {
  return value === "MEDIATION" ? "MEDIATION" : "ARBITRATION";
}

function isReviewStatus(value: unknown): value is ReviewStatusType {
  return typeof value === "string" && REVIEW_STATUS_VALUES.includes(value as ReviewStatusType);
}

function isQualificationLevel(value: unknown): value is QualificationLevelType {
  return typeof value === "string" && LEVEL_VALUES.includes(value as QualificationLevelType);
}

function isTrackType(value: unknown): value is TrackType {
  return typeof value === "string" && TRACK_VALUES.includes(value as TrackType);
}

function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && DOCUMENT_TYPES.includes(value as DocumentType);
}

function mapProfileSummary(profile: ProfessionalProfileRecord & { documents?: ProfessionalDocument[] }) {
  const experienceYears = Math.max(profile.yearsAdrExperience ?? 0, profile.yearsLegalExperience ?? 0);
  const confidenceScore = Math.min(100, Math.round((experienceYears / 10) * 100));
  const userName = [profile.user?.firstName, profile.user?.lastName].filter(Boolean).join(" ").trim();

  return {
    id: profile.id,
    userId: profile.userId,
    fullName: userName || profile.user?.email || "Unknown",
    email: profile.user?.email,
    country: profile.country ?? profile.user?.country,
    track: profile.track,
    yearsExperience: experienceYears,
    selfAssessedLevel: profile.selfAssessedLevel ?? "ASSOCIATE",
    assignedLevel: profile.assignedLevel,
    reviewStatus: profile.reviewStatus,
    submittedAt: profile.submittedAt,
    confidenceScore,
    documentsCount: profile.documents ? profile.documents.length : undefined,
  };
}

async function getReviewerDisplayName(reviewerId?: string | null) {
  if (!reviewerId) return undefined;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("first_name,last_name,email")
    .eq("id", reviewerId)
    .maybeSingle();

  if (error || !data) return undefined;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return name || data.email || undefined;
}

function buildProfileHistory(profile: ProfessionalProfileRecord, reviewer?: string) {
  const history = [] as Array<{
    id: string;
    status: string;
    assignedLevel?: string;
    note?: string | null;
    reviewer?: string;
    createdAt: string;
  }>;

  if (profile.submittedAt) {
    const submittedTimestamp = new Date(profile.submittedAt).toISOString();
    history.push({
      id: `${profile.id}-submitted`,
      status: "SUBMITTED",
      note: null,
      createdAt: submittedTimestamp,
    });
  }

  const currentTimestamp = new Date(profile.updatedAt ?? profile.createdAt ?? Date.now()).toISOString();
  history.push({
    id: `${profile.id}-current`,
    status: profile.reviewStatus,
    assignedLevel: profile.assignedLevel,
    note: profile.reviewNotes,
    reviewer,
    createdAt: currentTimestamp,
  });

  return history;
}

function mapDecisionAction(action?: string): DecisionMapping | null {
  switch (action) {
    case "REQUEST_INFO":
      return { reviewStatus: "MORE_INFO_REQUIRED" };
    case "REJECT":
      return { reviewStatus: "REJECTED" };
    case "ASSIGN_ASSOCIATE":
      return { reviewStatus: "APPROVED", assignedLevel: "ASSOCIATE", levelSource: "EXPEDITED" };
    case "ASSIGN_MEMBER":
      return { reviewStatus: "APPROVED", assignedLevel: "MEMBER", levelSource: "EXPEDITED" };
    case "ASSIGN_FELLOW":
      return { reviewStatus: "APPROVED", assignedLevel: "FELLOW", levelSource: "EXPEDITED" };
    default:
      return null;
  }
}

// ============================================================================
// QUALIFICATION STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/qualification/status
 * Get user's current qualification level and eligibility
 */
router.get(
  "/status",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const status = await getQualificationStatus(userId);

    if (!status) {
      return res.status(500).json({ error: "Failed to fetch qualification status" });
    }

    res.json(status);
  })
);

/**
 * GET /api/qualification/pathway
 * Get available pathways based on current status
 */
router.get(
  "/pathway",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const pathways = await getAvailablePathways(userId);
    res.json({ pathways });
  })
);

// ============================================================================
// PROFESSIONAL PROFILE ENDPOINTS
// ============================================================================

router.get(
  "/professional-profile",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const profile = await getProfessionalProfileByUserId(req.user.id, { includeDocuments: true });
    res.json(profile ?? null);
  }),
);

router.post(
  "/onboarding/experience",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { hasExperience, track } = req.body ?? {};
    if (typeof hasExperience !== "boolean") {
      return res.status(400).json({ error: "hasExperience boolean is required" });
    }

    const normalizedTrack = normalizeTrack(track);

    // Record the experience choice but don't assign any level
    // Users earn their level through course completion (Associate → Member → Fellow)
    // or through admin review (expedited path)
    return res.json({
      status: "experience_recorded",
      hasExperience,
      track: normalizedTrack,
    });
  }),
);

router.post(
  "/professional-profile",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      submit,
      track,
      contactEmail,
      contactPhone,
      country,
      timezone,
      linkedinUrl,
      websiteUrl,
      organization,
      jobTitle,
      yearsAdrExperience,
      yearsLegalExperience,
      practiceAreas,
      adrRoles,
      qualifications,
      credentials,
      narrativeSummary,
      selfAssessedLevel,
      submittedPayload,
    } = req.body ?? {};

    const payload = {
      track: normalizeTrack(track),
      contactEmail,
      contactPhone,
      country,
      timezone,
      linkedinUrl,
      websiteUrl,
      organization,
      jobTitle,
      yearsAdrExperience,
      yearsLegalExperience,
      practiceAreas,
      adrRoles,
      qualifications,
      credentials,
      narrativeSummary,
      selfAssessedLevel,
      submittedPayload,
    };

    const profile = await saveProfessionalProfileDraft(req.user.id, payload, { submit: Boolean(submit) });
    res.json(profile);
  }),
);

router.post(
  "/professional-profile/documents",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      documentType,
      fileUrl,
      originalName,
      storagePath,
      mimeType,
      fileSize,
      isPrimary,
      visibility,
    } = req.body ?? {};

    if (!documentType || !fileUrl) {
      return res.status(400).json({ error: "documentType and fileUrl are required" });
    }

    let profile = await getProfessionalProfileByUserId(req.user.id);
    if (!profile) {
      profile = await saveProfessionalProfileDraft(req.user.id, {}, { submit: false });
    }

    const normalizedDocTypeValue = String(documentType).toUpperCase();
    const normalizedDocType: DocumentType = isDocumentType(normalizedDocTypeValue)
      ? (normalizedDocTypeValue as DocumentType)
      : "OTHER";

    const document = await addProfessionalDocument(profile.id, req.user.id, {
      documentType: normalizedDocType,
      fileUrl,
      originalName,
      storagePath,
      mimeType,
      fileSize,
      isPrimary,
      visibility,
    });

    res.status(201).json(document);
  }),
);

router.delete(
  "/professional-profile/documents/:documentId",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;
    const profile = await getProfessionalProfileByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const { data: documentRow, error } = await supabaseAdmin
      .from("professional_documents")
      .select("profile_id")
      .eq("id", documentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!documentRow || documentRow.profile_id !== profile.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await deleteProfessionalDocument(documentId);
    res.status(204).send();
  }),
);

router.get(
  "/professional-profiles/stats",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [pendingRes, underReviewRes, decisionsRes] = await Promise.all([
      supabaseAdmin
        .from("professional_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_current", true)
        .eq("review_status", "DRAFT"),
      supabaseAdmin
        .from("professional_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_current", true)
        .eq("review_status", "UNDER_REVIEW"),
      supabaseAdmin
        .from("professional_profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_current", true)
        .gte("decision_at", startOfDay.toISOString()),
    ]);

    res.json({
      pending: pendingRes.count ?? 0,
      underReview: underReviewRes.count ?? 0,
      decisionsToday: decisionsRes.count ?? 0,
    });
  }),
);

router.get(
  "/professional-profiles",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reviewStatus, level, track, q, limit, offset } = req.query;

    const profiles = await listProfessionalProfiles({
      reviewStatus: isReviewStatus(reviewStatus) ? (reviewStatus as any) : undefined,
      assignedLevel: isQualificationLevel(level) ? (level as any) : undefined,
      track: isTrackType(track) ? (track as TrackType) : undefined,
      search: typeof q === "string" ? q : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
      offset: typeof offset === "string" ? Number(offset) : undefined,
    });

    res.json(profiles.map(mapProfileSummary));
  }),
);

router.get(
  "/professional-profiles/:id",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const profile = await fetchProfessionalProfileById(id);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const documents = await getProfessionalDocuments(profile.id);
    const reviewerName = await getReviewerDisplayName(profile.reviewerId);

    res.json({
      ...mapProfileSummary({ ...profile, documents }),
      experienceSummary: profile.narrativeSummary,
      qualificationsSummary: Array.isArray(profile.qualifications)
        ? profile.qualifications.map((q: any) => (typeof q === "string" ? q : JSON.stringify(q))).join(", ")
        : undefined,
      practiceAreas: profile.practiceAreas,
      adrRoles: profile.adrRoles,
      submittedPayload: profile.submittedPayload,
      documents: documents.map((doc) => ({
        id: doc.id,
        type: doc.documentType,
        fileUrl: doc.fileUrl,
        fileName: doc.originalName ?? doc.fileUrl,
        fileSize: doc.fileSize ?? undefined,
      })),
      history: buildProfileHistory(profile, reviewerName),
    });
  }),
);

router.post(
  "/professional-profiles/:id/decision",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { action, note } = req.body ?? {};

    const decision = mapDecisionAction(action);
    if (!decision) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const updated = await updateProfessionalProfileReview({
      profileId: id,
      reviewerId: req.user.id,
      reviewStatus: decision.reviewStatus,
      reviewNotes: note ?? null,
      assignedLevel: decision.assignedLevel,
      assignedLevelNotes: decision.assignedLevel ? note ?? null : undefined,
      levelSource: decision.levelSource,
    });

    res.json(mapProfileSummary(updated));
  }),
);

// ============================================================================
// EXPEDITED APPLICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/expedited/apply
 * Submit expedited application
 */
router.post(
  "/expedited/apply",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const {
      track,
      targetLevel,
      experienceSummary,
      qualificationsSummary,
      cvUrl,
    } = req.body ?? {};

    const normalizedTrack: "ARBITRATION" | "MEDIATION" =
      track === "MEDIATION" ? "MEDIATION" : "ARBITRATION";

    if (normalizedTrack === "MEDIATION") {
      return res.status(403).json({
        error: "Mediation track applications must use the standard progression",
      });
    }

    if (targetLevel !== "MEMBER" && targetLevel !== "FELLOW") {
      return res.status(400).json({ error: "Invalid targetLevel" });
    }

    // Enforce server-side eligibility
    const eligibility =
      targetLevel === "MEMBER"
        ? await canApplyExpeditedMember(userId, normalizedTrack)
        : await canApplyExpeditedFellow(userId, normalizedTrack);

    if (!eligibility.canApply) {
      return res.status(403).json({
        error: "Not eligible for this expedited pathway",
        reason: eligibility.reason,
      });
    }

    // Block duplicate pending applications for the same level
    const hasPending = await hasPendingApplication(userId, targetLevel);
    if (hasPending) {
      return res.status(409).json({
        error: "You already have an open application for this level",
      });
    }

    // Create application in DRAFT — will move to submitted after payment webhook
    const application = await createExpeditedApplication({
      userId,
      track: normalizedTrack,
      targetLevel,
      status: "draft",
      experienceSummary,
      qualificationsSummary,
      cvUrl,
    });

    if (!application) {
      return res.status(500).json({ error: "Failed to create application" });
    }

    res.status(201).json(application);
  })
);

/**
 * POST /api/expedited/applications/:id/pay
 * Initialize a Paystack transaction for an expedited application.
 * Returns the Paystack authorization_url the client should redirect to.
 */
router.post(
  "/expedited/applications/:id/pay",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        error: "Payment system is not configured",
      });
    }

    const application = await getExpeditedApplicationById(id);
    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }
    if (application.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (
      application.status !== "draft" &&
      application.status !== "payment_pending"
    ) {
      return res.status(400).json({
        error: `Application is already in status ${application.status}`,
      });
    }

    const pricing = await getExpeditedPricing(
      application.track,
      application.targetLevel
    );
    if (!pricing) {
      return res.status(500).json({ error: "Pricing not configured" });
    }

    // Look up the user's email for Paystack
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (!userRow?.email) {
      return res
        .status(400)
        .json({ error: "User email required for payment" });
    }

    const reference = `expedited_${id}_${Date.now()}`;
    const callbackUrl = `${
      process.env.VITE_APP_URL || `${req.protocol}://${req.get("host")}`
    }/payment-success?expedited=1`;

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userRow.email,
          amount: pricing.amountMinor,
          currency: pricing.currency,
          reference,
          callback_url: callbackUrl,
          metadata: {
            expeditedApplicationId: id,
            userId,
            track: application.track,
            targetLevel: application.targetLevel,
            sku: pricing.sku,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackData?.status) {
      console.error("Paystack init failed:", paystackData);
      return res.status(502).json({
        error: "Payment initialization failed",
        details: paystackData?.message,
      });
    }

    await attachPaymentReference(id, reference);

    res.json({
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
    });
  })
);

/**
 * GET /api/expedited/applications
 * Get user's expedited applications
 */
router.get(
  "/expedited/applications",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const applications = await getUserExpeditedApplications(userId);
    res.json(applications);
  })
);

/**
 * GET /api/expedited/applications/:id
 * Get specific application details
 */
router.get(
  "/expedited/applications/:id",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Check if user owns the application or is admin
    if (application.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(application);
  })
);

/**
 * POST /api/expedited/applications/:id/documents
 * Upload supporting documents
 */
router.post(
  "/expedited/applications/:id/documents",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { documentType, fileUrl, fileName, fileSize } = req.body;

    // Validate input
    const validationResult = applicationDocumentSchema.safeParse({
      applicationId: id,
      documentType,
      fileUrl,
      fileName,
      fileSize,
    });

    if (!validationResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: validationResult.error });
    }

    // Check if application exists and belongs to user
    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      application.status !== "draft" &&
      application.status !== "payment_pending" &&
      application.status !== "pending"
    ) {
      return res.status(400).json({
        error: "Cannot add documents to an application that has been reviewed",
      });
    }

    // Create document
    const document = await uploadApplicationDocument({
      applicationId: id,
      documentType,
      fileUrl,
      fileName,
      fileSize,
    });

    if (!document) {
      return res.status(500).json({ error: "Failed to upload document" });
    }

    res.status(201).json(document);
  })
);

/**
 * POST /api/expedited/applications/:id/assessment
 * Submit assessment
 */
router.post(
  "/expedited/applications/:id/assessment",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { assessmentType, submissionContent } = req.body;

    // Validate input
    const validationResult = qualificationAssessmentSchema.safeParse({
      applicationId: id,
      assessmentType,
      submissionContent,
    });

    if (!validationResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: validationResult.error });
    }

    // Check if application exists and belongs to user
    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if assessment already exists and is completed
    if (application.assessments.length > 0 && application.assessments[0].completedAt) {
      return res
        .status(400)
        .json({ error: "Assessment already submitted" });
    }

    // Submit assessment
    const assessment = await submitQualificationAssessment({
      applicationId: id,
      assessmentType,
      submissionContent,
    });

    if (!assessment) {
      return res.status(500).json({ error: "Failed to submit assessment" });
    }

    res.status(201).json(assessment);
  })
);

// ============================================================================
// ADMIN REVIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/admin/expedited/applications
 * List all expedited applications (admin only)
 */
router.get(
  "/admin/expedited/applications",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, targetLevel } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (targetLevel) filters.targetLevel = targetLevel as string;

    const applications = await getAllExpeditedApplications(filters);
    res.json(applications);
  })
);

/**
 * POST /api/admin/expedited/applications/:id/approve
 * Approve an expedited application (admin only)
 */
router.post(
  "/admin/expedited/applications/:id/approve",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reviewComments, assessmentScore } = req.body;
    const reviewerId = req.user.id;

    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Update application status to approved
    const updated = await updateExpeditedApplicationStatus(
      id,
      "approved",
      reviewerId,
      reviewComments,
      assessmentScore
    );

    if (!updated) {
      return res.status(500).json({ error: "Failed to approve application" });
    }

    // Update user's qualification level
    const pathwayType = "EXPEDITED";
    const targetLevel = application.targetLevel;
    if (!targetLevel) {
      return res.status(400).json({ error: "Application has no target level" });
    }

    const levelUpdated = await updateUserQualificationLevel(
      application.userId as string,
      targetLevel as "MEMBER" | "FELLOW",
      pathwayType
    );

    if (!levelUpdated) {
      return res.status(500).json({ error: "Failed to update user level" });
    }

    res.json({
      message: "Application approved successfully",
      application: updated,
    });
  })
);

/**
 * POST /api/admin/expedited/applications/:id/reject
 * Reject an expedited application (admin only)
 */
router.post(
  "/admin/expedited/applications/:id/reject",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reviewComments } = req.body;
    const reviewerId = req.user.id;

    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    const updated = await updateExpeditedApplicationStatus(
      id,
      "rejected",
      reviewerId,
      reviewComments
    );

    if (!updated) {
      return res.status(500).json({ error: "Failed to reject application" });
    }

    res.json({
      message: "Application rejected successfully",
      application: updated,
    });
  })
);

/**
 * POST /api/admin/expedited/applications/:id/review
 * Add review comments to an application (admin only)
 */
router.post(
  "/admin/expedited/applications/:id/review",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reviewComments } = req.body;
    const reviewerId = req.user.id;

    const application = await getExpeditedApplicationById(id);

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    const updated = await updateExpeditedApplicationStatus(
      id,
      "under_review",
      reviewerId,
      reviewComments
    );

    if (!updated) {
      return res.status(500).json({ error: "Failed to update application" });
    }

    res.json({
      message: "Review comments added successfully",
      application: updated,
    });
  })
);

// ============================================================================
// MULTI-TRACK QUALIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /api/qualification/state
 * Get user's complete qualification state across all tracks
 */
router.get(
  "/state",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const state = await getUserQualificationState(userId);

    if (!state) {
      return res.status(500).json({ error: "Failed to fetch qualification state" });
    }

    res.json(state);
  })
);

/**
 * GET /api/qualification/eligibility
 * Get user's eligibility state across all tracks
 */
router.get(
  "/eligibility",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const eligibility = await getEligibilityState(userId);

    if (!eligibility) {
      return res.status(500).json({ error: "Failed to fetch eligibility" });
    }

    res.json(eligibility);
  })
);

/**
 * GET /api/qualification/pathways/:track
 * Get available pathways for a specific track
 */
router.get(
  "/pathways/:track",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { track } = req.params;

    if (track !== "ARBITRATION" && track !== "MEDIATION") {
      return res.status(400).json({ error: "Invalid track" });
    }

    const pathways = await getAvailablePathwaysForTrack(
      userId,
      track as "ARBITRATION" | "MEDIATION"
    );

    res.json({ pathways });
  })
);

/**
 * GET /api/qualification/course/:courseId/eligibility
 * Check if user can take a specific course
 */
router.get(
  "/course/:courseId/eligibility",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { courseId } = req.params;

    const result = await canTakeCourse(userId, courseId);
    res.json(result);
  })
);

// ============================================================================
// CERTIFICATE ENDPOINTS
// ============================================================================

/**
 * GET /api/certificates
 * Get user's certificates
 */
router.get(
  "/certificates",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const certificates = await getUserCertificates(userId);
    res.json(certificates);
  })
);

/**
 * GET /api/certificates/stats
 * Get user's certificate statistics
 */
router.get(
  "/certificates/stats",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const stats = await getUserCertificateStats(userId);
    res.json(stats);
  })
);

/**
 * GET /api/certificates/verify/:certificateNumber
 * Verify a certificate by certificate number (public endpoint)
 */
router.get(
  "/certificates/verify/:certificateNumber",
  asyncHandler(async (req: Request, res: Response) => {
    const { certificateNumber } = req.params;
    const certificate = await getCertificateByNumber(certificateNumber);

    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    res.json(certificate);
  })
);

/**
 * POST /api/certificates/:id/revoke
 * Revoke a certificate (admin only)
 */
router.post(
  "/certificates/:id/revoke",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Revocation reason is required" });
    }

    const revoked = await revokeCertificate(id, reason);

    if (!revoked) {
      return res.status(500).json({ error: "Failed to revoke certificate" });
    }

    res.json({ message: "Certificate revoked successfully" });
  })
);

/**
 * POST /api/certificates/:id/url
 * Update certificate URL after PDF generation (internal use)
 */
router.post(
  "/certificates/:id/url",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { certificateUrl } = req.body;

    if (!certificateUrl) {
      return res.status(400).json({ error: "Certificate URL is required" });
    }

    const updated = await updateCertificateUrl(id, certificateUrl);

    if (!updated) {
      return res.status(500).json({ error: "Failed to update certificate URL" });
    }

    res.json({ message: "Certificate URL updated successfully" });
  })
);

// ============================================================================
// FELLOWSHIP APPLICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/fellowship/apply
 * Submit fellowship application
 */
router.post(
  "/fellowship/apply",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { track, cvUrl, experienceSummary, qualificationsSummary, portfolioUrl, dissertationUrl, dissertationTitle } = req.body;

    // Validate input
    const validationResult = fellowshipApplicationSchema.safeParse({
      userId,
      track,
      cvUrl,
      experienceSummary,
      qualificationsSummary,
      portfolioUrl,
      dissertationUrl,
      dissertationTitle,
      status: "pending",
    });

    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid input", details: validationResult.error });
    }

    // Check eligibility
    const eligibilityCheck = await canApplyFellowship(userId, track);
    if (!eligibilityCheck.canApply) {
      return res.status(400).json({ error: eligibilityCheck.reason });
    }

    // Create fellowship application
    const { data, error } = await supabaseAdmin
      .from("fellowship_applications")
      .insert({
        user_id: userId,
        track,
        cv_url: cvUrl,
        experience_summary: experienceSummary,
        qualifications_summary: qualificationsSummary,
        portfolio_url: portfolioUrl,
        dissertation_url: dissertationUrl,
        dissertation_title: dissertationTitle,
        status: "pending",
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: "Failed to create fellowship application" });
    }

    res.status(201).json({
      id: data.id,
      userId: data.user_id,
      track: data.track,
      status: data.status,
      submittedAt: data.submitted_at,
    });
  })
);

/**
 * GET /api/fellowship/applications
 * Get user's fellowship applications
 */
router.get(
  "/fellowship/applications",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("fellowship_applications")
      .select("*")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch fellowship applications" });
    }

    res.json(data || []);
  })
);

/**
 * GET /api/admin/fellowship/applications
 * List all fellowship applications (admin only)
 */
router.get(
  "/admin/fellowship/applications",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, track } = req.query;

    const filters: any = {};
    if (status) filters.status = status as string;
    if (track) filters.track = track as string;

    const applications = await getAllFellowshipApplications(filters);
    res.json(applications);
  })
);

/**
 * POST /api/admin/fellowship/applications/:id/approve
 * Approve fellowship application (admin only)
 */
router.post(
  "/admin/fellowship/applications/:id/approve",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reviewComments } = req.body;
    const reviewerId = req.user.id;

    const { data: application, error } = await supabaseAdmin
      .from("fellowship_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Update application status
    const updated = await updateFellowshipApplicationStatus(
      id,
      "approved",
      reviewerId,
      reviewComments
    );

    if (!updated) {
      return res.status(500).json({ error: "Failed to approve application" });
    }

    // Handle fellowship approval (create certificate, update user level)
    const result = await handleFellowshipApproval(application.user_id, application.track);

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    res.json({
      message: "Fellowship application approved successfully",
      application: updated,
      certificateId: result.certificateId,
    });
  })
);

/**
 * POST /api/admin/fellowship/applications/:id/reject
 * Reject fellowship application (admin only)
 */
router.post(
  "/admin/fellowship/applications/:id/reject",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { reviewComments } = req.body;
    const reviewerId = req.user.id;

    const updated = await updateFellowshipApplicationStatus(
      id,
      "rejected",
      reviewerId,
      reviewComments
    );

    if (!updated) {
      return res.status(500).json({ error: "Failed to reject application" });
    }

    res.json({
      message: "Fellowship application rejected successfully",
      application: updated,
    });
  })
);

// ============================================================================
// STUDENT MEMBERSHIP ENDPOINTS
// ============================================================================

/**
 * POST /api/student/apply
 * Apply for student membership
 */
router.post(
  "/student/apply",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { institutionName, studentId, courseOfStudy, expectedGraduationDate, verificationDocumentUrl } = req.body;

    // Validate input
    const validationResult = studentMembershipSchema.safeParse({
      userId,
      institutionName,
      studentId,
      courseOfStudy,
      expectedGraduationDate,
      verificationDocumentUrl,
      status: "pending",
    });

    if (!validationResult.success) {
      return res.status(400).json({ error: "Invalid input", details: validationResult.error });
    }

    // Create student membership application
    const { data, error } = await supabaseAdmin
      .from("student_memberships")
      .insert({
        user_id: userId,
        institution_name: institutionName,
        student_id: studentId,
        course_of_study: courseOfStudy,
        expected_graduation_date: expectedGraduationDate,
        verification_document_url: verificationDocumentUrl,
        status: "pending",
        expires_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years from now
      })
      .select()
      .single();

    if (error || !data) {
      return res.status(500).json({ error: "Failed to create student membership application" });
    }

    res.status(201).json({
      id: data.id,
      userId: data.user_id,
      status: data.status,
      submittedAt: data.submitted_at,
    });
  })
);

/**
 * GET /api/student/status
 * Get student membership status
 */
router.get(
  "/student/status",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("student_memberships")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      return res.status(500).json({ error: "Failed to fetch student status" });
    }

    if (!data) {
      return res.json({ hasStudentMembership: false });
    }

    // Check if expired
    const isExpired = data.expires_at && new Date(data.expires_at) < new Date();

    res.json({
      hasStudentMembership: true,
      status: data.status,
      isExpired,
      expiresAt: data.expires_at,
    });
  })
);

/**
 * POST /api/admin/student/applications/:id/verify
 * Verify student membership (admin only)
 */
router.post(
  "/admin/student/applications/:id/verify",
  requireSupabaseAuth,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { approved } = req.body;

    const { error } = await supabaseAdmin
      .from("student_memberships")
      .update({
        status: approved ? "verified" : "rejected",
        verified_at: new Date().toISOString(),
        verified_by: req.user.id,
      })
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Failed to update student membership" });
    }

    res.json({
      message: approved ? "Student membership verified" : "Student membership rejected",
    });
  })
);

// ============================================================================
// PROGRESSION ENDPOINTS
// ============================================================================

/**
 * POST /api/progression/course-complete
 * Handle course completion and level upgrade
 */
router.post(
  "/progression/course-complete",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { courseId, assessmentScore, assessmentPassed } = req.body;

    if (!courseId || assessmentScore === undefined || assessmentPassed === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await handleCourseCompletion(
      userId,
      courseId,
      assessmentScore,
      assessmentPassed
    );

    res.json(result);
  })
);

/**
 * GET /api/progression/history
 * Get user's progression history
 */
router.get(
  "/progression/history",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const history = await getUserProgressionHistory(userId);
    res.json(history);
  })
);

/**
 * GET /api/progression/upgrade-eligibility/:track
 * Check if user can upgrade level on a specific track
 */
router.get(
  "/progression/upgrade-eligibility/:track",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;
    const { track } = req.params;

    if (track !== "ARBITRATION" && track !== "MEDIATION") {
      return res.status(400).json({ error: "Invalid track" });
    }

    const eligibility = await checkUpgradeEligibility(
      userId,
      track as "ARBITRATION" | "MEDIATION"
    );

    res.json(eligibility);
  })
);

export default router;

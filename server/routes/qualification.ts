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
} from "../storage/qualification";
import {
  getUserQualificationState,
  getEligibilityState,
  canTakeCourse,
  canApplyExpedited,
  canApplyFellowship,
  getAvailablePathwaysForTrack,
} from "../storage/eligibility";
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
    const { targetLevel, experienceSummary, qualificationsSummary, cvUrl } =
      req.body;

    // Validate input
    const validationResult = expeditedApplicationSchema.safeParse({
      userId,
      targetLevel,
      status: "pending",
      experienceSummary,
      qualificationsSummary,
      cvUrl,
    });

    if (!validationResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: validationResult.error });
    }

    // Check if user already has a pending application for this level
    const hasPending = await hasPendingApplication(userId, targetLevel);
    if (hasPending) {
      return res
        .status(400)
        .json({ error: "You already have a pending application for this level" });
    }

    // Create application
    const application = await createExpeditedApplication({
      userId,
      targetLevel,
      status: "pending",
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

    if (application.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Cannot add documents to non-pending application" });
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

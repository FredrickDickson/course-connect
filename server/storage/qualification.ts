/**
 * Qualification Pathway Storage
 * Handles database operations for qualification status, expedited applications, and assessments
 */

import { createClient } from "@supabase/supabase-js";
import {
  ExpeditedApplication,
  ApplicationDocument,
  QualificationAssessment,
  InsertExpeditedApplication,
  InsertApplicationDocument,
  InsertQualificationAssessment,
} from "../../shared/schema";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface QualificationStatus {
  currentLevel: string;
  pathwayType: string | null;
  yearsAdrExperience: number;
  yearsLegalExperience: number;
  eligibility: {
    canApplyMember: boolean;
    canApplyFellow: boolean;
    expeditedMemberEligible: boolean;
    expeditedFellowEligible: boolean;
  };
}

export interface PathwayOption {
  type: "STANDARD" | "EXPEDITED";
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  name: string;
  description: string;
  action: "enroll" | "apply" | "apply_expedited";
}

/**
 * Get user's qualification status
 */
export async function getQualificationStatus(
  userId: string
): Promise<QualificationStatus | null> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select(
      "current_level, pathway_type, eligibility_flags, years_adr_experience, years_legal_experience"
    )
    .eq("id", userId)
    .single();

  if (error || !user) {
    return null;
  }

  const eligibilityFlags = user.eligibility_flags || {};

  return {
    currentLevel: user.current_level,
    pathwayType: user.pathway_type,
    yearsAdrExperience: user.years_adr_experience || 0,
    yearsLegalExperience: user.years_legal_experience || 0,
    eligibility: {
      canApplyMember:
        user.current_level === "NONE" || user.current_level === "ASSOCIATE",
      canApplyFellow:
        user.current_level === "MEMBER" || user.current_level === "FELLOW",
      expeditedMemberEligible:
        (user.years_adr_experience || 0) >= 3 ||
        (user.years_legal_experience || 0) >= 3 ||
        eligibilityFlags.expeditedEligible === true,
      expeditedFellowEligible:
        (user.current_level === "MEMBER" &&
          ((user.years_adr_experience || 0) >= 7 ||
            (user.years_legal_experience || 0) >= 10)) ||
        eligibilityFlags.canApplyFellow === true,
    },
  };
}

/**
 * Get available pathways for user
 */
export async function getAvailablePathways(
  userId: string
): Promise<PathwayOption[]> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("current_level, years_adr_experience, years_legal_experience")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return [];
  }

  const pathways: PathwayOption[] = [];
  const yearsAdr = user.years_adr_experience || 0;
  const yearsLegal = user.years_legal_experience || 0;

  // Standard pathway options
  if (user.current_level === "NONE") {
    pathways.push({
      type: "STANDARD",
      level: "ASSOCIATE",
      name: "Associate (ACIMArb)",
      description: "Foundation course in arbitration and mediation",
      action: "enroll",
    });
  }

  if (user.current_level === "ASSOCIATE") {
    pathways.push({
      type: "STANDARD",
      level: "MEMBER",
      name: "Member (MCIMArb)",
      description: "Advanced course in arbitration procedures",
      action: "enroll",
    });
  }

  if (user.current_level === "MEMBER") {
    pathways.push({
      type: "STANDARD",
      level: "FELLOW",
      name: "Fellow (FCIMArb)",
      description: "Mastery course with dissertation",
      action: "apply",
    });
  }

  // Expedited pathway options
  if (user.current_level === "NONE" || user.current_level === "ASSOCIATE") {
    if (yearsAdr >= 3 || yearsLegal >= 3) {
      pathways.push({
        type: "EXPEDITED",
        level: "MEMBER",
        name: "Expedited Member",
        description: "14-day assessment for experienced professionals",
        action: "apply_expedited",
      });
    }
  }

  if (user.current_level === "MEMBER") {
    if (yearsAdr >= 7 || yearsLegal >= 10) {
      pathways.push({
        type: "EXPEDITED",
        level: "FELLOW",
        name: "Expedited Fellow",
        description: "48-hour assessment for senior professionals",
        action: "apply_expedited",
      });
    }
  }

  return pathways;
}

/**
 * Create expedited application
 */
export async function createExpeditedApplication(
  application: InsertExpeditedApplication
): Promise<ExpeditedApplication | null> {
  const { data, error } = await supabaseAdmin
    .from("expedited_applications")
    .insert({
      user_id: application.userId,
      target_level: application.targetLevel,
      status: application.status || "pending",
      cv_url: application.cvUrl,
      experience_summary: application.experienceSummary,
      qualifications_summary: application.qualificationsSummary,
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    targetLevel: data.target_level,
    status: data.status,
    cvUrl: data.cv_url,
    experienceSummary: data.experience_summary,
    qualificationsSummary: data.qualifications_summary,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
    reviewComments: data.review_comments,
    assessmentScore: data.assessment_score?.toString(),
    assessmentPassed: data.assessment_passed,
    assessmentCompletedAt: data.assessment_completed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get user's expedited applications
 */
export async function getUserExpeditedApplications(
  userId: string
): Promise<ExpeditedApplication[]> {
  const { data, error } = await supabaseAdmin
    .from("expedited_applications")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((app) => ({
    id: app.id,
    userId: app.user_id,
    targetLevel: app.target_level,
    status: app.status,
    cvUrl: app.cv_url,
    experienceSummary: app.experience_summary,
    qualificationsSummary: app.qualifications_summary,
    submittedAt: app.submitted_at,
    reviewedAt: app.reviewed_at,
    reviewedBy: app.reviewed_by,
    reviewComments: app.review_comments,
    assessmentScore: app.assessment_score?.toString(),
    assessmentPassed: app.assessment_passed,
    assessmentCompletedAt: app.assessment_completed_at,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
  }));
}

/**
 * Get expedited application by ID with documents and assessments
 */
export async function getExpeditedApplicationById(
  applicationId: string
): Promise<ExpeditedApplication & {
  documents: ApplicationDocument[];
  assessments: QualificationAssessment[];
} | null> {
  const { data: application, error: appError } = await supabaseAdmin
    .from("expedited_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return null;
  }

  const { data: documents } = await supabaseAdmin
    .from("application_documents")
    .select("*")
    .eq("application_id", applicationId);

  const { data: assessments } = await supabaseAdmin
    .from("qualification_assessments")
    .select("*")
    .eq("application_id", applicationId);

  return {
    id: application.id,
    userId: application.user_id,
    targetLevel: application.target_level as "MEMBER" | "FELLOW",
    status: application.status,
    cvUrl: application.cv_url,
    experienceSummary: application.experience_summary,
    qualificationsSummary: application.qualifications_summary,
    submittedAt: application.submitted_at,
    reviewedAt: application.reviewed_at,
    reviewedBy: application.reviewed_by,
    reviewComments: application.review_comments,
    assessmentScore: application.assessment_score?.toString(),
    assessmentPassed: application.assessment_passed,
    assessmentCompletedAt: application.assessment_completed_at,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    documents:
      documents?.map((doc) => ({
        id: doc.id,
        applicationId: doc.application_id,
        documentType: doc.document_type,
        fileUrl: doc.file_url,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadedAt: doc.uploaded_at,
      })) || [],
    assessments:
      assessments?.map((assess) => ({
        id: assess.id,
        applicationId: assess.application_id,
        assessmentType: assess.assessment_type,
        startedAt: assess.started_at,
        completedAt: assess.completed_at,
        score: assess.score?.toString(),
        passed: assess.passed,
        submissionContent: assess.submission_content,
        createdAt: assess.created_at,
        updatedAt: assess.updated_at,
      })) || [],
  };
}

/**
 * Check if user has pending application for level
 */
export async function hasPendingApplication(
  userId: string,
  targetLevel: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("expedited_applications")
    .select("id")
    .eq("user_id", userId)
    .eq("target_level", targetLevel)
    .in("status", ["pending", "under_review"])
    .single();

  return !error && !!data;
}

/**
 * Upload application document
 */
export async function uploadApplicationDocument(
  document: InsertApplicationDocument
): Promise<ApplicationDocument | null> {
  const { data, error } = await supabaseAdmin
    .from("application_documents")
    .insert({
      application_id: document.applicationId,
      document_type: document.documentType,
      file_url: document.fileUrl,
      file_name: document.fileName,
      file_size: document.fileSize,
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return {
    id: data.id,
    applicationId: data.application_id,
    documentType: data.document_type,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    uploadedAt: data.uploaded_at,
  };
}

/**
 * Submit or update qualification assessment
 */
export async function submitQualificationAssessment(
  assessment: InsertQualificationAssessment
): Promise<QualificationAssessment | null> {
  // Check if assessment already exists
  const { data: existing } = await supabaseAdmin
    .from("qualification_assessments")
    .select("*")
    .eq("application_id", assessment.applicationId)
    .single();

  let result;

  if (existing && existing.completed_at) {
    // Update existing
    const { data, error } = await supabaseAdmin
      .from("qualification_assessments")
      .update({
        submission_content: assessment.submissionContent,
        completed_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return null;
    result = data;
  } else if (existing) {
    // Update incomplete assessment
    const { data, error } = await supabaseAdmin
      .from("qualification_assessments")
      .update({
        submission_content: assessment.submissionContent,
        completed_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return null;
    result = data;
  } else {
    // Create new
    const { data, error } = await supabaseAdmin
      .from("qualification_assessments")
      .insert({
        application_id: assessment.applicationId,
        assessment_type: assessment.assessmentType,
        submission_content: assessment.submissionContent,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return null;
    result = data;
  }

  // Update application status to under_review
  await supabaseAdmin
    .from("expedited_applications")
    .update({ status: "under_review" })
    .eq("id", assessment.applicationId);

  return {
    id: result.id,
    applicationId: result.application_id,
    assessmentType: result.assessment_type,
    startedAt: result.started_at,
    completedAt: result.completed_at,
    score: result.score?.toString(),
    passed: result.passed,
    submissionContent: result.submission_content,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
}

/**
 * Update user qualification level
 */
export async function updateUserQualificationLevel(
  userId: string,
  newLevel: string,
  pathwayType: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      current_level: newLevel,
      pathway_type: pathwayType,
    })
    .eq("id", userId);

  return !error;
}

/**
 * Get all expedited applications (admin only)
 */
export async function getAllExpeditedApplications(
  filters?: { status?: string; targetLevel?: string }
): Promise<(ExpeditedApplication & {
  documents: ApplicationDocument[];
  assessments: QualificationAssessment[];
})[]> {
  let query = supabaseAdmin
    .from("expedited_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.targetLevel) {
    query = query.eq("target_level", filters.targetLevel);
  }

  const { data: applications, error } = await query;

  if (error || !applications) {
    return [];
  }

  // Fetch documents and assessments for each application
  const applicationsWithDetails = await Promise.all(
    applications.map(async (app) => {
      const { data: documents } = await supabaseAdmin
        .from("application_documents")
        .select("*")
        .eq("application_id", app.id);

      const { data: assessments } = await supabaseAdmin
        .from("qualification_assessments")
        .select("*")
        .eq("application_id", app.id);

      return {
        id: app.id,
        userId: app.user_id,
        targetLevel: app.target_level as "MEMBER" | "FELLOW",
        status: app.status,
        cvUrl: app.cv_url,
        experienceSummary: app.experience_summary,
        qualificationsSummary: app.qualifications_summary,
        submittedAt: app.submitted_at,
        reviewedAt: app.reviewed_at,
        reviewedBy: app.reviewed_by,
        reviewComments: app.review_comments,
        assessmentScore: app.assessment_score?.toString(),
        assessmentPassed: app.assessment_passed,
        assessmentCompletedAt: app.assessment_completed_at,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
        documents:
          documents?.map((doc) => ({
            id: doc.id,
            applicationId: doc.application_id,
            documentType: doc.document_type,
            fileUrl: doc.file_url,
            fileName: doc.file_name,
            fileSize: doc.file_size,
            uploadedAt: doc.uploaded_at,
          })) || [],
        assessments:
          assessments?.map((assess) => ({
            id: assess.id,
            applicationId: assess.application_id,
            assessmentType: assess.assessment_type,
            startedAt: assess.started_at,
            completedAt: assess.completed_at,
            score: assess.score?.toString(),
            passed: assess.passed,
            submissionContent: assess.submission_content,
            createdAt: assess.created_at,
            updatedAt: assess.updated_at,
          })) || [],
      };
    })
  );

  return applicationsWithDetails;
}

/**
 * Update expedited application status (approve/reject)
 */
export async function updateExpeditedApplicationStatus(
  applicationId: string,
  status: "approved" | "rejected" | "under_review",
  reviewerId: string,
  reviewComments?: string,
  assessmentScore?: number
): Promise<ExpeditedApplication | null> {
  const updateData: any = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  };

  if (reviewComments) {
    updateData.review_comments = reviewComments;
  }

  if (assessmentScore !== undefined) {
    updateData.assessment_score = assessmentScore;
    updateData.assessment_passed = assessmentScore >= 50; // Pass threshold is 50%
  }

  const { data, error } = await supabaseAdmin
    .from("expedited_applications")
    .update(updateData)
    .eq("id", applicationId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    targetLevel: data.target_level,
    status: data.status,
    cvUrl: data.cv_url,
    experienceSummary: data.experience_summary,
    qualificationsSummary: data.qualifications_summary,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
    reviewComments: data.review_comments,
    assessmentScore: data.assessment_score?.toString(),
    assessmentPassed: data.assessment_passed,
    assessmentCompletedAt: data.assessment_completed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all fellowship applications (admin only)
 */
export async function getAllFellowshipApplications(
  filters?: { status?: string; track?: string }
): Promise<any[]> {
  let query = supabaseAdmin
    .from("fellowship_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.track) {
    query = query.eq("track", filters.track);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((app) => ({
    id: app.id,
    userId: app.user_id,
    track: app.track,
    status: app.status,
    cvUrl: app.cv_url,
    experienceSummary: app.experience_summary,
    qualificationsSummary: app.qualifications_summary,
    portfolioUrl: app.portfolio_url,
    dissertationUrl: app.dissertation_url,
    dissertationTitle: app.dissertation_title,
    submittedAt: app.submitted_at,
    reviewedAt: app.reviewed_at,
    reviewedBy: app.reviewed_by,
    reviewComments: app.review_comments,
    approvedAt: app.approved_at,
    rejectedAt: app.rejected_at,
    rejectionReason: app.rejection_reason,
    createdAt: app.created_at,
    updatedAt: app.updated_at,
  }));
}

/**
 * Update fellowship application status (approve/reject)
 */
export async function updateFellowshipApplicationStatus(
  applicationId: string,
  status: "approved" | "rejected" | "under_review",
  reviewerId: string,
  reviewComments?: string
): Promise<any | null> {
  const updateData: any = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  };

  if (reviewComments) {
    updateData.review_comments = reviewComments;
  }

  if (status === "approved") {
    updateData.approved_at = new Date().toISOString();
  } else if (status === "rejected") {
    updateData.rejected_at = new Date().toISOString();
    updateData.rejection_reason = reviewComments;
  }

  const { data, error } = await supabaseAdmin
    .from("fellowship_applications")
    .update(updateData)
    .eq("id", applicationId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    track: data.track,
    status: data.status,
    cvUrl: data.cv_url,
    experienceSummary: data.experience_summary,
    qualificationsSummary: data.qualifications_summary,
    portfolioUrl: data.portfolio_url,
    dissertationUrl: data.dissertation_url,
    dissertationTitle: data.dissertation_title,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    reviewedBy: data.reviewed_by,
    reviewComments: data.review_comments,
    approvedAt: data.approved_at,
    rejectedAt: data.rejected_at,
    rejectionReason: data.rejection_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

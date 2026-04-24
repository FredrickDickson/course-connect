/**
 * Progression System
 * Handles course completion → level upgrade logic
 * Implements automatic progression, certificate generation, and hybrid pathway detection
 * Based on logic from full logic.md
 */

import { createClient } from "@supabase/supabase-js";
import {
  CourseCompletionRecord,
  InsertCourseCompletionRecord,
  TrackProgress,
} from "../../shared/schema";
import { createCertificate } from "./certificates";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Get course metadata to determine track and level
 */
async function getCourseMetadata(courseId: string) {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("id, track, level, title")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    track: data.track as "ARBITRATION" | "MEDIATION",
    level: data.level as "ASSOCIATE" | "MEMBER" | "FELLOW",
    title: data.title,
  };
}

/**
 * Detect if user is on a hybrid pathway
 * Hybrid = mixed standard and expedited progression
 */
async function detectHybridPathway(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<boolean> {
  // Get all course completions for this track
  const { data: completions } = await supabaseAdmin
    .from("course_completion_records")
    .select("is_supplementary")
    .eq("user_id", userId)
    .eq("track", track);

  // Get expedited applications for this track
  const { data: expeditedApps } = await supabaseAdmin
    .from("expedited_applications")
    .select("status")
    .eq("user_id", userId)
    .eq("target_level", "MEMBER")
    .in("status", ["approved", "under_review"]);

  // If user has both course completions and approved expedited applications, it's hybrid
  const hasCourseCompletions = (completions?.length || 0) > 0;
  const hasApprovedExpedited = (expeditedApps?.length || 0) > 0;

  return hasCourseCompletions && hasApprovedExpedited;
}

/**
 * Update user's track progress with new level and pathway
 */
async function updateTrackProgress(
  userId: string,
  track: "ARBITRATION" | "MEDIATION",
  newLevel: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW",
  pathway: "STANDARD" | "EXPEDITED" | "HYBRID" | null
): Promise<boolean> {
  // Check if track progress exists
  const { data: existing } = await supabaseAdmin
    .from("user_track_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();

  if (existing) {
    // Update existing progress
    const { error } = await supabaseAdmin
      .from("user_track_progress")
      .update({
        level: newLevel,
        pathway,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    return !error;
  } else {
    // Create new track progress
    const { error } = await supabaseAdmin
      .from("user_track_progress")
      .insert({
        user_id: userId,
        track,
        level: newLevel,
        pathway,
      });

    return !error;
  }
}

/**
 * Handle course completion with assessment
 * This is the main function called when a user completes a course and passes the assessment
 */
export async function handleCourseCompletion(
  userId: string,
  courseId: string,
  assessmentScore: number,
  assessmentPassed: boolean
): Promise<{
  success: boolean;
  message: string;
  certificateId?: string;
  newLevel?: string;
}> {
  // Get course metadata
  const courseMetadata = await getCourseMetadata(courseId);
  if (!courseMetadata) {
    return { success: false, message: "Course not found" };
  }

  const { track, level: courseLevel } = courseMetadata;

  // Check if assessment passed
  if (!assessmentPassed) {
    // Record completion but don't upgrade level
    const completionData: InsertCourseCompletionRecord = {
      userId,
      courseId,
      track,
      levelAchieved: null,
      assessmentPassed: false,
      assessmentScore: assessmentScore.toString(),
      isSupplementary: false,
    };

    await supabaseAdmin
      .from("course_completion_records")
      .insert(completionData);

    return {
      success: false,
      message: "Assessment not passed. Level not upgraded.",
    };
  }

  // Determine new level based on course level
  const levelMapping: Record<string, "ASSOCIATE" | "MEMBER" | "FELLOW"> = {
    ASSOCIATE: "ASSOCIATE",
    associate: "ASSOCIATE",
    MEMBER: "MEMBER",
    member: "MEMBER",
    FELLOW: "FELLOW",
    fellow: "FELLOW",
  };

  const newLevel = levelMapping[courseLevel];
  if (!newLevel) {
    return { success: false, message: "Invalid course level" };
  }

  // Check for duplicate certification at this level
  const { data: existingCertificate } = await supabaseAdmin
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("track", track)
    .eq("level", newLevel)
    .eq("is_revoked", false)
    .maybeSingle();

  if (existingCertificate) {
    // Mark as supplementary training (retake)
    const completionData: InsertCourseCompletionRecord = {
      userId,
      courseId,
      track,
      levelAchieved: newLevel,
      assessmentPassed: true,
      assessmentScore: assessmentScore.toString(),
      isSupplementary: true,
    };

    await supabaseAdmin
      .from("course_completion_records")
      .insert(completionData);

    return {
      success: true,
      message: "Course completed as supplementary training. Certificate already issued.",
    };
  }

  // Detect pathway
  const isHybrid = await detectHybridPathway(userId, track);
  const pathway: "STANDARD" | "EXPEDITED" | "HYBRID" = isHybrid
    ? "HYBRID"
    : "STANDARD";

  // Update track progress
  const progressUpdated = await updateTrackProgress(
    userId,
    track,
    newLevel,
    pathway
  );

  if (!progressUpdated) {
    return { success: false, message: "Failed to update track progress" };
  }

  // Create certificate
  const certificate = await createCertificate(userId, track, newLevel, pathway);

  if (!certificate) {
    return { success: false, message: "Failed to create certificate" };
  }

  // Record completion
  const completionData: InsertCourseCompletionRecord = {
    userId,
    courseId,
    track,
    levelAchieved: newLevel,
    assessmentPassed: true,
    assessmentScore: assessmentScore.toString(),
    certificateId: certificate.id,
    isSupplementary: false,
  };

  const { error: completionError } = await supabaseAdmin
    .from("course_completion_records")
    .insert(completionData);

  if (completionError) {
    console.error("Failed to record completion:", completionError);
  }

  return {
    success: true,
    message: `Course completed successfully. Level upgraded to ${newLevel}.`,
    certificateId: certificate.id,
    newLevel,
  };
}

/**
 * Handle expedited application approval
 * Called when an expedited application is approved by admin
 */
export async function handleExpeditedApproval(
  userId: string,
  targetLevel: "MEMBER" | "FELLOW",
  track: "ARBITRATION" = "ARBITRATION" // Expedited is only for Arbitration
): Promise<{
  success: boolean;
  message: string;
  certificateId?: string;
}> {
  // Detect if this creates a hybrid pathway
  const isHybrid = await detectHybridPathway(userId, track);
  const pathway: "STANDARD" | "EXPEDITED" | "HYBRID" = isHybrid
    ? "HYBRID"
    : "EXPEDITED";

  // Update track progress
  const progressUpdated = await updateTrackProgress(
    userId,
    track,
    targetLevel,
    pathway
  );

  if (!progressUpdated) {
    return { success: false, message: "Failed to update track progress" };
  }

  // Create certificate
  const certificate = await createCertificate(
    userId,
    track,
    targetLevel,
    pathway
  );

  if (!certificate) {
    return { success: false, message: "Failed to create certificate" };
  }

  return {
    success: true,
    message: `Expedited application approved. Level upgraded to ${targetLevel}.`,
    certificateId: certificate.id,
  };
}

/**
 * Handle fellowship application approval
 * Called when a fellowship application is approved by admin
 */
export async function handleFellowshipApproval(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{
  success: boolean;
  message: string;
  certificateId?: string;
}> {
  // Check if user is already at Member level
  const { data: trackProgress } = await supabaseAdmin
    .from("user_track_progress")
    .select("level, pathway")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();

  if (!trackProgress || trackProgress.level !== "MEMBER") {
    return {
      success: false,
      message: "User must be at Member level to be approved for Fellowship",
    };
  }

  // Detect pathway (fellowship typically follows the same pathway as member)
  const pathway = trackProgress.pathway || "STANDARD";

  // Update track progress to Fellow
  const progressUpdated = await updateTrackProgress(
    userId,
    track,
    "FELLOW",
    pathway
  );

  if (!progressUpdated) {
    return { success: false, message: "Failed to update track progress" };
  }

  // Create certificate
  const certificate = await createCertificate(userId, track, "FELLOW", pathway);

  if (!certificate) {
    return { success: false, message: "Failed to create certificate" };
  }

  return {
    success: true,
    message: "Fellowship application approved. Level upgraded to Fellow.",
    certificateId: certificate.id,
  };
}

/**
 * Get user's progression history
 */
export async function getUserProgressionHistory(userId: string) {
  const { data: completions, error } = await supabaseAdmin
    .from("course_completion_records")
    .select(
      `
        *,
        courses (title, track, level)
      `
    )
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (error || !completions) {
    return [];
  }

  return completions.map((record) => ({
    id: record.id,
    courseId: record.course_id,
    courseTitle: record.courses?.title,
    track: record.track,
    levelAchieved: record.level_achieved,
    assessmentPassed: record.assessment_passed,
    assessmentScore: record.assessment_score,
    completedAt: record.completed_at,
    certificateId: record.certificate_id,
    isSupplementary: record.is_supplementary,
  }));
}

/**
 * Check if user can upgrade level based on current progress
 */
export async function checkUpgradeEligibility(
  userId: string,
  track: "ARBITRATION" | "MEDIATION"
): Promise<{
  canUpgrade: boolean;
  currentLevel: string;
  nextLevel?: string;
  requirements?: string[];
  message?: string;
}> {
  const { data: trackProgress } = await supabaseAdmin
    .from("user_track_progress")
    .select("level")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();

  if (!trackProgress) {
    return {
      canUpgrade: true,
      currentLevel: "NONE",
      nextLevel: "ASSOCIATE",
      requirements: ["Complete Part I course and pass assessment"],
    };
  }

  const currentLevel = trackProgress.level;
  const levelOrder = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];
  const currentIndex = levelOrder.indexOf(currentLevel);

  if (currentIndex >= levelOrder.length - 1) {
    return {
      canUpgrade: false,
      currentLevel,
      message: "Already at highest level",
    };
  }

  const nextLevel = levelOrder[currentIndex + 1];

  const requirements: string[] = [];
  if (nextLevel === "ASSOCIATE") {
    requirements.push("Complete Part I course");
    requirements.push("Pass assessment with required score");
  } else if (nextLevel === "MEMBER") {
    requirements.push("Complete Part II course");
    requirements.push("Pass assessment with required score");
  } else if (nextLevel === "FELLOW") {
    requirements.push("Complete Part III course");
    requirements.push("Submit and pass dissertation");
    requirements.push("Or apply for expedited fellowship with sufficient experience");
  }

  return {
    canUpgrade: true,
    currentLevel,
    nextLevel,
    requirements,
  };
}

import { createClient } from "@supabase/supabase-js";
import type {
  LevelWaiver,
  ProfessionalDocument,
  ProfessionalProfile,
} from "@shared/schema";

type TrackType = "ARBITRATION" | "MEDIATION";
type QualificationLevel = "NONE" | "ASSOCIATE" | "MEMBER" | "FELLOW";
type ReviewStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";
type DocumentType = "CV" | "CERTIFICATE" | "LICENSE" | "PORTFOLIO" | "REFERENCE" | "AWARD" | "OTHER";
type LevelSource = "DEFAULT" | "EXPEDITED" | "ADMIN" | "MIGRATION";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface ProfessionalProfileDraftInput {
  track?: TrackType;
  contactEmail?: string | null;
  contactPhone?: string | null;
  country?: string | null;
  timezone?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  organization?: string | null;
  jobTitle?: string | null;
  yearsAdrExperience?: number;
  yearsLegalExperience?: number;
  practiceAreas?: string[];
  adrRoles?: string[];
  qualifications?: any[];
  credentials?: any[];
  narrativeSummary?: string | null;
  selfAssessedLevel?: "ASSOCIATE" | "MEMBER" | "FELLOW";
  submittedPayload?: Record<string, any> | null;
}

export interface ProfessionalProfileFilters {
  reviewStatus?: ReviewStatus;
  assignedLevel?: QualificationLevel;
  track?: TrackType;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: "submitted_at" | "decision_at" | "updated_at";
  ascending?: boolean;
}

export interface ProfessionalDocumentInput {
  documentType: DocumentType;
  fileUrl: string;
  originalName?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  isPrimary?: boolean;
  visibility?: "PRIVATE" | "REVIEWERS" | "ADMIN" | "PUBLIC";
}

export interface GrantLevelWaiverInput {
  userId: string;
  profileId?: string | null;
  track: TrackType;
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  grantedBy?: string | null;
  grantedVia?: "ADMIN" | "EXPEDITED" | "LEGACY" | "AUTOMATION";
  waiverReason?: string | null;
  expiresAt?: string | null;
}

export interface ProfessionalProfileReviewInput {
  profileId: string;
  reviewerId: string;
  reviewStatus: ReviewStatus;
  reviewNotes?: string | null;
  assignedLevel?: QualificationLevel;
  assignedLevelNotes?: string | null;
  levelSource?: LevelSource;
}

export interface ProfessionalProfileRecord extends ProfessionalProfile {
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    country: string | null;
  };
  documents?: ProfessionalDocument[];
}

function mapProfileRow(row: any): ProfessionalProfile {
  return {
    id: row.id,
    userId: row.user_id,
    track: row.track,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    country: row.country,
    timezone: row.timezone,
    linkedinUrl: row.linkedin_url,
    websiteUrl: row.website_url,
    organization: row.organization,
    jobTitle: row.job_title,
    yearsAdrExperience: row.years_adr_experience ?? 0,
    yearsLegalExperience: row.years_legal_experience ?? 0,
    practiceAreas: row.practice_areas ?? [],
    adrRoles: row.adr_roles ?? [],
    qualifications: row.qualifications ?? [],
    credentials: row.credentials ?? [],
    narrativeSummary: row.narrative_summary,
    selfAssessedLevel: row.self_assessed_level,
    reviewStatus: row.review_status,
    reviewNotes: row.review_notes,
    reviewerId: row.reviewer_id,
    submittedAt: row.submitted_at,
    decisionAt: row.decision_at,
    assignedLevel: row.assigned_level,
    levelSource: row.level_source,
    assignedLevelNotes: row.assigned_level_notes,
    submittedPayload: row.submitted_payload,
    profileVersion: row.profile_version,
    isCurrent: row.is_current,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocumentRow(row: any): ProfessionalDocument {
  return {
    id: row.id,
    profileId: row.profile_id,
    uploadedBy: row.uploaded_by,
    documentType: row.document_type,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    status: row.status,
    visibility: row.visibility,
    isPrimary: row.is_primary,
    reviewerId: row.reviewer_id,
    reviewNotes: row.review_notes,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWaiverRow(row: any): LevelWaiver {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    track: row.track,
    level: row.level,
    grantedVia: row.granted_via,
    grantedBy: row.granted_by,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    waiverReason: row.waiver_reason,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserSnippet(row?: any) {
  if (!row) return undefined;
  return {
    id: row.id,
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    email: row.email ?? null,
    country: row.country ?? null,
  };
}

function buildProfilePayload(data: ProfessionalProfileDraftInput) {
  return {
    track: data.track ?? "ARBITRATION",
    contact_email: data.contactEmail ?? null,
    contact_phone: data.contactPhone ?? null,
    country: data.country ?? null,
    timezone: data.timezone ?? null,
    linkedin_url: data.linkedinUrl ?? null,
    website_url: data.websiteUrl ?? null,
    organization: data.organization ?? null,
    job_title: data.jobTitle ?? null,
    years_adr_experience: data.yearsAdrExperience ?? 0,
    years_legal_experience: data.yearsLegalExperience ?? 0,
    practice_areas: data.practiceAreas ?? [],
    adr_roles: data.adrRoles ?? [],
    qualifications: data.qualifications ?? [],
    credentials: data.credentials ?? [],
    narrative_summary: data.narrativeSummary ?? null,
    self_assessed_level: data.selfAssessedLevel ?? null,
    submitted_payload: data.submittedPayload ?? null,
  };
}

async function fetchDocuments(profileId: string): Promise<ProfessionalDocument[]> {
  const { data, error } = await supabaseAdmin
    .from("professional_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
}

async function refreshWaiverCache(userId: string, track: TrackType) {
  const { data: waivers, error } = await supabaseAdmin
    .from("level_waivers")
    .select("level, waiver_reason, granted_at, expires_at, granted_via")
    .eq("user_id", userId)
    .eq("track", track)
    .eq("status", "GRANTED")
    .order("granted_at", { ascending: false });

  if (error) throw error;

  const waivedLevels = (waivers ?? []).map((entry) => entry.level);
  const metadata = {
    entries: (waivers ?? []).map((entry) => ({
      level: entry.level,
      reason: entry.waiver_reason,
      grantedAt: entry.granted_at,
      expiresAt: entry.expires_at,
      grantedVia: entry.granted_via,
    })),
  };

  const { data: existingTrack } = await supabaseAdmin
    .from("user_track_progress")
    .select("level")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();

  const payload = {
    user_id: userId,
    track,
    level: existingTrack?.level ?? "NONE",
    waived_levels: waivedLevels,
    waiver_metadata: metadata,
    waiver_last_granted_at: waivers?.[0]?.granted_at ?? null,
  };

  await supabaseAdmin
    .from("user_track_progress")
    .upsert(payload, { onConflict: "user_id,track" });
}

export async function setUserAssignedLevel(
  userId: string,
  level: QualificationLevel,
  options?: { track?: TrackType; levelSource?: LevelSource },
) {
  const track = options?.track ?? "ARBITRATION";
  const levelSource = options?.levelSource ?? "DEFAULT";
  await updateUserAssignedLevel(userId, track, level, levelSource);
}

function mapLevelSourceToPathway(levelSource: LevelSource): "STANDARD" | "EXPEDITED" | "HYBRID" {
  switch (levelSource) {
    case "EXPEDITED":
      return "EXPEDITED";
    case "ADMIN":
    case "MIGRATION":
      return "HYBRID";
    default:
      return "STANDARD";
  }
}

async function updateUserAssignedLevel(
  userId: string,
  track: TrackType,
  level: QualificationLevel,
  levelSource: LevelSource,
) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      assigned_level: level,
      current_level: level,
      level_source: levelSource,
      level_updated_at: now,
      pathway_type: mapLevelSourceToPathway(levelSource),
    })
    .eq("id", userId);

  if (error) throw error;

  const { data: existing } = await supabaseAdmin
    .from("user_track_progress")
    .select("waived_levels, waiver_metadata, waiver_last_granted_at")
    .eq("user_id", userId)
    .eq("track", track)
    .maybeSingle();

  const payload = {
    user_id: userId,
    track,
    level,
    pathway: mapLevelSourceToPathway(levelSource),
    waived_levels: existing?.waived_levels ?? [],
    waiver_metadata: existing?.waiver_metadata ?? {},
    waiver_last_granted_at: existing?.waiver_last_granted_at ?? null,
  };

  await supabaseAdmin
    .from("user_track_progress")
    .upsert(payload, { onConflict: "user_id,track" });
}

function getWaivedLevelsForAssignment(level: QualificationLevel): ("ASSOCIATE" | "MEMBER")[] {
  if (level === "FELLOW") {
    return ["ASSOCIATE", "MEMBER"];
  }
  if (level === "MEMBER") {
    return ["ASSOCIATE"];
  }
  return [];
}

const mapLevelSourceToWaiverSource = (source: LevelSource): GrantLevelWaiverInput["grantedVia"] => {
  if (source === "EXPEDITED") return "EXPEDITED";
  if (source === "ADMIN") return "ADMIN";
  return "LEGACY";
};

export async function saveProfessionalProfileDraft(
  userId: string,
  data: ProfessionalProfileDraftInput,
  options?: { submit?: boolean },
): Promise<ProfessionalProfile> {
  const { data: existing } = await supabaseAdmin
    .from("professional_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  const payload = {
    ...buildProfilePayload(data),
    review_status: options?.submit ? "UNDER_REVIEW" : "DRAFT",
    reviewer_id: null,
    review_notes: null,
    decision_at: null,
    submitted_at: options?.submit ? new Date().toISOString() : null,
    is_current: true,
    is_archived: false,
  };

  const query = existing
    ? supabaseAdmin
        .from("professional_profiles")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single()
    : supabaseAdmin
        .from("professional_profiles")
        .insert({ ...payload, user_id: userId })
        .select("*")
        .single();

  const { data: result, error } = await query;
  if (error || !result) throw error ?? new Error("Failed to save professional profile");
  return mapProfileRow(result);
}

export async function getProfessionalProfileByUserId(
  userId: string,
  options?: { includeDocuments?: boolean },
): Promise<ProfessionalProfileRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("*, user:users(id, first_name, last_name, email, country)")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = mapProfileRow(data);
  const record: ProfessionalProfileRecord = { ...profile, user: mapUserSnippet(data.user) };
  if (options?.includeDocuments) {
    record.documents = await fetchDocuments(profile.id);
  }
  return record;
}

export async function getProfessionalProfileById(
  profileId: string,
  options?: { includeDocuments?: boolean },
): Promise<ProfessionalProfileRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("*, user:users(id, first_name, last_name, email, country)")
    .eq("id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const profile = mapProfileRow(data);
  const record: ProfessionalProfileRecord = { ...profile, user: mapUserSnippet(data.user) };
  if (options?.includeDocuments) {
    record.documents = await fetchDocuments(profile.id);
  }
  return record;
}

export async function listProfessionalProfiles(
  filters: ProfessionalProfileFilters = {},
): Promise<ProfessionalProfileRecord[]> {
  const orderColumn = filters.orderBy ?? "submitted_at";
  const ascending = filters.ascending ?? false;

  let query = supabaseAdmin
    .from("professional_profiles")
    .select("*, user:users(id, first_name, last_name, email, country)")
    .eq("is_current", true)
    .order(orderColumn, { ascending });

  if (filters.reviewStatus) {
    query = query.eq("review_status", filters.reviewStatus);
  }
  if (filters.assignedLevel) {
    query = query.eq("assigned_level", filters.assignedLevel);
  }
  if (filters.track) {
    query = query.eq("track", filters.track);
  }
  if (typeof filters.offset === "number" && typeof filters.limit === "number") {
    query = query.range(filters.offset, filters.offset + filters.limit - 1);
  } else if (typeof filters.limit === "number") {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  let records: ProfessionalProfileRecord[] = (data ?? []).map((row) => ({
    ...mapProfileRow(row),
    user: mapUserSnippet(row.user),
  }));

  if (filters.search) {
    const term = filters.search.toLowerCase();
    records = records.filter((profile) => {
      const user = profile.user;
      const haystack = [
        profile.contactEmail,
        user?.email,
        user?.firstName,
        user?.lastName,
        profile.linkedinUrl,
      ]
        .filter(Boolean)
        .map((value) => value!.toLowerCase());
      return haystack.some((value) => value.includes(term));
    });
  }

  return records;
}

export async function addProfessionalDocument(
  profileId: string,
  uploadedBy: string,
  input: ProfessionalDocumentInput,
): Promise<ProfessionalDocument> {
  const payload = {
    profile_id: profileId,
    uploaded_by: uploadedBy,
    document_type: input.documentType,
    file_url: input.fileUrl,
    original_name: input.originalName ?? null,
    storage_path: input.storagePath ?? null,
    mime_type: input.mimeType ?? null,
    file_size: input.fileSize ?? null,
    is_primary: input.isPrimary ?? false,
    visibility: input.visibility ?? "PRIVATE",
  };

  const { data, error } = await supabaseAdmin
    .from("professional_documents")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to upload document");
  return mapDocumentRow(data);
}

export async function getProfessionalDocuments(profileId: string): Promise<ProfessionalDocument[]> {
  return fetchDocuments(profileId);
}

export async function deleteProfessionalDocument(documentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("professional_documents")
    .delete()
    .eq("id", documentId);
  if (error) throw error;
}

export async function updateProfessionalProfileReview(
  input: ProfessionalProfileReviewInput,
): Promise<ProfessionalProfile> {
  const payload: Record<string, any> = {
    reviewer_id: input.reviewerId,
    review_status: input.reviewStatus,
    review_notes: input.reviewNotes ?? null,
  };

  const now = new Date().toISOString();
  if (input.reviewStatus === "APPROVED" || input.reviewStatus === "REJECTED") {
    payload.decision_at = now;
  }
  if (input.reviewStatus === "UNDER_REVIEW") {
    payload.submitted_at = payload.submitted_at ?? now;
  }
  if (input.assignedLevel) {
    payload.assigned_level = input.assignedLevel;
  }
  if (input.assignedLevelNotes !== undefined) {
    payload.assigned_level_notes = input.assignedLevelNotes;
  }
  if (input.levelSource) {
    payload.level_source = input.levelSource;
  }

  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .update(payload)
    .eq("id", input.profileId)
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to update profile review");

  const updatedProfile = mapProfileRow(data);

  if (input.assignedLevel) {
    const targetLevel = input.assignedLevel;
    const source = input.levelSource ?? "EXPEDITED";
    try {
      await updateUserAssignedLevel(updatedProfile.userId, updatedProfile.track as TrackType, targetLevel, source);
      const waiveLevels = getWaivedLevelsForAssignment(targetLevel);
      const waiverSource = mapLevelSourceToWaiverSource(source);
      await Promise.all(
        waiveLevels.map((level) =>
          grantLevelWaiver({
            userId: updatedProfile.userId,
            profileId: updatedProfile.id,
            track: updatedProfile.track as TrackType,
            level,
            grantedBy: input.reviewerId,
            grantedVia: waiverSource,
            waiverReason: input.reviewNotes ?? input.assignedLevelNotes ?? null,
          }),
        ),
      );
    } catch (assignError) {
      console.error("Failed to update assigned level", assignError);
    }
  }

  return updatedProfile;
}

export async function grantLevelWaiver(
  input: GrantLevelWaiverInput,
): Promise<LevelWaiver> {
  const payload = {
    user_id: input.userId,
    profile_id: input.profileId ?? null,
    track: input.track,
    level: input.level,
    granted_via: input.grantedVia ?? "ADMIN",
    granted_by: input.grantedBy ?? null,
    waiver_reason: input.waiverReason ?? null,
    expires_at: input.expiresAt ?? null,
    status: "GRANTED",
  };

  const { data, error } = await supabaseAdmin
    .from("level_waivers")
    .upsert(payload, { onConflict: "user_id,track,level" })
    .select("*")
    .single();

  if (error || !data) throw error ?? new Error("Failed to grant waiver");

  await refreshWaiverCache(input.userId, input.track);
  return mapWaiverRow(data);
}

export async function revokeLevelWaiver(waiverId: string): Promise<LevelWaiver | null> {
  const { data, error } = await supabaseAdmin
    .from("level_waivers")
    .update({ status: "REVOKED" })
    .eq("id", waiverId)
    .select("*")
    .single();

  if (error) throw error;
  if (!data) return null;

  await refreshWaiverCache(data.user_id, data.track);
  return mapWaiverRow(data);
}

export async function getLevelWaiversForUser(userId: string): Promise<LevelWaiver[]> {
  const { data, error } = await supabaseAdmin
    .from("level_waivers")
    .select("*")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapWaiverRow);
}

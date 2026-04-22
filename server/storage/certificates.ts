/**
 * Certificate Generation System
 * Implements multi-dimensional certificate generation with track, level, and pathway metadata
 * Based on logic from full logic.md
 */

import { createClient } from "@supabase/supabase-js";
import {
  Certificate,
  InsertCertificate,
  TrackProgress,
} from "../../shared/schema";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * Generate post-nominal based on track and level
 */
function getPostNominal(
  track: "ARBITRATION" | "MEDIATION",
  level: "ASSOCIATE" | "MEMBER" | "FELLOW"
): string {
  const prefixes = {
    ARBITRATION: { ASSOCIATE: "ACIMArb", MEMBER: "MCIMArb", FELLOW: "FCIMArb" },
    MEDIATION: { ASSOCIATE: "ACIMed", MEMBER: "MCIMed", FELLOW: "FCIMed" },
  };
  return prefixes[track][level];
}

/**
 * Generate unique certificate number
 * Format: CIMA-[TRACK]-[YEAR]-[SEQUENTIAL]
 * Example: CIMA-ARB-2026-000001
 */
async function generateCertificateNumber(
  track: "ARBITRATION" | "MEDIATION"
): Promise<string> {
  const year = new Date().getFullYear();
  const trackCode = track === "ARBITRATION" ? "ARB" : "MED";

  // Get the count of certificates for this track and year
  const { data: existing } = await supabaseAdmin
    .from("certificates")
    .select("certificate_number")
    .like("certificate_number", `CIMA-${trackCode}-${year}-%`);

  const sequence = (existing?.length || 0) + 1;
  const sequenceStr = sequence.toString().padStart(6, "0");

  return `CIMA-${trackCode}-${year}-${sequenceStr}`;
}

/**
 * Generate verification URL for a certificate
 */
function generateVerificationUrl(certificateNumber: string): string {
  const baseUrl = process.env.VITE_APP_URL || "https://cima.example.com";
  return `${baseUrl}/verify/${certificateNumber}`;
}

/**
 * Check if user already has a certificate for this track and level
 * Prevents duplicate certifications at the same level
 */
async function hasCertificateForLevel(
  userId: string,
  track: "ARBITRATION" | "MEDIATION",
  level: "ASSOCIATE" | "MEMBER" | "FELLOW"
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("track", track)
    .eq("level", level)
    .eq("is_revoked", false)
    .single();

  return !error && !!data;
}

/**
 * Get certificate template name based on track, level, and pathway
 * This determines which PDF template to use
 */
function getCertificateTemplateName(
  track: "ARBITRATION" | "MEDIATION",
  level: "ASSOCIATE" | "MEMBER" | "FELLOW",
  pathway: "STANDARD" | "EXPEDITED" | "HYBRID" | null
): string {
  const base = `${track}_${level}`;
  
  if (pathway === "EXPEDITED") {
    return `${base}_EXPEDITED`;
  }
  
  if (pathway === "HYBRID") {
    return `${base}_HYBRID`;
  }
  
  return `${base}_STANDARD`;
}

/**
 * Get certificate title based on level
 */
function getCertificateTitle(level: "ASSOCIATE" | "MEMBER" | "FELLOW"): string {
  const titles = {
    ASSOCIATE: "Certificate of Associate Membership",
    MEMBER: "Certificate of Membership",
    FELLOW: "Certificate of Fellowship",
  };
  return titles[level];
}

/**
 * Get course description based on track and level
 */
function getCourseDescription(
  track: "ARBITRATION" | "MEDIATION",
  level: "ASSOCIATE" | "MEMBER" | "FELLOW",
  pathway: "STANDARD" | "EXPEDITED" | "HYBRID" | null
): string {
  if (track === "ARBITRATION") {
    if (level === "ASSOCIATE") {
      return "Law, Practice & Procedure in Domestic and International Arbitration (Part I)";
    }
    if (level === "MEMBER") {
      if (pathway === "EXPEDITED") {
        return "Expedited Route to Membership in International Arbitration";
      }
      return "Advanced Law, Practice and Procedure in Arbitration (Part II)";
    }
    if (level === "FELLOW") {
      if (pathway === "EXPEDITED") {
        return "Expedited Route to Fellowship in International Arbitration";
      }
      return "Mastery in International Arbitration with Dissertation (Part III)";
    }
  } else {
    // Mediation track
    if (level === "ASSOCIATE") {
      return "Foundation in Mediation Practice and Procedure";
    }
    if (level === "MEMBER") {
      return "Advanced Law, Practice and Procedure in Mediation";
    }
    if (level === "FELLOW") {
      return "Mastery in Mediation with Portfolio Evaluation";
    }
  }
  
  return "Professional Qualification";
}

/**
 * Create a certificate record in the database
 */
export async function createCertificate(
  userId: string,
  track: "ARBITRATION" | "MEDIATION",
  level: "ASSOCIATE" | "MEMBER" | "FELLOW",
  pathway: "STANDARD" | "EXPEDITED" | "HYBRID" | null,
  options?: {
    validUntil?: Date;
    isSupplementary?: boolean;
  }
): Promise<Certificate | null> {
  // Check for duplicate certificate
  const hasExisting = await hasCertificateForLevel(userId, track, level);
  if (hasExisting && !options?.isSupplementary) {
    return null; // Prevent duplicate certification
  }

  const postNominal = getPostNominal(track, level);
  const certificateNumber = await generateCertificateNumber(track);
  const verificationUrl = generateVerificationUrl(certificateNumber);

  const certificateData: InsertCertificate = {
    userId,
    track,
    level,
    pathway,
    postNominal,
    certificateNumber,
    verificationUrl,
    validUntil: options?.validUntil,
    isRevoked: false,
  };

  const { data, error } = await supabaseAdmin
    .from("certificates")
    .insert(certificateData)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    track: data.track,
    level: data.level,
    pathway: data.pathway,
    postNominal: data.post_nominal,
    certificateNumber: data.certificate_number,
    certificateUrl: data.certificate_url,
    issuedAt: data.issued_at,
    validUntil: data.valid_until,
    verificationUrl: data.verification_url,
    isRevoked: data.is_revoked,
    revokedAt: data.revoked_at,
    revokedReason: data.revoked_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId: string): Promise<Certificate[]> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("is_revoked", false)
    .order("issued_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((cert) => ({
    id: cert.id,
    userId: cert.user_id,
    track: cert.track,
    level: cert.level,
    pathway: cert.pathway,
    postNominal: cert.post_nominal,
    certificateNumber: cert.certificate_number,
    certificateUrl: cert.certificate_url,
    issuedAt: cert.issued_at,
    validUntil: cert.valid_until,
    verificationUrl: cert.verification_url,
    isRevoked: cert.is_revoked,
    revokedAt: cert.revoked_at,
    revokedReason: cert.revoked_reason,
    createdAt: cert.created_at,
    updatedAt: cert.updated_at,
  }));
}

/**
 * Get certificate by verification URL/certificate number
 */
export async function getCertificateByNumber(
  certificateNumber: string
): Promise<Certificate | null> {
  const { data, error } = await supabaseAdmin
    .from("certificates")
    .select("*, users(first_name, last_name)")
    .eq("certificate_number", certificateNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    track: data.track,
    level: data.level,
    pathway: data.pathway,
    postNominal: data.post_nominal,
    certificateNumber: data.certificate_number,
    certificateUrl: data.certificate_url,
    issuedAt: data.issued_at,
    validUntil: data.valid_until,
    verificationUrl: data.verification_url,
    isRevoked: data.is_revoked,
    revokedAt: data.revoked_at,
    revokedReason: data.revoked_reason,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    userName: `${data.users.first_name} ${data.users.last_name}`,
  } as Certificate & { userName: string };
}

/**
 * Revoke a certificate
 */
export async function revokeCertificate(
  certificateId: string,
  reason: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("certificates")
    .update({
      is_revoked: true,
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    })
    .eq("id", certificateId);

  return !error;
}

/**
 * Update certificate URL after PDF generation
 */
export async function updateCertificateUrl(
  certificateId: string,
  certificateUrl: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("certificates")
    .update({ certificate_url: certificateUrl })
    .eq("id", certificateId);

  return !error;
}

/**
 * Generate certificate data for PDF template
 * Returns all metadata needed by the PDF generation service
 */
export async function getCertificateDataForPDF(
  certificateId: string
): Promise<{
  certificate: Certificate;
  user: { firstName: string; lastName: string; fullName: string };
  template: string;
  title: string;
  courseDescription: string;
} | null> {
  const certificate = await supabaseAdmin
    .from("certificates")
    .select("*")
    .eq("id", certificateId)
    .single();

  if (!certificate.data) {
    return null;
  }

  const user = await supabaseAdmin
    .from("users")
    .select("first_name, last_name")
    .eq("id", certificate.data.user_id)
    .single();

  if (!user.data) {
    return null;
  }

  const firstName = user.data.first_name || "";
  const lastName = user.data.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const template = getCertificateTemplateName(
    certificate.data.track,
    certificate.data.level,
    certificate.data.pathway
  );

  const title = getCertificateTitle(certificate.data.level);

  const courseDescription = getCourseDescription(
    certificate.data.track,
    certificate.data.level,
    certificate.data.pathway
  );

  return {
    certificate: {
      id: certificate.data.id,
      userId: certificate.data.user_id,
      track: certificate.data.track,
      level: certificate.data.level,
      pathway: certificate.data.pathway,
      postNominal: certificate.data.post_nominal,
      certificateNumber: certificate.data.certificate_number,
      certificateUrl: certificate.data.certificate_url,
      issuedAt: certificate.data.issued_at,
      validUntil: certificate.data.valid_until,
      verificationUrl: certificate.data.verification_url,
      isRevoked: certificate.data.is_revoked,
      revokedAt: certificate.data.revoked_at,
      revokedReason: certificate.data.revoked_reason,
      createdAt: certificate.data.created_at,
      updatedAt: certificate.data.updated_at,
    },
    user: { firstName, lastName, fullName },
    template,
    title,
    courseDescription,
  };
}

/**
 * Get certificate statistics for a user
 */
export async function getUserCertificateStats(userId: string) {
  const certificates = await getUserCertificates(userId);

  const stats = {
    total: certificates.length,
    byTrack: {
      ARBITRATION: certificates.filter((c) => c.track === "ARBITRATION").length,
      MEDIATION: certificates.filter((c) => c.track === "MEDIATION").length,
    },
    byLevel: {
      ASSOCIATE: certificates.filter((c) => c.level === "ASSOCIATE").length,
      MEMBER: certificates.filter((c) => c.level === "MEMBER").length,
      FELLOW: certificates.filter((c) => c.level === "FELLOW").length,
    },
    byPathway: {
      STANDARD: certificates.filter((c) => c.pathway === "STANDARD").length,
      EXPEDITED: certificates.filter((c) => c.pathway === "EXPEDITED").length,
      HYBRID: certificates.filter((c) => c.pathway === "HYBRID").length,
    },
  };

  return stats;
}

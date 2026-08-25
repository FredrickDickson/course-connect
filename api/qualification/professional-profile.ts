/**
 * Vercel Serverless Function for /api/qualification/professional-profile
 * Handles professional profile creation and updates
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import {
  saveProfessionalProfileDraft,
  getProfessionalProfileByUserId,
} from "../../server/storage/professionalProfiles";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

function normalizeTrack(track?: string): "ARBITRATION" | "MEDIATION" {
  const normalized = (track || "").trim().toUpperCase();
  return normalized === "MEDIATION" ? "MEDIATION" : "ARBITRATION";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type",
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // GET - Fetch professional profile
    if (req.method === "GET") {
      const profile = await getProfessionalProfileByUserId(user.id, {
        includeDocuments: true,
      });
      return res.status(200).json(profile ?? null);
    }

    // POST - Save professional profile
    if (req.method === "POST") {
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

      const profile = await saveProfessionalProfileDraft(
        user.id,
        payload,
        { submit: Boolean(submit) },
      );

      return res.status(200).json(profile);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("Professional profile error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

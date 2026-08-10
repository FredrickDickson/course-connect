/**
 * Certificate Generation Routes
 * Handles server-side certificate PDF generation for n8n workflow integration
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
// jsPDF's Node build (dist/jspdf.node.min.js, selected via the package's
// "node" export condition) exposes the constructor as a named export, not
// a CJS module.exports default — unlike its browser/ESM build, which is
// what `import jsPDF from "jspdf"` resolves to in the client bundle.
import { jsPDF } from "jspdf";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { sendCertificateIssuedEmail } from "../utils/email";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const router = Router();

interface CertificateRequest {
  member_id: string;
  full_name: string;
  membership_level: "associate" | "member" | "fellow";
  issue_date: string;
  expiry_date: string;
  renewal_count?: number;
  pathway?: "ARBITRATION" | "MEDIATION";
}

// Authentication middleware for API key
const authenticateAPIKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers.authorization?.replace("Bearer ", "");
  const validKey = process.env.CERTIFICATE_API_KEY;

  const apiKeyBuffer = apiKey ? Buffer.from(apiKey) : null;
  const validKeyBuffer = validKey ? Buffer.from(validKey) : null;
  const isValid =
    !!apiKeyBuffer &&
    !!validKeyBuffer &&
    apiKeyBuffer.length === validKeyBuffer.length &&
    crypto.timingSafeEqual(apiKeyBuffer, validKeyBuffer);

  if (!isValid) {
    return res.status(401).json({ error: "Unauthorized: Invalid API key" });
  }

  next();
};

// Helper function to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate();
  const ordinal =
    day === 1 || day === 21 || day === 31 ? "st" :
    day === 2 || day === 22 ? "nd" :
    day === 3 || day === 23 ? "rd" : "th";
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  return `${day}${ordinal} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper function to get post-nominal based on level and pathway
function getPostNominal(
  level: string,
  pathway: "ARBITRATION" | "MEDIATION" = "ARBITRATION"
): string {
  const prefixes = {
    ARBITRATION: {
      associate: "ACIMArb",
      member: "MCIMArb",
      fellow: "FCIMArb",
    },
    MEDIATION: {
      associate: "ACIMed",
      member: "MCIMed",
      fellow: "FCIMed",
    },
  };
  return prefixes[pathway][level as keyof typeof prefixes.ARBITRATION];
}

// Helper function to get certificate title
function getCertificateTitle(level: string): string {
  const titles = {
    associate: "Certificate of Associate Membership",
    member: "Certificate of Membership",
    fellow: "Certificate of Fellowship",
  };
  return titles[level as keyof typeof titles];
}

// Helper function to get description
function getDescription(level: string): string {
  const descriptions = {
    associate: "is an Associate Member of the Center",
    member: "is a Member of the Center",
    fellow: "is a Fellow of the Center",
  };
  return descriptions[level as keyof typeof descriptions];
}

// Loads a certificate image (crest/seal/signature) from the built static
// output first (fast, no network hop when the Express server has direct
// filesystem access to its own build), falling back to an HTTPS fetch of
// the deployed static asset if that fails — robust regardless of exactly
// how the server is hosted.
async function loadImageBytes(relPath: string): Promise<Buffer | null> {
  try {
    const localPath = path.join(process.cwd(), "dist", "public", relPath);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  } catch {
    // fall through to HTTP fallback
  }
  try {
    const appUrl = process.env.VITE_APP_URL || "https://cima-learn.vercel.app";
    const res = await fetch(`${appUrl}${relPath}`);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  } catch {
    // ignore, caller treats null as "skip this image"
  }
  return null;
}

// Generate certificate PDF server-side. Layout mirrors
// client/src/lib/certificate-generator.ts so an auto-emailed renewal
// certificate looks the same as one a member views/downloads in-app.
async function generateCertificatePDF(data: CertificateRequest): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const cx = pw / 2;

  const pathway = data.pathway || "ARBITRATION";
  const postNominal = getPostNominal(data.membership_level, pathway);
  const title = getCertificateTitle(data.membership_level);
  const description = getDescription(data.membership_level);

  const [crestBytes, sealBytes, sigBytes] = await Promise.all([
    loadImageBytes("/images/cima_crest.png"),
    loadImageBytes("/images/cima_seal.png"),
    loadImageBytes("/images/signature.png"),
  ]);

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Crest (matches client generator's coordinates)
  const crestW = 55;
  const crestH = 48;
  if (crestBytes) {
    doc.addImage(crestBytes, "PNG", (pw - crestW) / 2, 15, crestW, crestH);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text("The Center for International", cx, 72, { align: "center" });
  doc.text("Mediators and Arbitrators", cx, 80, { align: "center" });
  doc.setFontSize(11);
  doc.text("England & Wales", cx, 86, { align: "center" });

  // Certificate title
  doc.setFont("helvetica", "normal");
  doc.setFontSize(48);
  doc.setTextColor(190, 40, 40); 
  doc.text("Certificate of", cx, 110, { align: "center" });
  doc.text("Membership", cx, 128, { align: "center" });

  // Body text
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(14);
  doc.text("This is to certify that", cx, 148, { align: "center" });

  doc.setFontSize(28);
  doc.text(`${data.full_name} ${postNominal}`, cx, 165, { align: "center" });

  doc.setFontSize(14);
  doc.text(description, cx, 178, { align: "center" });

  doc.setFontSize(14);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiry_date)}`,
    cx,
    195,
    { align: "center" }
  );

  doc.setFontSize(12);
  doc.text("Given under the seal of the Center for", cx, 210, { align: "center" });
  doc.text("International Mediators and Arbitrators", cx, 217, { align: "center" });

  // Seal (matches client generator's coordinates)
  const sealSize = 52;
  const sealX = (pw - sealSize) / 2;
  const sealY = 225;
  if (sealBytes) {
    doc.addImage(sealBytes, "PNG", sealX, sealY, sealSize, sealSize);
  }

  // Signature + caption (matches client generator's coordinates)
  const sigW = 40;
  const sigH = 15;
  const sigX = 15;
  const sigY = 230;
  if (sigBytes) {
    doc.addImage(sigBytes, "PNG", sigX, sigY, sigW, sigH);
  }
  doc.setFontSize(9);
  const sigCx = sigX + sigW / 2;
  doc.text("Francesco Campagna FCIMArb", sigCx, sigY + sigH + 5, { align: "center" });
  doc.setFont("helvetica", "bolditalic");
  doc.text("President", sigCx, sigY + sigH + 10, { align: "center" });
  doc.setFont("helvetica", "normal");

  // Member ID block
  const rightCx = 175;
  doc.setFontSize(10);
  doc.text("Issued on", rightCx, 245, { align: "center" });
  doc.text(formatDate(data.issue_date), rightCx, 251, { align: "center" });
  doc.text("Member ID No:", rightCx, 262, { align: "center" });
  doc.text(data.member_id, rightCx, 268, { align: "center" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "This certificate must be returned to CIMA on cessation of Membership",
    cx,
    288,
    { align: "center" }
  );
  doc.text(
    "Company No.: 16140063 Registered in England & Wales",
    cx,
    292,
    { align: "center" }
  );

  // Return PDF as buffer
  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * POST /api/certificates/generate
 * Generates a certificate PDF and saves it to Supabase Storage
 * Authentication: Bearer token in Authorization header
 */
router.post("/generate", authenticateAPIKey, async (req: Request, res: Response) => {
  try {
    const data: CertificateRequest = req.body;

    // Validate required fields
    if (!data.member_id || !data.full_name || !data.membership_level || !data.issue_date || !data.expiry_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF(data);

    // Generate filename
    const filename = `certificates/${data.member_id}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from("certificates")
      .upload(filename, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload certificate to storage" });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from("certificates")
      .getPublicUrl(filename);

    const certificateUrl = urlData.publicUrl;

    // Update member record with new certificate URL
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ certificate_url: certificateUrl })
      .eq("member_id", data.member_id);

    if (updateError) {
      console.error("Member update error:", updateError);
      // Don't fail the request, just log the error
    }

    // Return certificate URL
    res.json({
      success: true,
      certificate_url: certificateUrl,
      member_id: data.member_id,
      filename: filename,
    });

    // Send email notification. Look this up against `members` (keyed by the
    // human-readable member_id code, which is what callers pass) rather than
    // `users` (keyed by a UUID) — members already carries email/full_name
    // directly, and the previous `.eq("id", data.member_id)` against `users`
    // could never match since data.member_id is never a users.id UUID.
    try {
      const { data: memberRow } = await supabaseAdmin
        .from("members")
        .select("email, full_name")
        .eq("member_id", data.member_id)
        .single();

      if (memberRow?.email) {
        await sendCertificateIssuedEmail({
          to: memberRow.email,
          firstName: (memberRow.full_name || "Member").split(" ")[0],
          fullName: memberRow.full_name || data.full_name,
          membershipLevel: data.membership_level,
          pathway: data.pathway || "ARBITRATION",
          memberId: data.member_id,
          expiryDate: data.expiry_date,
          certificateUrl,
          dashboardUrl: `${process.env.VITE_APP_URL || "https://cima-learn.vercel.app"}/dashboard`,
        });
      }
    } catch (emailError) {
      console.error("Failed to send certificate email:", emailError);
      // Don't fail the request if email fails
    }
  } catch (error) {
    console.error("Certificate generation error:", error);
    res.status(500).json({ error: "Failed to generate certificate" });
  }
});

/**
 * GET /api/certificates/health
 * Health check endpoint
 */
router.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "certificate-generation" });
});

export default router;

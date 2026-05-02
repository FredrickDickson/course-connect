/**
 * Certificate Generation Routes
 * Handles server-side certificate PDF generation for n8n workflow integration
 */

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";
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

  if (!apiKey || apiKey !== validKey) {
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

// Generate certificate PDF server-side
async function generateCertificatePDF(data: CertificateRequest): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const cx = pw / 2;
  
  const pathway = data.pathway || "ARBITRATION";
  const postNominal = getPostNominal(data.membership_level, pathway);
  const title = getCertificateTitle(data.membership_level);
  const description = getDescription(data.membership_level);

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Note: Images would need to be loaded from Supabase Storage or local files
  // For now, we'll use text placeholders
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

  // Member ID block
  const rightCx = 175;
  doc.setFont("helvetica", "normal");
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

    // Send email notification
    try {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("email, first_name, last_name")
        .eq("id", data.member_id)
        .single();

      if (user?.email) {
        await sendCertificateIssuedEmail({
          to: user.email,
          firstName: user.first_name || "Member",
          fullName: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
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

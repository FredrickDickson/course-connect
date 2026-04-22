/**
 * CIMA Certificate PDF Generator
 * Layout: Matches Reference (Abigail Nartey) 
 * Content: Professional / Corrected spelling
 */
import jsPDF from "jspdf";

export interface CertificateData {
  fullName: string;
  membershipLevel: "associate" | "member" | "fellow";
  memberId: string;
  issueDate: string;
  expiryDate: string;
}

const LEVEL_LABELS: Record<string, { title: string; description: string; postNominal: string }> = {
  associate: {
    title: "Certificate of\nMembership",
    description: "is an Associate Member of the Center",
    postNominal: "ACIMArb",
  },
  member: {
    title: "Certificate of\nMembership",
    description: "is a Member of the Center",
    postNominal: "MCIMArb",
  },
  fellow: {
    title: "Certificate of\nFellowship",
    description: "is a Fellow of the Center",
    postNominal: "FCIMArb",
  },
};

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

async function loadImageRaw(path: string): Promise<<Uint8Array | null> {
  try {
    const url = `${window.location.origin}${path}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    return null;
  }
}

export async function generateCertificatePDF(data: CertificateData): Promise<<jsPDF> {
  // Using Helvetica to match the clean Sans-Serif layout of the reference
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const cx = pw / 2;
  const level = LEVEL_LABELS[data.membershipLevel];

  const [crestBytes, sealBytes, sigBytes] = await Promise.all([
    loadImageRaw("/images/cima_crest.png"),
    loadImageRaw("/images/cima_seal.png"),
    loadImageRaw("/images/signature.png"),
  ]);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // ── CREST ──────────────────────────────────────────────
  const crestW = 55;
  const crestH = 48;
  if (crestBytes) {
    doc.addImage(crestBytes, "PNG", (pw - crestW) / 2, 15, crestW, crestH);
  }

  // ── ORG NAME (Sans-Serif, Regular Weight) ──────────────
  doc.setFont("helvetica", "normal"); 
  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text("The Center for International", cx, 72, { align: "center" });
  doc.text("Mediators and Arbitrators", cx, 80, { align: "center" });

  doc.setFontSize(11);
  doc.text("England & Wales", cx, 86, { align: "center" });

  // ── CERTIFICATE TITLE (Red, Sans-Serif) ────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(48);
  doc.setTextColor(190, 40, 40); 
  doc.text("Certificate of", cx, 110, { align: "center" });
  doc.text("Membership", cx, 128, { align: "center" });

  // ── BODY TEXT (Layout mimicking Abigail's certificate) ──
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  
  doc.setFontSize(14);
  doc.text("This is to certify that", cx, 148, { align: "center" });

  // Name is plain text (no bold) per reference
  doc.setFontSize(28);
  doc.text(`${data.fullName} ${level.postNominal}`, cx, 165, { align: "center" });

  doc.setFontSize(14);
  doc.text(level.description, cx, 178, { align: "center" });

  doc.setFontSize(14);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiryDate)}`,
    cx,
    195,
    { align: "center" }
  );

  // Layout spacing maintained, spelling corrected
  doc.setFontSize(12);
  doc.text("Given under the seal of the Center for", cx, 210, { align: "center" });
  doc.text("International Mediators and Arbitrators", cx, 217, { align: "center" });

  // ── BOTTOM ROW (Alignment & Margins) ───────────────────
  const sealSize = 52;
  const sealX = (pw - sealSize) / 2;
  const sealY = 225;
  if (sealBytes) {
    doc.addImage(sealBytes, "PNG", sealX, sealY, sealSize, sealSize);
  }

  // Signature (Shifted to left margin)
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

  // Member ID Block (Plain text, higher vertical anchor)
  const rightCx = 175;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Issued on", rightCx, 245, { align: "center" });
  doc.text(formatDate(data.issueDate), rightCx, 251, { align: "center" });

  doc.text("Member ID No:", rightCx, 262, { align: "center" });
  doc.text(data.memberId, rightCx, 268, { align: "center" });

  // ── FOOTER ─────────────────────────────────────────────
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

  return doc;
}

export async function downloadCertificate(data: CertificateData) {
  const doc = await generateCertificatePDF(data);
  doc.save(`CIMA_Certificate_${data.memberId}.pdf`);
}
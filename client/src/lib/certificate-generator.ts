/**
 * CIMA Certificate PDF Generator
 * Matches the official CIMA membership certificate design exactly.
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
  const ordinal = day === 1 || day === 21 || day === 31 ? "st" :
                  day === 2 || day === 22 ? "nd" :
                  day === 3 || day === 23 ? "rd" : "th";
  const months = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  return `${day}${ordinal} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Load image as raw Uint8Array — avoids data URL encoding issues with jsPDF.
 */
async function loadImageRaw(path: string): Promise<Uint8Array | null> {
  try {
    const url = `${window.location.origin}${path}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Image fetch failed: ${path} (${res.status})`);
      return null;
    }
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (e) {
    console.warn(`Image load error: ${path}`, e);
    return null;
  }
}

export async function generateCertificatePDF(data: CertificateData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const level = LEVEL_LABELS[data.membershipLevel];

  // Load all images as raw bytes in parallel
  const [crestBytes, sealBytes, sigBytes] = await Promise.all([
    loadImageRaw("/images/cima_logo.png"),
    loadImageRaw("/images/cima_seal.png"),
    loadImageRaw("/images/signature.png"),
  ]);

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Coat of Arms crest
  const crestW = 55;
  const crestH = 45;
  if (crestBytes) {
    doc.addImage(crestBytes, "PNG", (pw - crestW) / 2, 18, crestW, crestH);
  }

  // Organization name
  doc.setFont("times", "normal");
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("The Center for International", pw / 2, 74, { align: "center" });
  doc.text("Mediators and Arbitrators", pw / 2, 83, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text("England & Wales", pw / 2, 92, { align: "center" });

  // Certificate title — large red italic
  doc.setFont("times", "bolditalic");
  doc.setFontSize(42);
  doc.setTextColor(185, 28, 28);
  const titleLines = level.title.split("\n");
  let titleY = 114;
  titleLines.forEach((line) => {
    doc.text(line, pw / 2, titleY, { align: "center" });
    titleY += 18;
  });

  // "This is to certify that"
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("This is to certify that", pw / 2, titleY + 12, { align: "center" });

  // Member name
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.setTextColor(30, 30, 30);
  doc.text(data.fullName, pw / 2, titleY + 30, { align: "center" });

  // Description
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text(level.description, pw / 2, titleY + 40, { align: "center" });

  // Validity
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiryDate)}`,
    pw / 2,
    titleY + 56,
    { align: "center" }
  );

  // "Given under the seal"
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.text("Given under the seal of the Center for", pw / 2, titleY + 72, { align: "center" });
  doc.text("International Mediators and Arbitrators", pw / 2, titleY + 80, { align: "center" });

  // === Bottom section ===
  const bottomY = 250;

  // Signature image (left)
  const sigW = 38;
  const sigH = 18;
  if (sigBytes) {
    doc.addImage(sigBytes, "PNG", 45 - sigW / 2, bottomY - 20, sigW, sigH);
  }

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Francesco Campagna FCIMArb", 45, bottomY, { align: "center" });
  doc.setFont("times", "bolditalic");
  doc.setFontSize(10);
  doc.text("President", 45, bottomY + 5, { align: "center" });

  // Red wax seal (center)
  const sealSize = 42;
  if (sealBytes) {
    doc.addImage(sealBytes, "PNG", (pw - sealSize) / 2, bottomY - 22, sealSize, sealSize);
  }

  // Issue date and Member ID (right)
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text("Issued on", 170, bottomY - 10, { align: "center" });
  doc.text(formatDate(data.issueDate), 170, bottomY - 4, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("Member ID No:", 170, bottomY + 6, { align: "center" });
  doc.setFontSize(15);
  doc.text(data.memberId, 170, bottomY + 13, { align: "center" });

  // Footer
  doc.setFont("times", "italic");
  doc.setFontSize(8);
  doc.setTextColor(185, 28, 28);
  doc.text(
    "This certificate must be returned to CIMA on cessation of Membership",
    pw / 2,
    278,
    { align: "center" }
  );
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Company No.: 16140063 Registered in England & Wales",
    pw / 2,
    283,
    { align: "center" }
  );

  return doc;
}

export async function downloadCertificate(data: CertificateData) {
  const doc = await generateCertificatePDF(data);
  doc.save(`CIMA_Certificate_${data.memberId}.pdf`);
}

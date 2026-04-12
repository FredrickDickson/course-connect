/**
 * CIMA Certificate PDF Generator
 * Matches the official CIMA membership certificate design exactly.
 */
import jsPDF from "jspdf";

interface CertificateData {
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

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load image: ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateCertificatePDF(data: CertificateData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const level = LEVEL_LABELS[data.membershipLevel];

  // Load all images as base64 data URLs
  const [crestData, sealData, signatureData] = await Promise.all([
    loadImageAsBase64("/images/cima_logo.png"),
    loadImageAsBase64("/images/cima_seal.png"),
    loadImageAsBase64("/images/signature.png"),
  ]);

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Coat of Arms crest
  const crestW = 55;
  const crestH = 45;
  doc.addImage(crestData, (pw - crestW) / 2, 18, crestW, crestH);

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
  doc.addImage(signatureData, "PNG", 45 - sigW / 2, bottomY - 20, sigW, sigH);

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Francesco Campagna FCIMArb", 45, bottomY, { align: "center" });
  doc.setFont("times", "bolditalic");
  doc.setFontSize(10);
  doc.text("President", 45, bottomY + 5, { align: "center" });

  // Red wax seal (center)
  const sealSize = 42;
  doc.addImage(sealData, "PNG", (pw - sealSize) / 2, bottomY - 22, sealSize, sealSize);

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
  try {
    const doc = await generateCertificatePDF(data);
    doc.save(`CIMA_Certificate_${data.memberId}.pdf`);
  } catch (error) {
    console.error("Certificate generation failed:", error);
    throw error;
  }
}

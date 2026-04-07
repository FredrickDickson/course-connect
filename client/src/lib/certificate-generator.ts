/**
 * CIMA Certificate PDF Generator
 * Matches the official CIMA membership certificate design exactly:
 * - Clean white background (no borders/ornaments)
 * - Coat of arms crest at top
 * - Organization name + "England & Wales"
 * - Certificate title in red italic
 * - Member name, description, validity, seal text
 * - Bottom: signature (left), red wax seal (center), issued/ID (right)
 * - Footer disclaimer
 */
import jsPDF from "jspdf";
import crestUrl from "@/assets/cima-crest.png";
import sealUrl from "@/assets/cima-seal.png";

interface CertificateData {
  fullName: string;
  membershipLevel: "associate" | "member" | "fellow";
  memberId: string;
  issueDate: string;
  expiryDate: string;
}

const LEVEL_LABELS: Record<string, { title: string; description: string; postNominal: string }> = {
  associate: {
    title: "Certificate of\nAssociate Membership",
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
  const day = date.getDate();
  const ordinal = day === 1 || day === 21 || day === 31 ? "st" :
                  day === 2 || day === 22 ? "nd" :
                  day === 3 || day === 23 ? "rd" : "th";
  const months = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  return `${day}${ordinal} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function loadImage(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function generateCertificatePDF(data: CertificateData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210; // page width
  const level = LEVEL_LABELS[data.membershipLevel];

  const [crestData, sealData] = await Promise.all([
    loadImage(crestUrl),
    loadImage(sealUrl),
  ]);

  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Coat of Arms crest — large, centered at top
  const crestW = 60;
  const crestH = 50;
  doc.addImage(crestData, "PNG", (pw - crestW) / 2, 18, crestW, crestH);

  // Organization name
  doc.setFont("times", "normal");
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("The Center for International", pw / 2, 78, { align: "center" });
  doc.text("Mediators and Arbitrators", pw / 2, 87, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text("England & Wales", pw / 2, 96, { align: "center" });

  // Certificate title — large red italic
  doc.setFont("times", "bolditalic");
  doc.setFontSize(42);
  doc.setTextColor(185, 28, 28);
  const titleLines = level.title.split("\n");
  let titleY = 118;
  titleLines.forEach((line) => {
    doc.text(line, pw / 2, titleY, { align: "center" });
    titleY += 18;
  });

  // "This is to certify that"
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("This is to certify that", pw / 2, titleY + 14, { align: "center" });

  // Member name — large elegant
  doc.setFont("times", "normal");
  doc.setFontSize(32);
  doc.setTextColor(30, 30, 30);
  doc.text(data.fullName, pw / 2, titleY + 34, { align: "center" });

  // Description — italic
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(level.description, pw / 2, titleY + 46, { align: "center" });

  // Validity line
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiryDate)}`,
    pw / 2,
    titleY + 64,
    { align: "center" }
  );

  // "Given under the seal" text
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.text("Given under the seal of the Center for", pw / 2, titleY + 82, { align: "center" });
  doc.text("International Mediators and Arbitrators", pw / 2, titleY + 90, { align: "center" });

  // === Bottom section ===
  const bottomY = 248;

  // Signature (left side) — hand-drawn style strokes
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.6);
  const sigX = 45;
  const sigY = bottomY - 12;
  // Approximate signature curves
  const pts = [
    [sigX - 18, sigY + 3], [sigX - 12, sigY - 6], [sigX - 6, sigY + 2],
    [sigX, sigY - 4], [sigX + 6, sigY + 3], [sigX + 12, sigY - 3],
    [sigX + 18, sigY + 1],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    doc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
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
  doc.addImage(sealData, "PNG", (pw - sealSize) / 2, bottomY - 22, sealSize, sealSize);

  // Issue date and Member ID (right side)
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

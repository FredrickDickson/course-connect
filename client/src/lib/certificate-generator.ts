/**
 * CIMA Certificate PDF Generator
 * Generates official membership certificates matching CIMA's design
 * with coat of arms, red wax seal, member details, and signature
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
  const pageWidth = 210;
  const level = LEVEL_LABELS[data.membershipLevel];

  // Load images in parallel
  const [crestData, sealData] = await Promise.all([
    loadImage(crestUrl),
    loadImage(sealUrl),
  ]);

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Decorative double border (red)
  doc.setDrawColor(185, 28, 28);
  doc.setLineWidth(1.5);
  doc.rect(12, 12, 186, 273);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 267);

  // Corner ornaments (small red L-shapes at each corner)
  const corners = [
    { x: 12, y: 12, dx: 1, dy: 1 },
    { x: 198, y: 12, dx: -1, dy: 1 },
    { x: 12, y: 285, dx: 1, dy: -1 },
    { x: 198, y: 285, dx: -1, dy: -1 },
  ];
  doc.setLineWidth(2);
  corners.forEach(({ x, y, dx, dy }) => {
    doc.line(x, y, x + dx * 8, y);
    doc.line(x, y, x, y + dy * 8);
  });

  // Coat of Arms crest image
  const crestW = 55;
  const crestH = 42;
  doc.addImage(crestData, "PNG", (pageWidth - crestW) / 2, 22, crestW, crestH);

  // Organization name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("The Center for International", pageWidth / 2, 72, { align: "center" });
  doc.text("Mediators and Arbitrators", pageWidth / 2, 80, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("England & Wales", pageWidth / 2, 88, { align: "center" });

  // Certificate title (large red script)
  doc.setFont("times", "bolditalic");
  doc.setFontSize(38);
  doc.setTextColor(185, 28, 28);
  const titleLines = level.title.split("\n");
  let titleY = 108;
  titleLines.forEach((line) => {
    doc.text(line, pageWidth / 2, titleY, { align: "center" });
    titleY += 16;
  });

  // "This is to certify that"
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text("This is to certify that", pageWidth / 2, titleY + 12, { align: "center" });

  // Member name (large, elegant)
  doc.setFont("times", "normal");
  doc.setFontSize(30);
  doc.setTextColor(30, 30, 30);
  doc.text(data.fullName, pageWidth / 2, titleY + 32, { align: "center" });

  // Description line
  doc.setFont("times", "italic");
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(level.description, pageWidth / 2, titleY + 45, { align: "center" });

  // Validity line
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiryDate)}`,
    pageWidth / 2,
    titleY + 60,
    { align: "center" }
  );

  // "Given under the seal" text
  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.text("Given under the seal of the Center for", pageWidth / 2, titleY + 75, { align: "center" });
  doc.text("International Mediators and Arbitrators", pageWidth / 2, titleY + 82, { align: "center" });

  // Bottom section
  const bottomY = 242;

  // Signature (left side) - cursive-style line
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  // Signature scribble approximation
  const sigX = 42;
  const sigY = bottomY - 8;
  doc.setLineWidth(0.5);
  // Simple curved signature strokes
  const sigPoints = [
    [sigX - 15, sigY + 2], [sigX - 10, sigY - 4], [sigX - 5, sigY + 1],
    [sigX, sigY - 3], [sigX + 5, sigY + 2], [sigX + 10, sigY - 2],
    [sigX + 15, sigY + 1],
  ];
  for (let i = 0; i < sigPoints.length - 1; i++) {
    doc.line(sigPoints[i][0], sigPoints[i][1], sigPoints[i + 1][0], sigPoints[i + 1][1]);
  }

  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text("Francesco Campagna FCIMArb", 42, bottomY + 2, { align: "center" });
  doc.setFont("times", "bolditalic");
  doc.setFontSize(9);
  doc.text("President", 42, bottomY + 7, { align: "center" });

  // Red wax seal (center)
  const sealSize = 38;
  doc.addImage(sealData, "PNG", (pageWidth - sealSize) / 2, bottomY - 20, sealSize, sealSize);

  // Issue date and Member ID (right side)
  doc.setTextColor(40, 40, 40);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("Issued on", 168, bottomY - 10, { align: "center" });
  doc.text(formatDate(data.issueDate), 168, bottomY - 5, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("Member ID No:", 168, bottomY + 3, { align: "center" });
  doc.setFontSize(12);
  doc.text(data.memberId, 168, bottomY + 10, { align: "center" });

  // Footer
  doc.setFont("times", "italic");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This certificate must be returned to CIMA on cessation of Membership",
    pageWidth / 2,
    275,
    { align: "center" }
  );
  doc.text(
    "Company No.: 16140063 Registered in England & Wales",
    pageWidth / 2,
    279,
    { align: "center" }
  );

  return doc;
}

export async function downloadCertificate(data: CertificateData) {
  const doc = await generateCertificatePDF(data);
  doc.save(`CIMA_Certificate_${data.memberId}.pdf`);
}

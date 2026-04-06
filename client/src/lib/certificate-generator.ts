/**
 * CIMA Certificate PDF Generator
 * Generates official-looking membership certificates matching CIMA's design
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

export function generateCertificatePDF(data: CertificateData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const level = LEVEL_LABELS[data.membershipLevel];

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Decorative border
  doc.setDrawColor(185, 28, 28);
  doc.setLineWidth(1.5);
  doc.rect(12, 12, 186, 273);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 267);

  // CIMA text header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(185, 28, 28);
  doc.text("CIMA", pageWidth / 2, 35, { align: "center" });

  // Organization name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text("The Center for International", pageWidth / 2, 50, { align: "center" });
  doc.text("Mediators and Arbitrators", pageWidth / 2, 58, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("England & Wales", pageWidth / 2, 66, { align: "center" });

  // Certificate title
  doc.setFont("times", "italic");
  doc.setFontSize(36);
  doc.setTextColor(185, 28, 28);
  const titleLines = level.title.split("\n");
  let titleY = 90;
  titleLines.forEach((line) => {
    doc.text(line, pageWidth / 2, titleY, { align: "center" });
    titleY += 16;
  });

  // Certify text
  doc.setFont("times", "normal");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text("This is to certify that", pageWidth / 2, titleY + 15, { align: "center" });

  // Member name
  doc.setFont("times", "normal");
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  doc.text(data.fullName, pageWidth / 2, titleY + 35, { align: "center" });

  // Description
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(60, 60, 60);
  doc.text(level.description, pageWidth / 2, titleY + 48, { align: "center" });

  // Validity
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(
    `This certificate is valid until ${formatDate(data.expiryDate)}`,
    pageWidth / 2,
    titleY + 63,
    { align: "center" }
  );

  // Given under seal
  doc.setFontSize(11);
  doc.text("Given under the seal of the Center for", pageWidth / 2, titleY + 78, { align: "center" });
  doc.text("International Mediators and Arbitrators", pageWidth / 2, titleY + 85, { align: "center" });

  // Bottom section
  const bottomY = 240;

  // Signature (left)
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Francesco Campagna FCIMArb", 45, bottomY, { align: "center" });
  doc.setFont("times", "bolditalic");
  doc.text("President", 45, bottomY + 5, { align: "center" });

  // Draw a signature-like line
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(25, bottomY - 5, 65, bottomY - 5);

  // Seal area (center) - draw a red circle seal
  doc.setFillColor(185, 28, 28);
  doc.circle(pageWidth / 2, bottomY - 5, 14, "F");
  doc.setFillColor(160, 20, 20);
  doc.circle(pageWidth / 2, bottomY - 5, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("CENTER FOR INTERNATIONAL", pageWidth / 2, bottomY - 12, { align: "center" });
  doc.text("MEDIATORS AND ARBITRATORS", pageWidth / 2, bottomY - 9, { align: "center" });

  // Scale icon in seal (simplified)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  // Vertical line
  doc.line(pageWidth / 2, bottomY - 7, pageWidth / 2, bottomY + 2);
  // Horizontal bar
  doc.line(pageWidth / 2 - 6, bottomY - 5, pageWidth / 2 + 6, bottomY - 5);
  // Scale pans (simplified circles)
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2 - 5, bottomY - 2, 2, "S");
  doc.circle(pageWidth / 2 + 5, bottomY - 2, 2, "S");

  // Issue date and Member ID (right)
  doc.setTextColor(40, 40, 40);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("Issued on", 165, bottomY - 10, { align: "center" });
  doc.text(formatDate(data.issueDate), 165, bottomY - 5, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.text("Member ID No:", 165, bottomY + 3, { align: "center" });
  doc.text(data.memberId, 165, bottomY + 9, { align: "center" });

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

export function downloadCertificate(data: CertificateData) {
  const doc = generateCertificatePDF(data);
  doc.save(`CIMA_Certificate_${data.memberId}.pdf`);
}

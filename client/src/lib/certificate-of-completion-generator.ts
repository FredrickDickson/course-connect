/**
 * Adjunct Course - Certificate of Completion PDF Generator
 * Shares the CIMA-branded template (crest, seal, signature, footer) with
 * the professional membership certificate, but does not confer Associate,
 * Member, or Fellow status - no post-nominal, no "cessation of Membership"
 * language.
 */
import jsPDF from "jspdf";

export interface CertificateOfCompletionData {
  fullName: string;
  courseName: string;
  issueDate: string;
  certificationId: string;
}

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

async function loadImageRaw(path: string): Promise<Uint8Array | null> {
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

export async function generateCertificateOfCompletionPDF(
  data: CertificateOfCompletionData,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const cx = pw / 2;

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

  // ── ORG NAME ────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text("The Center for International", cx, 72, { align: "center" });
  doc.text("Mediators and Arbitrators", cx, 80, { align: "center" });

  doc.setFontSize(11);
  doc.text("England & Wales", cx, 86, { align: "center" });

  // ── CERTIFICATE TITLE (distinct from membership - no "Membership" wording) ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(48);
  doc.setTextColor(190, 40, 40);
  doc.text("Certificate of", cx, 110, { align: "center" });
  doc.text("Completion", cx, 128, { align: "center" });

  // ── BODY TEXT ────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);

  doc.setFontSize(14);
  doc.text("This is to certify that", cx, 148, { align: "center" });

  // No post-nominal - this certificate does not confer membership status
  doc.setFontSize(28);
  doc.text(data.fullName, cx, 165, { align: "center" });

  doc.setFontSize(14);
  doc.text("has successfully completed the", cx, 178, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`Certificate in ${data.courseName}`, cx, 189, { align: "center" });
  doc.setFont("helvetica", "normal");

  doc.setFontSize(12);
  doc.text("Given under the seal of the Center for", cx, 206, { align: "center" });
  doc.text("International Mediators and Arbitrators", cx, 213, { align: "center" });

  // ── BOTTOM ROW ───────────────────────────────────────────
  const sealSize = 52;
  const sealX = (pw - sealSize) / 2;
  const sealY = 225;
  if (sealBytes) {
    doc.addImage(sealBytes, "PNG", sealX, sealY, sealSize, sealSize);
  }

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

  // Certificate No. block (no Member ID - this isn't a membership record)
  const rightCx = 175;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Issued on", rightCx, 245, { align: "center" });
  doc.text(formatDate(data.issueDate), rightCx, 251, { align: "center" });

  doc.text("Certificate No:", rightCx, 262, { align: "center" });
  doc.text(data.certificationId.slice(0, 8).toUpperCase(), rightCx, 268, { align: "center" });

  // ── FOOTER (no "must be returned to CIMA on cessation of Membership" -
  //    this is a completion certificate, not a membership record) ─────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "Company No.: 16140063 Registered in England & Wales",
    cx,
    292,
    { align: "center" }
  );

  return doc;
}

export async function downloadCertificateOfCompletion(
  data: CertificateOfCompletionData,
) {
  const doc = await generateCertificateOfCompletionPDF(data);
  doc.save(`Certificate_of_Completion_${data.certificationId.slice(0, 8)}.pdf`);
}

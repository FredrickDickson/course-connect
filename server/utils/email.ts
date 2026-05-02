/**
 * Email Utility
 * Centralized email sending using the send-email Edge Function
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase credentials not configured");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface EmailData {
  to: string | string[];
  subject: string;
  template: string;
  templateData: Record<string, any>;
  from?: string;
}

/**
 * Load email template and replace placeholders
 */
function loadTemplate(templateName: string, data: Record<string, any>): string {
  const templatePath = path.join(__dirname, "../../email-templates", `${templateName}.html`);
  
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    throw new Error(`Email template not found: ${templateName}`);
  }
  
  let template = fs.readFileSync(templatePath, "utf-8");
  
  // Replace simple {{variable}} placeholders
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    template = template.replace(new RegExp(placeholder, "g"), String(value));
  }
  
  // Handle conditional blocks {{#if condition}}...{{/if}}
  template = template.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    return data[condition] ? content : "";
  });
  
  return template;
}

/**
 * Send email using the send-email Edge Function
 */
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, subject, template, templateData, from } = emailData;
    
    // Load and process template
    const html = loadTemplate(template, templateData);
    
    // Call Edge Function
    const { data, error } = await supabaseAdmin.functions.invoke("send-email", {
      body: {
        to,
        subject,
        html,
        from: from || "CIMA Learn <noreply@thecima.org>",
      },
    });
    
    if (error) {
      console.error("Edge Function error:", error);
      return { success: false, error: error.message };
    }
    
    console.log(`Email sent successfully to ${Array.isArray(to) ? to.join(", ") : to} - template: ${template}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email send error:", message);
    return { success: false, error: message };
  }
}

/**
 * Send enrollment success email
 */
export async function sendEnrollmentSuccessEmail(data: {
  to: string;
  firstName: string;
  courseTitle: string;
  enrollmentLevel: string;
  enrollmentDate: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Welcome to CIMA Learn - Enrollment Confirmed",
    template: "enrollment-success",
    templateData: data,
  });
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(data: {
  to: string;
  firstName: string;
  itemName: string;
  amount: string;
  currency: string;
  reference: string;
  paymentDate: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Payment Received - CIMA Learn",
    template: "payment-confirmation",
    templateData: data,
  });
}

/**
 * Send certificate issued email
 */
export async function sendCertificateIssuedEmail(data: {
  to: string;
  firstName: string;
  fullName: string;
  membershipLevel: string;
  pathway: string;
  memberId: string;
  expiryDate: string;
  certificateUrl: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Your Certificate is Ready - CIMA Learn",
    template: "certificate-issued",
    templateData: data,
  });
}

/**
 * Send admin approval email
 */
export async function sendAdminApprovalEmail(data: {
  to: string;
  firstName: string;
  assignedLevel: string;
  pathway: string;
  approvedDate: string;
  reviewComments?: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Application Approved - CIMA Learn",
    template: "admin-approval",
    templateData: data,
  });
}

/**
 * Send under review email
 */
export async function sendUnderReviewEmail(data: {
  to: string;
  firstName: string;
  applicationType: string;
  targetLevel: string;
  pathway: string;
  submittedDate: string;
  reviewComments?: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Application Under Review - CIMA Learn",
    template: "under-review",
    templateData: data,
  });
}

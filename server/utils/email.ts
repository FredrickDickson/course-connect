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
      headers: {
        Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
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

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(data: {
  to: string;
  firstName: string;
  membershipLevel?: string;
  isApproved: boolean;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Welcome to CIMA Learn!",
    template: "welcome",
    templateData: data,
  });
}

/**
 * Send application rejection email
 */
export async function sendApplicationRejectionEmail(data: {
  to: string;
  firstName: string;
  targetLevel: string;
  isRejected: boolean;
  rejectionReason?: string;
  alternativeLevel?: string;
  alternativeOfferUrl?: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Application Update - CIMA Learn",
    template: "application-rejection",
    templateData: data,
  });
}

/**
 * Send failed payment email
 */
export async function sendFailedPaymentEmail(data: {
  to: string;
  firstName: string;
  itemName: string;
  amount: string;
  currency: string;
  reference: string;
  attemptDate: string;
  failureReason: string;
  retryAvailable: boolean;
  maxRetriesReached?: boolean;
  retryUrl?: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Payment Issue - CIMA Learn",
    template: "payment-failed",
    templateData: data,
  });
}

/**
 * Send course completion email
 */
export async function sendCourseCompletionEmail(data: {
  to: string;
  firstName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: string;
  duration: string;
  grade?: string;
  gradeComments?: string;
  certificateAvailable: boolean;
  certificateUrl?: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Course Completed - CIMA Learn",
    template: "course-completion",
    templateData: data,
  });
}

/**
 * Send progress report email
 */
export async function sendProgressReportEmail(data: {
  to: string;
  firstName: string;
  reportPeriod: string;
  currentLevel: string;
  coursesCompleted: number;
  totalHours: number;
  progressScore: number;
  streakDays: number;
  achievements?: Array<{
    icon: string;
    title: string;
    description: string;
    earnedDate: string;
  }>;
  recommendations?: Array<{
    type: string;
    title: string;
    description: string;
  }>;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Learning Progress Report - CIMA Learn",
    template: "progress-report",
    templateData: data,
  });
}

/**
 * Send assignment due reminder email
 */
export async function sendAssignmentDueEmail(data: {
  to: string;
  firstName: string;
  assignmentTitle: string;
  courseTitle: string;
  dueDate: string;
  timeRemaining: string;
  estimatedDuration: string;
  pointsValue: number;
  submissionFormat: string;
  fileSizeLimit: string;
  latePolicy: string;
  isUrgent: boolean;
  assignmentUrl: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Assignment Due Soon - CIMA Learn",
    template: "assignment-due",
    templateData: data,
  });
}

/**
 * Send grade posted email
 */
export async function sendGradePostedEmail(data: {
  to: string;
  firstName: string;
  assignmentTitle: string;
  courseTitle: string;
  grade: string;
  gradeLetter: string;
  gradeDescription: string;
  gradeColor: string;
  score: number;
  maxScore: number;
  percentage: number;
  submissionDate: string;
  gradedDate: string;
  hasFeedback: boolean;
  instructorFeedback?: string;
  strengths?: string[];
  improvements?: string[];
  assignmentUrl: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: data.to,
    subject: "Grade Posted - CIMA Learn",
    template: "grade-posted",
    templateData: data,
  });
}

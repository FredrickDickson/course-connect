/**
 * Vercel Serverless Function for POST /api/verify-payment
 * Verifies Paystack payment and creates enrollment
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

/**
 * Verify Paystack payment
 */
async function verifyPayment(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Payment verification failed');
  }

  return data;
}

/**
 * Create order record with payment details
 */
async function createOrder(
  userId: string,
  courseId: string,
  paymentData: any,
  metadata: any
) {
  const orderData = {
    user_id: userId,
    course_id: courseId,
    amount: (paymentData.amount / 100).toString(), // Charged amount in GHS
    currency: paymentData.currency, // GHS
    status: "completed",
    paystack_reference: paymentData.reference,
    // Currency conversion details from metadata
    amount_usd: metadata.amountUSD?.toString() || null,
    amount_ghs: metadata.amountGhs?.toString() || (paymentData.amount / 100).toString(),
    exchange_rate: metadata.exchangeRate?.toString() || null,
    original_currency: metadata.originalCurrency || "USD",
    charged_currency: metadata.chargedCurrency || paymentData.currency,
  };

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert(orderData)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Create enrollment after successful payment
 */
async function createEnrollment(
  userId: string,
  courseId: string,
  enrollmentLevel: string,
) {
  // Payment details are recorded on the orders table; enrollments only tracks
  // access state. Do NOT add payment_* columns here — they don't exist on
  // public.enrollments and the insert will fail.
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      progress: "0",
      status: "ACTIVE",
      enrollment_type: "COURSE",
      enrollment_level: enrollmentLevel || "ASSOCIATE",
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Log activity for course enrollment
 */
async function logActivity(
  userId: string,
  courseId: string,
  courseName: string,
  enrollmentId: string,
  paymentReference: string,
  metadata: any
) {
  const activityData = {
    user_id: userId,
    event_type: "course_enrolled",
    event_data: {
      course_id: courseId,
      course_name: courseName,
      enrollment_id: enrollmentId,
      payment_reference: paymentReference,
      payment_type: metadata.paymentType || "individual",
      ...(metadata.paymentType === "company_invoice" && {
        company_name: metadata.companyName,
        company_email: metadata.companyEmail,
        vat_id: metadata.vatId,
      }),
    },
  };

  const { error } = await supabaseAdmin
    .from("activity_log")
    .insert(activityData);

  if (error) throw error;
}

/**
 * Update course enrollment count
 */
async function updateCourseEnrollmentCount(courseId: string) {
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("enrollment_count")
    .eq("id", courseId)
    .maybeSingle();

  const newCount = (course?.enrollment_count || 0) + 1;

  const { error } = await supabaseAdmin
    .from("courses")
    .update({ enrollment_count: newCount })
    .eq("id", courseId);

  if (error) throw error;
}

/**
 * Verify JWT token from Supabase
 */
async function verifyAuth(authHeader: string): Promise<{ userId: string; email: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization header');
  }

  const token = authHeader.substring(7);
  
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid token');
    }
    
    return {
      userId: user.id,
      email: user.email || '',
    };
  } catch (error) {
    throw new Error('Token verification failed');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization || '';
    const { userId } = await verifyAuth(authHeader);

    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' });
    }

    // Verify payment with Paystack
    const paymentData = await verifyPayment(reference);

    if (!paymentData.status || paymentData.status !== 'success') {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment not successful' 
      });
    }

    // Get payment metadata
    const metadata = paymentData.data.metadata;
    const courseId = metadata?.courseId;
    const enrollmentLevel = metadata?.enrollmentLevel || 'ASSOCIATE';

    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Course information missing' 
      });
    }

    // Check if enrollment already exists
    const { data: existingEnrollment } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (existingEnrollment) {
      return res.json({
        success: true,
        message: 'Already enrolled',
        data: paymentData.data,
      });
    }

    // Create order record
    await createOrder(userId, courseId, paymentData.data, metadata);

    // Create enrollment (payment details live on the orders row)
    const enrollment = await createEnrollment(
      userId,
      courseId,
      enrollmentLevel,
    );

    // Log activity
    await logActivity(
      userId,
      courseId,
      metadata.courseName || 'Unknown Course',
      enrollment.id,
      paymentData.data.reference,
      metadata
    );

    // Update course enrollment count
    await updateCourseEnrollmentCount(courseId);

    return res.json({
      success: true,
      message: 'Payment verified and enrollment created',
      data: paymentData.data,
    });

  } catch (error: any) {
    console.error('Payment verification error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

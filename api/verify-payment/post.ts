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
 * Create enrollment after successful payment
 */
async function createEnrollment(
  userId: string,
  courseId: string,
  enrollmentLevel: string
) {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .insert({
      user_id: userId,
      course_id: courseId,
      enrollment_type: "COURSE",
      enrollment_level: enrollmentLevel,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
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

    // Create enrollment
    await createEnrollment(userId, courseId, enrollmentLevel);

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

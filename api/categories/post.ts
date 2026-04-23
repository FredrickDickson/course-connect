/**
 * Vercel Serverless Function for POST /api/categories
 * Creates a new category (admin only)
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

/**
 * Check if user is admin
 */
async function checkAdminRole(userId: string): Promise<boolean> {
  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return false;
  }

  return user.role === 'admin';
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

    // Check admin role
    const isAdmin = await checkAdminRole(userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, slug } = req.body;

    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 100) {
      return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
    }

    if (!slug || typeof slug !== 'string' || slug.length < 2 || slug.length > 100) {
      return res.status(400).json({ message: "Slug must be between 2 and 100 characters" });
    }

    // Create category
    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({
        name,
        description: description || null,
        slug,
      })
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }

    return res.status(201).json(data);

  } catch (error: any) {
    console.error('Category creation error:', error);
    
    if (error.message === 'No authorization header' || error.message === 'Invalid token' || error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

/**
 * Vercel Serverless Function for /api/qualification/professional-profile/documents
 * Handles document uploads for professional profiles
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client at module level
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
 * Get user's professional profile
 */
async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("professional_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("is_current", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Add document to professional profile
 */
async function addDocument(profileId: string, documentData: any) {
  const { data, error } = await supabaseAdmin
    .from("professional_documents")
    .insert({
      profile_id: profileId,
      document_type: documentData.documentType,
      file_url: documentData.fileUrl,
      storage_path: documentData.storagePath,
      original_name: documentData.fileName,
      file_size: documentData.fileSize,
      mime_type: documentData.mimeType,
      description: documentData.description,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization || '';
    const { userId } = await verifyAuth(authHeader);

    // Get user's profile
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'Please create your professional profile first'
      });
    }

    // POST - Add document
    if (req.method === 'POST') {
      const {
        documentType,
        fileName,
        originalName,
        fileUrl,
        storagePath,
        fileSize,
        mimeType,
        description,
      } = req.body ?? {};

      // Support both fileName and originalName (frontend sends originalName)
      const finalFileName = originalName || fileName;
      const finalStoragePath = storagePath || fileUrl;

      if (!documentType || !finalFileName || !fileUrl) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          message: 'documentType, fileName/originalName, and fileUrl are required'
        });
      }

      const document = await addDocument(profile.id, {
        documentType,
        fileName: finalFileName,
        fileUrl,
        storagePath: finalStoragePath,
        fileSize,
        mimeType,
        description,
      });

      return res.status(200).json(document);
    }

    // GET - List documents
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from("professional_documents")
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Professional documents error:', error);
    
    if (error.message === 'No authorization header' || 
        error.message === 'Invalid token' || 
        error.message === 'Token verification failed') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

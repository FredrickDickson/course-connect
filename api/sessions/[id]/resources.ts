import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user from auth header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id: sessionId } = req.query;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ message: 'Invalid session ID' });
  }

  try {
    if (req.method === 'GET') {
      // Get all resources for this session
      const { data: resources, error } = await supabase
        .from('course_resources')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(resources || []);
    }

    if (req.method === 'POST') {
      // Upload resource for session
      const form = formidable({
        maxFileSize: 50 * 1024 * 1024, // 50MB
        keepExtensions: true,
      });

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const file = Array.isArray(files.resource) ? files.resource[0] : files.resource;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title || file.originalFilename;

      // Upload to Supabase Storage (session-resources bucket)
      const fileName = `${sessionId}/${Date.now()}-${file.originalFilename}`;
      const fileBuffer = fs.readFileSync(file.filepath);

      const { error: uploadError } = await supabase.storage
        .from('session-resources')
        .upload(fileName, fileBuffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('session-resources')
        .getPublicUrl(fileName);

      // Save resource metadata to database
      const { data: resource, error: dbError } = await supabase
        .from('course_resources')
        .insert({
          session_id: sessionId,
          title: title,
          file_name: file.originalFilename || 'Unknown',
          file_url: urlData.publicUrl,
          file_type: file.mimetype || 'application/octet-stream',
          file_size: file.size,
          download_count: 0,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Clean up temp file
      fs.unlinkSync(file.filepath);

      return res.status(201).json(resource);
    }

    if (req.method === 'DELETE') {
      const { resourceId } = req.body;
      if (!resourceId) {
        return res.status(400).json({ message: 'Resource ID required' });
      }

      // Get resource to delete from storage
      const { data: resource } = await supabase
        .from('course_resources')
        .select('file_url')
        .eq('id', resourceId)
        .eq('session_id', sessionId)
        .single();

      if (resource?.file_url) {
        // Extract file path from URL
        const urlParts = resource.file_url.split('/session-resources/');
        if (urlParts.length > 1) {
          await supabase.storage
            .from('session-resources')
            .remove([urlParts[1]]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('course_resources')
        .delete()
        .eq('id', resourceId)
        .eq('session_id', sessionId);

      if (error) throw error;
      return res.json({ message: 'Resource deleted' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error: any) {
    console.error('Session resources API error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error' });
  }
}

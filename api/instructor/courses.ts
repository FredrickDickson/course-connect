/**
 * Vercel Serverless Function for POST /api/instructor/courses
 * Creates a new course for instructors
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Course schema validation
function validateCourseData(data: any) {
  const errors: string[] = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.length < 5 || data.title.length > 100) {
    errors.push('Title must be between 5 and 100 characters');
  }
  
  if (!data.subtitle || typeof data.subtitle !== 'string' || data.subtitle.length < 5 || data.subtitle.length > 200) {
    errors.push('Subtitle must be between 5 and 200 characters');
  }
  
  if (!data.description || typeof data.description !== 'string' || data.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!data.categoryId || typeof data.categoryId !== 'string') {
    errors.push('Category ID is required');
  }
  
  if (!data.level || !['associate', 'member', 'fellow'].includes(data.level)) {
    errors.push('Level must be associate, member, or fellow');
  }
  
  if (!data.track || !['ARBITRATION', 'MEDIATION'].includes(data.track)) {
    errors.push('Track must be ARBITRATION or MEDIATION');
  }
  
  if (typeof data.price !== 'number' || data.price < 0) {
    errors.push('Price must be a non-negative number');
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '));
  }
  
  return {
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    category_id: data.categoryId,
    level: data.level,
    track: data.track,
    price: data.price,
    currency: data.currency || 'USD',
    thumbnail_url: data.thumbnailUrl || null,
    is_published: data.isPublished || false,
    is_featured: data.isFeatured || false,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Initialize clients inside handler to avoid module-level env var issues
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseServiceKey: !!supabaseServiceKey,
    });
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Required environment variables are missing' 
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: 'Unauthorized — Invalid token' });
    }

    // Check if user is an instructor
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'instructor') {
      return res.status(403).json({ message: 'Access denied. Instructor role required.' });
    }

    // Validate and prepare course data
    const courseData = validateCourseData(req.body);

    // Create course
    const { data: course, error: createError } = await supabaseAdmin
      .from('courses')
      .insert({
        ...courseData,
        instructor_id: user.id,
        enrollment_count: 0,
        rating_count: 0,
        avg_rating: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Course creation error:', createError);
      return res.status(500).json({ 
        error: 'Failed to create course',
        message: createError.message 
      });
    }

    // Transform response to match frontend expectations
    const responseCourse = {
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      categoryId: course.category_id,
      level: course.level,
      track: course.track,
      price: course.price,
      currency: course.currency,
      thumbnailUrl: course.thumbnail_url,
      isPublished: course.is_published,
      isFeatured: course.is_featured,
      instructorId: course.instructor_id,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
    };

    return res.json(responseCourse);

  } catch (error: any) {
    console.error('Error:', error);
    
    if (error.message.includes('Title must be') || error.message.includes('Subtitle must be') || 
        error.message.includes('Description must be') || error.message.includes('Category ID') ||
        error.message.includes('Level must be') || error.message.includes('Track must be') ||
        error.message.includes('Price must be')) {
      return res.status(400).json({ error: 'Validation error', message: error.message });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

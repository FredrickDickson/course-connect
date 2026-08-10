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
  
  // Programme type validation
  if (!data.programmeType || !['PROFESSIONAL_PROGRAMME', 'ADJUNCT_COURSE'].includes(data.programmeType)) {
    errors.push('Programme type must be PROFESSIONAL_PROGRAMME or ADJUNCT_COURSE');
  }
  
  // Level and track only required for Professional Programme
  if (data.programmeType === 'PROFESSIONAL_PROGRAMME') {
    if (!data.level || !['associate', 'member', 'fellow'].includes(data.level)) {
      errors.push('Level must be associate, member, or fellow for Professional Programme');
    }
    
    if (!data.track || !['ARBITRATION', 'MEDIATION'].includes(data.track)) {
      errors.push('Track must be ARBITRATION or MEDIATION for Professional Programme');
    }
  }
  
  // Price can be string or number - convert to number
  const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
  if (typeof price !== 'number' || isNaN(price) || price < 0) {
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
    programme_type: data.programmeType,
    level: data.programmeType === 'ADJUNCT_COURSE' ? null : data.level,
    track: data.programmeType === 'ADJUNCT_COURSE' ? null : data.track,
    price: price,
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
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    }

    // Check user role
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      return res.status(500).json({ error: 'Database error', message: 'Failed to verify user role' });
    }

    if (!userData) {
      return res.status(404).json({ error: 'Not found', message: 'User profile not found' });
    }

    const currentUserRole = userData.role;
    const currentUserId = user.id;

    // Only instructors and admins can create courses
    if (currentUserRole !== 'instructor' && currentUserRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Access denied. Instructor or admin role required.' });
    }

    // Handle instructor ID logic
    const onBehalfOf = req.query.onBehalfOf as string | undefined;
    const instructors = req.body.instructors as Array<{
      name: string;
      title?: string;
      bio?: string;
      email?: string;
      profileImageUrl?: string;
      expertise?: string[];
      linkedinUrl?: string;
      websiteUrl?: string;
    }> | undefined;
    
    let instructorId: string | undefined;
    let createdByAdminId: string | undefined;
    
    // If admin is providing instructor details, create/find instructor user
    if (currentUserRole === 'admin' && instructors && instructors.length > 0) {
      const primaryInstructor = instructors[0];
      
      // Check if instructor exists by email
      if (primaryInstructor.email) {
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', primaryInstructor.email)
          .eq('role', 'instructor')
          .single();
        
        if (existingUser) {
          instructorId = existingUser.id;
        }
      }
      
      // If not found, create a new instructor user
      if (!instructorId) {
        const [firstName, ...lastNameParts] = primaryInstructor.name.trim().split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        const { data: newUser, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            email: primaryInstructor.email || `instructor-${Date.now()}@thecima.org`,
            first_name: firstName,
            last_name: lastName,
            role: 'instructor',
            profile_image_url: primaryInstructor.profileImageUrl || null,
          })
          .select()
          .single();
        
        if (userError) {
          console.error('Error creating instructor user:', userError);
          throw userError;
        }
        instructorId = newUser.id;
        
        // Create instructor profile
        const { error: profileError } = await supabaseAdmin
          .from('instructor_profiles')
          .insert({
            user_id: instructorId,
            bio: primaryInstructor.bio || null,
            title: primaryInstructor.title || null,
            expertise: primaryInstructor.expertise || [],
            website_url: primaryInstructor.websiteUrl || null,
            linkedin_url: primaryInstructor.linkedinUrl || null,
            profile_image_url: primaryInstructor.profileImageUrl || null,
            is_verified: false,
          });
        
        if (profileError) {
          console.error('Error creating instructor profile:', profileError);
          // Don't fail if profile creation fails
        }
      }
      
      createdByAdminId = currentUserId;
    } else if (currentUserRole === 'admin' && onBehalfOf) {
      // Admin creating for an existing instructor (legacy behavior)
      instructorId = onBehalfOf;
      createdByAdminId = currentUserId;
    } else if (currentUserRole === 'instructor' || currentUserRole === 'admin') {
      // Instructor creating their own course OR admin creating as instructor
      instructorId = currentUserId;
    } else {
      return res.status(403).json({ error: 'Forbidden', message: 'Must be instructor or admin' });
    }
    
    // Ensure instructorId is defined
    if (!instructorId) {
      return res.status(400).json({ error: 'Bad request', message: 'Instructor ID is required' });
    }

    // Validate and prepare course data
    const courseData = validateCourseData(req.body);

    // Create course
    const { data: course, error: createError } = await supabaseAdmin
      .from('courses')
      .insert({
        ...courseData,
        instructor_id: instructorId,
        enrollment_count: 0,
        rating_count: 0,
        avg_rating: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error('Course creation error:', createError);
      const message = createError.message.includes('duplicate') 
        ? 'A course with this information already exists'
        : createError.message;
      return res.status(500).json({ 
        error: 'Failed to create course',
        message 
      });
    }

    // Update admin tracking if applicable
    if (createdByAdminId) {
      const { error: updateError } = await supabaseAdmin
        .from('courses')
        .update({ created_by_admin_id: createdByAdminId })
        .eq('id', course.id);
      if (updateError) {
        console.error('Error updating admin tracking:', updateError);
        // Don't fail if this update fails
      }
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

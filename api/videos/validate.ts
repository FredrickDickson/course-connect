/**
 * Vercel Serverless Function for POST /api/videos/validate
 * Validates video URLs and extracts metadata
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

interface ValidationResult {
  valid: boolean;
  title?: string;
  duration?: string;
  thumbnail?: string;
  error?: string;
}

/**
 * Validate YouTube URL
 */
function validateYouTubeUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return { valid: false, error: 'Not a YouTube URL' };
    }

    // Extract video ID
    let videoId = '';
    if (hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.substring(1);
    }

    if (!videoId) {
      return { valid: false, error: 'Could not extract video ID' };
    }

    // For now, just validate the URL structure
    // In production, you might want to use YouTube API to get actual metadata
    return {
      valid: true,
      title: `YouTube Video (${videoId})`,
      duration: 'Unknown',
    };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate Vimeo URL
 */
function validateVimeoUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (!hostname.includes('vimeo.com')) {
      return { valid: false, error: 'Not a Vimeo URL' };
    }

    // Extract video ID from Vimeo URL
    const pathParts = urlObj.pathname.split('/');
    const videoId = pathParts[pathParts.length - 1];

    if (!videoId || !/^\d+$/.test(videoId)) {
      return { valid: false, error: 'Could not extract video ID' };
    }

    return {
      valid: true,
      title: `Vimeo Video (${videoId})`,
      duration: 'Unknown',
    };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate generic video URL
 */
function validateGenericVideoUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv'];
    const hasVideoExtension = videoExtensions.some(ext => pathname.endsWith(ext));
    
    if (!hasVideoExtension) {
      return { valid: false, error: 'URL does not point to a video file' };
    }

    return {
      valid: true,
      title: `Video (${urlObj.pathname.split('/').pop()})`,
      duration: 'Unknown',
    };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let result: ValidationResult;

    // Try different video providers
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      result = validateYouTubeUrl(url);
    } else if (url.includes('vimeo.com')) {
      result = validateVimeoUrl(url);
    } else {
      result = validateGenericVideoUrl(url);
    }

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('Video validation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}

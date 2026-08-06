/**
 * Video URL Validator and Extractor
 * Supports YouTube and Vimeo URL parsing and validation
 */

export interface VideoMetadata {
  platform: 'youtube' | 'vimeo' | 'mux';
  videoId: string;
  thumbnailUrl?: string;
  muxPlaybackId?: string;
}

export interface ValidationError {
  error: string;
  message: string;
}

/**
 * Validate and extract metadata from a video URL
 * @param url - The video URL to validate
 * @returns VideoMetadata or ValidationError
 */
export function validateAndExtractVideoUrl(url: string): VideoMetadata | ValidationError {
  if (!url || typeof url !== 'string') {
    return { error: 'INVALID_URL', message: 'URL is required' };
  }

  const trimmedUrl = url.trim();

  // Try YouTube first
  const youtubeResult = extractYouTubeInfo(trimmedUrl);
  if (youtubeResult) {
    return youtubeResult;
  }

  // Try Vimeo
  const vimeoResult = extractVimeoInfo(trimmedUrl);
  if (vimeoResult) {
    return vimeoResult;
  }

  // Try Mux
  const muxResult = extractMuxInfo(trimmedUrl);
  if (muxResult) {
    return muxResult;
  }

  return { 
    error: 'UNSUPPORTED_PLATFORM', 
    message: 'Only YouTube, Vimeo, and Mux URLs are supported' 
  };
}

/**
 * Extract YouTube video ID and generate thumbnail URL
 */
function extractYouTubeInfo(url: string): VideoMetadata | null {
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /youtube\.com\/watch\?[?&]v=([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // V URL: youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    // Shortened watch URL: youtu.be/VIDEO_ID
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      return {
        platform: 'youtube',
        videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  return null;
}

/**
 * Extract Vimeo video ID and generate thumbnail URL
 */
function extractVimeoInfo(url: string): VideoMetadata | null {
  const patterns = [
    // Standard URL
    /vimeo\.com\/(\d+)/,
    // Player URL
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      // Vimeo thumbnail requires API call, so we don't include it here
      // The frontend can fetch it if needed
      return {
        platform: 'vimeo',
        videoId,
      };
    }
  }

  return null;
}

/**
 * Extract Mux playback ID and metadata
 */
function extractMuxInfo(url: string): VideoMetadata | null {
  const patterns = [
    // Mux playback URL: https://stream.mux.com/playback/{PLAYBACK_ID}
    /stream\.mux\.com\/playback\/([a-zA-Z0-9_-]+)/,
    // Mux short URL: https://mux.com/playback/{PLAYBACK_ID}
    /mux\.com\/playback\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const muxPlaybackId = match[1];
      return {
        platform: 'mux',
        videoId: muxPlaybackId, // Use playback ID as video ID for consistency
        muxPlaybackId,
      };
    }
  }

  return null;
}

/**
 * Generate embed URL for a video
 */
export function generateEmbedUrl(platform: 'youtube' | 'vimeo' | 'mux', videoId: string): string {
  if (platform === 'youtube') {
    return `https://www.youtube.com/embed/${videoId}`;
  } else if (platform === 'vimeo') {
    return `https://player.vimeo.com/video/${videoId}`;
  } else if (platform === 'mux') {
    return `https://stream.mux.com/playback/${videoId}`;
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Check if a URL is from a supported platform
 */
export function isSupportedVideoUrl(url: string): boolean {
  const result = validateAndExtractVideoUrl(url);
  return !('error' in result);
}

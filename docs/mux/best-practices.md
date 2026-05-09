# Mux Best Practices for Course Connect

This guide covers recommended practices and optimizations for using Mux in your Course Connect application.

## Architecture Overview

### Recommended Setup

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend        │    │   Mux API       │
│                 │    │                  │    │                 │
│ - Player        │◄──►│ - Upload URLs    │◄──►│ - Assets        │
│ - Uploader      │    │ - Webhook Handler│    │ - Live Streams  │
│ - Progress      │    │ - Metadata Mgmt  │    │ - Analytics     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │   Database       │
                    │                  │
                    │ - Video Records  │
                    │ - User Data      │
                    │ - Progress       │
                    │ - Analytics      │
                    └──────────────────┘
```

## Security Best Practices

### 1. Access Token Management

```javascript
// Use environment variables
const MUX_CONFIG = {
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
  webhookSecret: process.env.MUX_WEBHOOK_SECRET
};

// Different tokens for different environments
const environments = {
  development: {
    tokenId: process.env.MUX_DEV_TOKEN_ID,
    tokenSecret: process.env.MUX_DEV_TOKEN_SECRET
  },
  production: {
    tokenId: process.env.MUX_PROD_TOKEN_ID,
    tokenSecret: process.env.MUX_PROD_TOKEN_SECRET
  }
};
```

### 2. Signed URLs for Restricted Content

```javascript
// Generate signed URLs for premium courses
function generateSignedUrl(playbackId, userId, courseId) {
  // Check if user has access to course
  const hasAccess = await checkCourseAccess(userId, courseId);
  
  if (!hasAccess) {
    throw new Error('Unauthorized access');
  }

  // Generate signed URL with expiration
  const expiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  return signPlaybackUrl(playbackId, signingKey, expiration);
}
```

### 3. CORS Configuration

```javascript
// Restrict CORS to your domains
const upload = await Video.Uploads.create({
  new_asset_settings: { /* ... */ },
  cors_origin: [
    'https://your-course-connect-app.com',
    'https://www.your-course-connect-app.com',
    'https://admin.your-course-connect-app.com'
  ]
});
```

## Performance Optimization

### 1. Lazy Loading Players

```jsx
// React example with intersection observer
import { useState, useRef, useEffect } from 'react';

function LazyVideoPlayer({ playbackId, metadata }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const playerRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (playerRef.current) {
      observer.observe(playerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={playerRef}>
      {shouldLoad && (
        <MuxPlayer
          playbackId={playbackId}
          metadata={metadata}
          preload="metadata"
        />
      )}
    </div>
  );
}
```

### 2. Adaptive Bitrate Configuration

```javascript
// Configure for different quality levels
const assetSettings = {
  input: videoUrl,
  playback_policy: ['public'],
  per_title_encode: true, // Optimize encoding per video
  max_resolution_tier: '1080p', // Limit max quality
  mp4_support: 'standard',
  normalize_audio: true
};

// For mobile users
const mobileAssetSettings = {
  ...assetSettings,
  max_resolution_tier: '720p'
};
```

### 3. Caching Strategy

```javascript
// Cache video metadata in Redis
const cacheKey = `video:${assetId}`;
const cachedMetadata = await redis.get(cacheKey);

if (cachedMetadata) {
  return JSON.parse(cachedMetadata);
}

const asset = await Video.Assets.get(assetId);
await redis.setex(cacheKey, 3600, JSON.stringify(asset)); // Cache for 1 hour
```

## Upload Optimization

### 1. Chunked Uploads

```javascript
// Configure chunk size based on file size
function getChunkSize(fileSize) {
  if (fileSize < 100 * 1024 * 1024) { // < 100MB
    return 10 * 1024 * 1024; // 10MB chunks
  } else if (fileSize < 500 * 1024 * 1024) { // < 500MB
    return 20 * 1024 * 1024; // 20MB chunks
  } else {
    return 50 * 1024 * 1024; // 50MB chunks
  }
}

const uploader = new MuxUploader({
  endpoint: uploadUrl,
  chunkSize: getChunkSize(file.size)
});
```

### 2. Resume Uploads

```javascript
// Store upload state in localStorage
class ResumableUploader {
  constructor(file, uploadUrl) {
    this.file = file;
    this.uploadUrl = uploadUrl;
    this.uploadId = this.getStoredUploadId();
  }

  getStoredUploadId() {
    return localStorage.getItem(`upload_${this.file.name}_${this.file.size}`);
  }

  storeUploadId(uploadId) {
    localStorage.setItem(`upload_${this.file.name}_${this.file.size}`, uploadId);
  }

  clearStoredUploadId() {
    localStorage.removeItem(`upload_${this.file.name}_${this.file.size}`);
  }

  async upload() {
    if (this.uploadId) {
      // Try to resume existing upload
      try {
        const upload = await Video.Uploads.get(this.uploadId);
        if (upload.status !== 'failed') {
          return this.resumeUpload(upload);
        }
      } catch (error) {
        // Upload doesn't exist, start fresh
        this.clearStoredUploadId();
      }
    }

    return this.startNewUpload();
  }
}
```

### 3. Upload Validation

```javascript
// Client-side validation before upload
function validateVideoFile(file, options = {}) {
  const {
    maxSize = 2 * 1024 * 1024 * 1024, // 2GB
    maxDuration = 4 * 60 * 60, // 4 hours
    allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  } = options;

  const errors = [];

  if (file.size > maxSize) {
    errors.push(`File size exceeds ${formatBytes(maxSize)} limit`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`);
  }

  // Check video duration if possible
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      if (video.duration > maxDuration) {
        errors.push(`Video duration exceeds ${formatDuration(maxDuration)} limit`);
      }
      resolve(errors);
    };
    
    video.onerror = () => {
      errors.push('Unable to read video metadata');
      resolve(errors);
    };
    
    video.src = URL.createObjectURL(file);
  });
}
```

## Analytics and Monitoring

### 1. Video Engagement Tracking

```javascript
// Track detailed viewer engagement
class VideoAnalytics {
  constructor(videoId, userId) {
    this.videoId = videoId;
    this.userId = userId;
    this.sessionId = this.generateSessionId();
    this.events = [];
    this.startTime = Date.now();
  }

  trackEvent(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      videoId: this.videoId,
      ...data
    };

    this.events.push(event);
    
    // Send events in batches
    if (this.events.length >= 10) {
      this.sendEvents();
    }
  }

  async sendEvents() {
    if (this.events.length === 0) return;

    try {
      await fetch('/api/analytics/video-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: this.events })
      });
      
      this.events = [];
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  // Track player events
  onPlay() {
    this.trackEvent('play');
  }

  onPause() {
    this.trackEvent('pause');
  }

  onSeek(from, to) {
    this.trackEvent('seek', { from, to });
  }

  onProgress(currentTime, duration) {
    const percentWatched = (currentTime / duration) * 100;
    this.trackEvent('progress', {
      currentTime,
      duration,
      percentWatched
    });
  }

  onComplete() {
    this.trackEvent('complete');
    this.sendEvents(); // Send remaining events
  }
}
```

### 2. Performance Monitoring

```javascript
// Monitor video performance metrics
class PerformanceMonitor {
  constructor(player) {
    this.player = player;
    this.metrics = {
      loadTime: null,
      startLatency: null,
      bufferEvents: [],
      qualityChanges: [],
      errors: []
    };
    
    this.setupMonitoring();
  }

  setupMonitoring() {
    const startTime = performance.now();

    this.player.addEventListener('loadstart', () => {
      this.metrics.loadTime = performance.now() - startTime;
    });

    this.player.addEventListener('canplay', () => {
      this.metrics.startLatency = performance.now() - startTime;
    });

    this.player.addEventListener('waiting', () => {
      this.metrics.bufferEvents.push({
        timestamp: Date.now(),
        type: 'buffer_start'
      });
    });

    this.player.addEventListener('playing', () => {
      const lastBuffer = this.metrics.bufferEvents
        .filter(e => e.type === 'buffer_start')
        .pop();
      
      if (lastBuffer) {
        this.metrics.bufferEvents.push({
          timestamp: Date.now(),
          type: 'buffer_end',
          duration: Date.now() - lastBuffer.timestamp
        });
      }
    });

    this.player.addEventListener('error', (event) => {
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: event.detail
      });
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      totalBufferTime: this.metrics.bufferEvents
        .filter(e => e.type === 'buffer_end')
        .reduce((sum, e) => sum + e.duration, 0)
    };
  }
}
```

## Cost Optimization

### 1. Smart Encoding

```javascript
// Optimize encoding settings for different content types
function getEncodingSettings(videoType, duration) {
  const baseSettings = {
    playback_policy: ['public'],
    normalize_audio: true
  };

  switch (videoType) {
    case 'lecture':
      return {
        ...baseSettings,
        per_title_encode: true,
        max_resolution_tier: '1080p',
        video_quality: 'high' // Higher quality for educational content
      };
    
    case 'demo':
      return {
        ...baseSettings,
        per_title_encode: true,
        max_resolution_tier: '720p', // Lower resolution for demos
        video_quality: 'medium'
      };
    
    case 'preview':
      return {
        ...baseSettings,
        per_title_encode: false,
        max_resolution_tier: '480p', // Lowest resolution for previews
        video_quality: 'low'
      };
    
    default:
      return baseSettings;
  }
}
```

### 2. Lifecycle Management

```javascript
// Automatically clean up old assets
async function cleanupOldAssets() {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12); // 1 year old

  // Get assets older than 1 year with no views
  const oldAssets = await db.videos.find({
    created_at: { $lt: cutoffDate },
    view_count: { $lt: 10 },
    status: 'ready'
  });

  for (const video of oldAssets) {
    // Archive instead of delete
    await Video.Assets.update(video.mux_asset_id, {
      playback_policy: ['signed'] // Restrict access
    });

    await db.videos.update(video.id, {
      status: 'archived'
    });
  }
}

// Run cleanup monthly
setInterval(cleanupOldAssets, 30 * 24 * 60 * 60 * 1000);
```

### 3. Usage Monitoring

```javascript
// Monitor Mux API usage and costs
class UsageMonitor {
  async getMonthlyUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = {
      storage: await this.getStorageUsage(startOfMonth),
      streaming: await this.getStreamingUsage(startOfMonth),
      encoding: await this.getEncodingUsage(startOfMonth)
    };

    return {
      ...usage,
      estimatedCost: this.calculateCost(usage)
    };
  }

  async getStorageUsage(startDate) {
    // Query Mux Data API for storage metrics
    const response = await fetch('https://api.mux.com/data/v1/metrics/storage', {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`
        ).toString('base64')}`
      }
    });

    return response.json();
  }

  calculateCost(usage) {
    // Mux pricing (example rates)
    const PRICING = {
      storage: 0.05, // per GB-month
      streaming: 0.005, // per GB delivered
      encoding: 0.0075 // per minute encoded
    };

    return {
      storage: usage.storage.total_gb * PRICING.storage,
      streaming: usage.streaming.total_gb * PRICING.streaming,
      encoding: usage.encoding.total_minutes * PRICING.encoding,
      total: 0 // Calculate total
    };
  }
}
```

## Error Handling and Resilience

### 1. Retry Logic

```javascript
// Exponential backoff retry for API calls
class MuxAPIClient {
  async makeRequest(endpoint, options = {}, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`https://api.mux.com/video/v1${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Basic ${Buffer.from(
              `${this.tokenId}:${this.tokenSecret}`
            ).toString('base64')}`,
            ...options.headers
          }
        });

        if (response.ok) {
          return response.json();
        }

        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = response.headers.get('Retry-After') || 60;
          await this.sleep(retryAfter * 1000);
          continue;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. Fallback Strategies

```jsx
// Fallback player if Mux fails
function VideoPlayer({ playbackId, fallbackUrl }) {
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (event) => {
    console.error('Mux player error:', event);
    
    // Try fallback after 3 errors
    if (event.detail.code === 4) { // Media source not supported
      setUseFallback(true);
    } else {
      setError('Video playback failed');
    }
  };

  if (useFallback) {
    return (
      <video controls style={{ width: '100%', maxWidth: '800px' }}>
        <source src={fallbackUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      <MuxPlayer
        playbackId={playbackId}
        onError={handleError}
        fallback={<div>Video loading...</div>}
      />
    </div>
  );
}
```

## Testing Strategy

### 1. Unit Tests

```javascript
// Test webhook handler
describe('Webhook Handler', () => {
  test('handles video.asset.ready event', async () => {
    const mockEvent = {
      type: 'video.asset.ready',
      object: {
        id: 'ASSET123',
        playback_ids: [{ id: 'PLAYBACK123' }],
        duration: 120.5
      }
    };

    await webhookHandler.handleAssetReady(mockEvent.object);

    expect(db.videos.update).toHaveBeenCalledWith(
      { mux_asset_id: 'ASSET123' },
      expect.objectContaining({
        status: 'ready',
        playback_id: 'PLAYBACK123',
        duration: 120.5
      })
    );
  });
});
```

### 2. Integration Tests

```javascript
// Test complete upload flow
describe('Video Upload Flow', () => {
  test('uploads video and processes successfully', async () => {
    // Create upload URL
    const uploadResponse = await request(app)
      .post('/api/upload-url')
      .send({
        courseId: '123',
        userId: '456',
        title: 'Test Video'
      })
      .expect(200);

    // Simulate upload completion webhook
    await request(app)
      .post('/api/webhooks/mux')
      .set('mux-signature', generateSignature(mockUploadEvent))
      .send(mockUploadEvent)
      .expect(200);

    // Verify video is in database
    const video = await db.videos.findOne({ upload_id: 'UPLOAD123' });
    expect(video).toBeTruthy();
    expect(video.status).toBe('processing');
  });
});
```

### 3. Load Testing

```javascript
// Load test video playback
async function loadTestPlayback() {
  const concurrentUsers = 100;
  const promises = [];

  for (let i = 0; i < concurrentUsers; i++) {
    promises.push(
      fetch(`/api/videos/${testVideoId}/stream`)
        .then(response => response.json())
        .then(data => {
          // Verify playback URL works
          expect(data.playbackUrl).toBeTruthy();
        })
    );
  }

  await Promise.all(promises);
  console.log(`Successfully handled ${concurrentUsers} concurrent users`);
}
```

## Deployment Considerations

### 1. Environment Configuration

```javascript
// config/mux.js
const config = {
  development: {
    tokenId: process.env.MUX_DEV_TOKEN_ID,
    tokenSecret: process.env.MUX_DEV_TOKEN_SECRET,
    webhookSecret: process.env.MUX_DEV_WEBHOOK_SECRET,
    environment: 'development'
  },
  staging: {
    tokenId: process.env.MUX_STAGING_TOKEN_ID,
    tokenSecret: process.env.MUX_STAGING_TOKEN_SECRET,
    webhookSecret: process.env.MUX_STAGING_WEBHOOK_SECRET,
    environment: 'staging'
  },
  production: {
    tokenId: process.env.MUX_PROD_TOKEN_ID,
    tokenSecret: process.env.MUX_PROD_TOKEN_SECRET,
    webhookSecret: process.env.MUX_PROD_WEBHOOK_SECRET,
    environment: 'production'
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

### 2. Health Checks

```javascript
// Health check endpoint
app.get('/health/mux', async (req, res) => {
  try {
    // Test Mux API connectivity
    const response = await fetch('https://api.mux.com/video/v1/assets', {
      headers: {
        'Authorization': `Basic ${Buffer.from(
          `${config.tokenId}:${config.tokenSecret}`
        ).toString('base64')}`
      }
    });

    const isHealthy = response.ok;
    
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      mux_api_status: response.status
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

## Monitoring and Alerting

### 1. Key Metrics to Monitor

- **API Response Times**: Average response time for Mux API calls
- **Upload Success Rate**: Percentage of successful uploads
- **Processing Time**: Time from upload to asset ready
- **Playback Success Rate**: Percentage of successful video plays
- **Error Rates**: Frequency of different error types
- **Cost Metrics**: Monthly usage and costs

### 2. Alert Configuration

```javascript
// Alert conditions
const alerts = {
  highErrorRate: {
    metric: 'error_rate',
    threshold: 5, // 5%
    window: '5m',
    action: 'notify_dev_team'
  },
  slowProcessing: {
    metric: 'processing_time',
    threshold: 1800, // 30 minutes
    window: '1h',
    action: 'notify_support'
  },
  highCosts: {
    metric: 'monthly_cost',
    threshold: 1000, // $1000
    window: '1mo',
    action: 'notify_finance'
  }
};
```

This comprehensive set of best practices will help ensure your Course Connect application uses Mux efficiently, securely, and cost-effectively while providing excellent user experience.

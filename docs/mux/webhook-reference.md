# Mux Webhook Reference

This document covers all webhook events provided by Mux for monitoring video processing, uploads, and live streaming in your Course Connect application.

## Overview

Webhooks are HTTP POST requests sent from Mux to your server when specific events occur. They enable real-time monitoring of:

- Asset processing status
- Upload progress and completion
- Live stream state changes
- Error notifications

## Webhook Setup

### Configure Webhook URL

1. Go to [Mux Dashboard](https://dashboard.mux.com/)
2. Navigate to Settings → Webhooks
3. Add your webhook endpoint URL
4. Select events to subscribe to
5. Save the webhook secret

### Webhook Secret

Each webhook includes a signature header for verification:
```
mux-signature: sha256=HASH_VALUE
```

### Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Express.js middleware
app.post('/api/webhooks/mux', (req, res) => {
  const signature = req.headers['mux-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.MUX_WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  handleWebhook(req.body);
  res.sendStatus(200);
});
```

## Asset Events

### video.asset.created

Sent when a new asset is created.

**Payload:**
```json
{
  "type": "video.asset.created",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234",
    "status": "preparing",
    "duration": null,
    "max_stored_resolution": null,
    "max_stored_frame_rate": null,
    "aspect_ratio": null,
    "playback_ids": [
      {
        "id": "PLAYBACK123",
        "policy": "public"
      }
    ],
    "tracks": [],
    "mp4_support": "standard",
    "normalize_audio": true,
    "test": false,
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Use Case for Course Connect:**
- Initialize video record in database
- Set initial status to "processing"
- Notify instructor that upload is being processed

### video.asset.ready

Sent when an asset is fully processed and ready for playback.

**Payload:**
```json
{
  "type": "video.asset.ready",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234",
    "status": "ready",
    "duration": 120.5,
    "max_stored_resolution": "1080p",
    "max_stored_frame_rate": 30,
    "aspect_ratio": "16:9",
    "playback_ids": [
      {
        "id": "PLAYBACK123",
        "policy": "public"
      }
    ],
    "tracks": [
      {
        "type": "video",
        "duration": 120.5,
        "width": 1920,
        "height": 1080,
        "frame_rate": 30,
        "bitrate": 5000000
      },
      {
        "type": "audio",
        "duration": 120.5,
        "sample_rate": 48000,
        "channels": 2,
        "bitrate": 128000
      }
    ],
    "mp4_support": "standard",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

**Use Case for Course Connect:**
- Update video status to "ready"
- Store duration and quality information
- Enable video playback for students
- Send notification to instructor

### video.asset.errored

Sent when asset processing fails.

**Payload:**
```json
{
  "type": "video.asset.errored",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234",
    "status": "errored",
    "errors": [
      {
        "type": "invalid_input",
        "messages": ["The input file is not a valid video format"]
      }
    ]
  }
}
```

**Use Case for Course Connect:**
- Mark video as failed in database
- Notify instructor about the error
- Provide guidance for fixing the issue

### video.asset.updated

Sent when asset metadata is updated.

**Payload:**
```json
{
  "type": "video.asset.updated",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234",
    "status": "ready",
    "metadata": {
      "title": "Updated Course Title",
      "description": "Updated description"
    }
  }
}
```

### video.asset.deleted

Sent when an asset is deleted.

**Payload:**
```json
{
  "type": "video.asset.deleted",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234"
  }
}
```

## Upload Events

### video.upload.created

Sent when a new direct upload is created.

**Payload:**
```json
{
  "type": "video.upload.created",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.upload",
    "id": "UPLOAD1234",
    "status": "waiting",
    "timeout": 3600,
    "new_asset_settings": {
      "playback_policy": ["public"],
      "mp4_support": "standard"
    }
  }
}
```

### video.upload.asset_created

Sent when an upload creates an asset.

**Payload:**
```json
{
  "type": "video.upload.asset_created",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.upload",
    "id": "UPLOAD1234",
    "asset_id": "ASSET1234"
  }
}
```

**Use Case for Course Connect:**
- Link upload to asset in database
- Update upload progress
- Start monitoring asset processing

### video.upload.cancelled

Sent when an upload is cancelled.

**Payload:**
```json
{
  "type": "video.upload.cancelled",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.upload",
    "id": "UPLOAD1234"
  }
}
```

### video.upload.errored

Sent when an upload fails.

**Payload:**
```json
{
  "type": "video.upload.errored",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.upload",
    "id": "UPLOAD1234",
    "errors": [
      {
        "type": "invalid_request",
        "messages": ["Upload timeout exceeded"]
      }
    ]
  }
}
```

## Live Stream Events

### video.live_stream.created

Sent when a new live stream is created.

**Payload:**
```json
{
  "type": "video.live_stream.created",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "idle",
    "stream_key": "sk_live_1234567890abcdef",
    "playback_ids": [
      {
        "id": "PLAYBACK123",
        "policy": "public"
      }
    ]
  }
}
```

### video.live_stream.connected

Sent when a live stream connects to the ingest server.

**Payload:**
```json
{
  "type": "video.live_stream.connected",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "active"
  }
}
```

**Use Case for Course Connect:**
- Notify students that live class has started
- Enable live chat functionality
- Update stream status in UI

### video.live_stream.recording

Sent when a live stream starts recording.

**Payload:**
```json
{
  "type": "video.live_stream.recording",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "active",
    "recent_asset_ids": ["ASSET1234"]
  }
}
```

### video.live_stream.active

Sent when a live stream is actively streaming.

**Payload:**
```json
{
  "type": "video.live_stream.active",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "active"
  }
}
```

### video.live_stream.disconnected

Sent when a live stream disconnects.

**Payload:**
```json
{
  "type": "video.live_stream.disconnected",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "idle"
  }
}
```

**Use Case for Course Connect:**
- Notify students that stream has ended
- Disable live chat
- Show recording availability

### video.live_stream.idle

Sent when a live stream is idle.

**Payload:**
```json
{
  "type": "video.live_stream.idle",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234",
    "status": "idle"
  }
}
```

### video.live_stream.deleted

Sent when a live stream is deleted.

**Payload:**
```json
{
  "type": "video.live_stream.deleted",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.live_stream",
    "id": "LIVE1234"
  }
}
```

## Static Renditions Events

### video.asset.static_renditions.ready

Sent when static MP4 renditions are ready.

**Payload:**
```json
{
  "type": "video.asset.static_renditions.ready",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset",
    "id": "ASSET1234",
    "static_renditions": {
      "status": "ready",
      "files": [
        {
          "name": "low.mp4",
          "ext": "mp4",
          "height": 480,
          "width": 854,
          "bitrate": 1000000,
          "file_size": 50000000,
          "duration": 120.5
        },
        {
          "name": "medium.mp4",
          "ext": "mp4",
          "height": 720,
          "width": 1280,
          "bitrate": 2500000,
          "file_size": 125000000,
          "duration": 120.5
        },
        {
          "name": "high.mp4",
          "ext": "mp4",
          "height": 1080,
          "width": 1920,
          "bitrate": 5000000,
          "file_size": 250000000,
          "duration": 120.5
        }
      ]
    }
  }
}
```

**Use Case for Course Connect:**
- Enable download functionality
- Update video quality options
- Notify about offline viewing availability

## Track Events

### video.asset.track.created

Sent when a new track is created for an asset.

**Payload:**
```json
{
  "type": "video.asset.track.created",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset.track",
    "id": "TRACK1234",
    "asset_id": "ASSET1234",
    "type": "text",
    "text_type": "subtitles",
    "language_code": "en",
    "name": "English"
  }
}
```

### video.asset.track.ready

Sent when a track is ready for use.

**Payload:**
```json
{
  "type": "video.asset.track.ready",
  "created_at": "2023-01-01T00:00:00Z",
  "object": {
    "type": "video.asset.track",
    "id": "TRACK1234",
    "asset_id": "ASSET1234",
    "type": "text",
    "text_type": "subtitles",
    "language_code": "en",
    "status": "ready"
  }
}
```

## Course Connect Implementation

### Webhook Handler

```javascript
// services/webhookHandler.js
class WebhookHandler {
  constructor() {
    this.handlers = {
      'video.asset.created': this.handleAssetCreated.bind(this),
      'video.asset.ready': this.handleAssetReady.bind(this),
      'video.asset.errored': this.handleAssetErrored.bind(this),
      'video.upload.asset_created': this.handleUploadAssetCreated.bind(this),
      'video.live_stream.connected': this.handleLiveStreamConnected.bind(this),
      'video.live_stream.disconnected': this.handleLiveStreamDisconnected.bind(this),
      'video.asset.static_renditions.ready': this.handleStaticRenditionsReady.bind(this)
    };
  }

  async handleWebhook(event) {
    const { type, object } = event;
    const handler = this.handlers[type];

    if (handler) {
      try {
        await handler(object);
      } catch (error) {
        console.error(`Error handling webhook ${type}:`, error);
        throw error;
      }
    } else {
      console.log(`No handler for webhook type: ${type}`);
    }
  }

  async handleAssetCreated(asset) {
    // Create or update video record
    await db.videos.upsert({
      mux_asset_id: asset.id,
      status: 'processing',
      created_at: new Date(asset.created_at),
      metadata: asset.metadata || {}
    });

    // Notify instructor
    await notifications.send(asset.metadata.instructor_id, {
      type: 'video_processing',
      message: 'Your video is being processed',
      asset_id: asset.id
    });
  }

  async handleAssetReady(asset) {
    // Update video record with playback information
    const video = await db.videos.update(
      { mux_asset_id: asset.id },
      {
        status: 'ready',
        playback_id: asset.playback_ids[0]?.id,
        duration: asset.duration,
        max_resolution: asset.max_stored_resolution,
        aspect_ratio: asset.aspect_ratio,
        ready_at: new Date()
      }
    );

    // Notify instructor and enrolled students
    await notifications.send(video.instructor_id, {
      type: 'video_ready',
      message: 'Your video is ready for viewing',
      video_id: video.id
    });

    // Send to enrolled students
    await notifications.sendToCourseEnrollments(video.course_id, {
      type: 'new_video_available',
      message: `New video available: ${video.title}`,
      video_id: video.id
    });
  }

  async handleAssetErrored(asset) {
    // Mark video as failed
    await db.videos.update(
      { mux_asset_id: asset.id },
      {
        status: 'error',
        error_message: asset.errors?.[0]?.messages?.[0] || 'Unknown error',
        failed_at: new Date()
      }
    );

    // Notify instructor with error details
    await notifications.send(asset.metadata.instructor_id, {
      type: 'video_error',
      message: `Video processing failed: ${asset.errors?.[0]?.messages?.[0]}`,
      asset_id: asset.id,
      error_details: asset.errors
    });
  }

  async handleUploadAssetCreated(upload) {
    // Link upload to asset
    await db.uploads.update(
      { mux_upload_id: upload.id },
      {
        mux_asset_id: upload.asset_id,
        status: 'processing'
      }
    );
  }

  async handleLiveStreamConnected(liveStream) {
    // Update live stream status
    await db.liveStreams.update(
      { mux_live_stream_id: liveStream.id },
      {
        status: 'live',
        started_at: new Date()
      }
    );

    // Notify enrolled students
    const stream = await db.liveStreams.findOne({ 
      mux_live_stream_id: liveStream.id 
    });

    await notifications.sendToCourseEnrollments(stream.course_id, {
      type: 'live_stream_started',
      message: `Live class has started: ${stream.title}`,
      stream_id: stream.id,
      playback_id: liveStream.playback_ids[0]?.id
    });

    // Enable live chat
    await chat.enableForStream(stream.id);
  }

  async handleLiveStreamDisconnected(liveStream) {
    // Update live stream status
    await db.liveStreams.update(
      { mux_live_stream_id: liveStream.id },
      {
        status: 'ended',
        ended_at: new Date()
      }
    );

    const stream = await db.liveStreams.findOne({ 
      mux_live_stream_id: liveStream.id 
    });

    // Notify students that stream has ended
    await notifications.sendToCourseEnrollments(stream.course_id, {
      type: 'live_stream_ended',
      message: `Live class has ended: ${stream.title}`,
      stream_id: stream.id
    });

    // Disable live chat
    await chat.disableForStream(stream.id);
  }

  async handleStaticRenditionsReady(asset) {
    // Enable download functionality
    const video = await db.videos.findOne({ 
      mux_asset_id: asset.id 
    });

    await db.videos.update(
      { mux_asset_id: asset.id },
      {
        downloads_enabled: true,
        download_options: asset.static_renditions.files.map(file => ({
          quality: file.height,
          size: file.file_size,
          url: `/api/videos/${video.id}/download/${file.name}`
        }))
      }
    );

    // Notify instructor
    await notifications.send(video.instructor_id, {
      type: 'downloads_ready',
      message: 'Video downloads are now available',
      video_id: video.id
    });
  }
}

module.exports = WebhookHandler;
```

### Express.js Webhook Endpoint

```javascript
// routes/webhooks.js
const express = require('express');
const crypto = require('crypto');
const WebhookHandler = require('../services/webhookHandler');

const router = express.Router();
const webhookHandler = new WebhookHandler();

// Webhook signature verification
function verifyWebhook(req, res, next) {
  const signature = req.headers['mux-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.MUX_WEBHOOK_SECRET;

  if (!signature || !payload || !secret) {
    return res.status(401).send('Missing required headers');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (`sha256=${expectedSignature}` !== signature) {
    return res.status(401).send('Invalid signature');
  }

  next();
}

// Webhook endpoint
router.post('/mux', verifyWebhook, async (req, res) => {
  try {
    await webhookHandler.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

// Test webhook endpoint
router.post('/mux/test', (req, res) => {
  console.log('Test webhook received:', req.body);
  res.sendStatus(200);
});

module.exports = router;
```

## Error Handling

### Retry Logic

```javascript
class WebhookHandler {
  async handleWebhook(event, retryCount = 0) {
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    try {
      await this.processWebhook(event);
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`Retrying webhook (${retryCount + 1}/${maxRetries}):`, error.message);
        
        setTimeout(() => {
          this.handleWebhook(event, retryCount + 1);
        }, retryDelay);
      } else {
        console.error('Webhook failed after max retries:', error);
        throw error;
      }
    }
  }
}
```

### Logging and Monitoring

```javascript
// services/webhookLogger.js
class WebhookLogger {
  static async logWebhook(event, status, error = null) {
    await db.webhookLogs.create({
      event_type: event.type,
      event_data: event,
      status, // 'received', 'processed', 'failed'
      error_message: error?.message,
      processed_at: new Date()
    });

    // Send to monitoring service
    if (status === 'failed') {
      await monitoring.alert({
        type: 'webhook_failure',
        event_type: event.type,
        error: error.message
      });
    }
  }

  static async getWebhookStats(timeRange = '24h') {
    return await db.webhookLogs.aggregate([
      {
        $match: {
          processed_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$event_type',
          count: { $sum: 1 },
          failures: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);
  }
}
```

## Testing

### Webhook Testing with ngrok

```bash
# Start ngrok for local testing
ngrok http 3000

# Use ngrok URL in Mux webhook configuration
# https://abc123.ngrok.io/api/webhooks/mux
```

### Test Webhook Payloads

```javascript
// test/webhookTest.js
const testWebhooks = {
  'video.asset.ready': {
    type: 'video.asset.ready',
    created_at: '2023-01-01T00:00:00Z',
    object: {
      type: 'video.asset',
      id: 'TEST_ASSET_123',
      status: 'ready',
      duration: 120.5,
      playback_ids: [{ id: 'TEST_PLAYBACK_123', policy: 'public' }]
    }
  }
};

// Send test webhook
async function sendTestWebhook(type) {
  const payload = testWebhooks[type];
  
  await fetch('http://localhost:3000/api/webhooks/mux/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

## Best Practices

1. **Always verify webhook signatures** before processing
2. **Use idempotent operations** - webhooks may be sent multiple times
3. **Implement retry logic** for failed processing
4. **Log all webhook events** for debugging and auditing
5. **Respond quickly** - Mux expects 200 OK within 10 seconds
6. **Use background jobs** for long-running processing
7. **Monitor webhook health** and set up alerts for failures
8. **Test thoroughly** with different event types
9. **Keep webhook handlers simple** and delegate complex logic
10. **Document webhook processing** for maintenance

## Troubleshooting

### Common Issues

1. **Webhook not received**
   - Check webhook URL is accessible
   - Verify SSL certificate is valid
   - Check firewall settings

2. **Signature verification fails**
   - Ensure you're using the correct secret
   - Check payload formatting (JSON.stringify)
   - Verify signature header format

3. **Processing timeouts**
   - Implement background jobs
   - Use queue systems for heavy processing
   - Respond quickly and process asynchronously

4. **Duplicate events**
   - Implement idempotent operations
   - Check if already processed before acting
   - Use database constraints to prevent duplicates

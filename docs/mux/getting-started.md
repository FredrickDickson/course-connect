# Getting Started with Mux

This guide covers the fundamental concepts and quick start instructions for integrating Mux into your Course Connect application.

## Core Concepts

### Organizations
An organization is your top-level Mux account containing:
- Environments (development, production, etc.)
- Team members and roles
- Billing settings

### Environments
Environments isolate your Mux resources:
- Separate development and production
- Organize by project or domain
- Each environment has isolated assets, tokens, and webhooks

### Access Tokens
Access tokens authenticate your API requests:
- Consist of Token ID and Token Secret
- Server-side only (never expose in client code)
- Mux only stores a hash - save your secret securely

### Assets
Assets are videos stored in Mux:
- Contain video, audio, and text tracks
- Have metadata (duration, resolution, etc.)
- Cannot be updated once created
- Status lifecycle: `preparing` → `ready` → `errored`

### Playback IDs
Playback IDs enable video streaming:
- Unique identifiers for each asset
- Support different policies (public, signed)
- Can create multiple per asset

### Live Streams
Live streams enable real-time broadcasting:
- Automatic transcoding and recording
- Stream keys for broadcasting software
- Simultaneous streaming to multiple platforms

## Stream Videos in Five Minutes

### 1. Get an API Access Token

Generate a new Access Token in your Mux dashboard:
1. Go to [Mux Dashboard](https://dashboard.mux.com/)
2. Navigate to Settings → Access Tokens
3. Create a new token with appropriate permissions
4. Save the Token ID and Token Secret securely

### 2. Upload a Video

Create an asset by POSTing to the `/assets` endpoint:

```bash
curl https://api.mux.com/video/v1/assets \
  -X POST \
  -H "Content-Type: application/json" \
  -u YOUR_TOKEN_ID:YOUR_TOKEN_SECRET \
  -d '{
    "input": "https://example.com/video.mp4",
    "playback_policy": "public"
  }'
```

Response:
```json
{
  "data": {
    "id": "ABCD1234",
    "status": "preparing",
    "playback_ids": [
      {
        "id": "EFGH5678",
        "policy": "public"
      }
    ]
  }
}
```

### 3. Wait for Ready

Monitor the asset status until it becomes `ready`:

```bash
curl https://api.mux.com/video/v1/assets/ABCD1234 \
  -u YOUR_TOKEN_ID:YOUR_TOKEN_SECRET
```

### 4. Watch Your Video

Use the playback ID to create a streaming URL:

```html
<script src="https://cdn.jsdelivr.net/npm/@mux/mux-player"></script>
<mux-player
  playback-id="EFGH5678"
  metadata-video-title="My Course Video"
  metadata-viewer-user-id="user123"
></mux-player>
```

## Make API Requests

### Using an SDK

Install the Mux SDK for your preferred language:

```bash
# Node.js
npm install @mux/mux-node

# Python
pip install mux-python

# Ruby
gem install mux-ruby

# PHP
composer require mux/mux-php
```

Example using Node.js:
```javascript
const Mux = require('@mux/mux-node');

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID,
  process.env.MUX_TOKEN_SECRET
);

// Create an asset
const asset = await Video.Assets.create({
  input: 'https://example.com/video.mp4',
  playback_policy: 'public'
});
```

### Using Postman

Import the Mux API collection into Postman:
1. Download the collection from Mux docs
2. Set environment variables for `TOKEN_ID` and `TOKEN_SECRET`
3. Start making API requests

## Listen for Webhooks

### Overview

Webhooks notify your application when events occur:
- Asset status changes
- Upload progress
- Live stream events
- Processing errors

### Verify Webhook Signatures

Always verify webhook signatures to ensure authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === `sha256=${digest}`;
}
```

### Common Webhook Events

- `video.asset.ready` - Asset is ready for playback
- `video.asset.errored` - Asset processing failed
- `video.upload.created` - Upload started
- `video.live_stream.active` - Live stream is active

## Security Considerations

### Content Security Policy

Add Mux domains to your CSP:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://cdn.jsdelivr.net;
               style-src 'self' 'unsafe-inline';
               media-src https://mux.com;">
```

### Token Security

- Store tokens in environment variables
- Use different tokens for different environments
- Rotate tokens regularly
- Never commit tokens to version control

### Playback Security

- Use `signed` playback policy for restricted content
- Implement proper authentication in your application
- Consider using signed URLs for time-limited access

## Next Steps

- Read the [API Reference](./api-reference.md) for detailed endpoint documentation
- Learn about [Player Integration](./player-integration.md) for embedding videos
- Understand [Webhook Handling](./webhook-reference.md) for real-time updates
- Review [Best Practices](./best-practices.md) for production deployments

## Troubleshooting

### Common Issues

1. **Asset stuck in "preparing" status**
   - Check input URL accessibility
   - Verify file format compatibility
   - Monitor webhook events for errors

2. **Playback not working**
   - Confirm asset status is "ready"
   - Check playback ID is correct
   - Verify playback policy allows access

3. **Webhook not receiving events**
   - Check webhook URL is accessible
   - Verify signature is correct
   - Ensure webhook is enabled in dashboard

### Getting Help

- [Mux Status Page](https://status.mux.com/)
- [Mux Support](https://support.mux.com/)
- [Developer Community](https://community.mux.com/)

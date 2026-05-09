# Mux API Reference

This document provides comprehensive API reference for Mux Video API endpoints relevant to the Course Connect application.

## Base URL

```
https://api.mux.com/video/v1
```

## Authentication

All API requests require authentication using HTTP Basic Auth with your Token ID as username and Token Secret as password.

```bash
curl https://api.mux.com/video/v1/assets \
  -u YOUR_TOKEN_ID:YOUR_TOKEN_SECRET
```

## Assets API

### Create Asset

Upload and process a new video asset.

**Endpoint:** `POST /assets`

**Request Body:**
```json
{
  "input": "https://example.com/video.mp4",
  "playback_policy": ["public"],
  "mp4_support": "standard",
  "normalize_audio": true,
  "test": false,
  "per_title_encode": false,
  "master_access": "temporary",
  "cors_origin": "*",
  "external_id": "course-123-video-1",
  "metadata": {
    "course_id": "123",
    "instructor_id": "456",
    "title": "Introduction to Course",
    "category": "education"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "ABCD1234",
    "created_at": "2023-01-01T00:00:00Z",
    "status": "preparing",
    "duration": null,
    "max_stored_resolution": null,
    "max_stored_frame_rate": null,
    "aspect_ratio": null,
    "per_title_encode": false,
    "is_live": false,
    "playback_ids": [
      {
        "id": "EFGH5678",
        "policy": "public"
      }
    ],
    "tracks": [],
    "mp4_support": "standard",
    "normalize_audio": true,
    "test": false,
    "master_access": "temporary",
    "static_renditions": {
      "status": "preparing",
      "files": []
    },
    "streaming_url": "https://stream.mux.com/ABCD1234.m3u8",
    "upload_id": null
  }
}
```

### Get Asset

Retrieve details of a specific asset.

**Endpoint:** `GET /assets/{ASSET_ID}`

**Response:** Same structure as create response with populated fields.

### List Assets

List all assets with optional filtering.

**Endpoint:** `GET /assets`

**Query Parameters:**
- `limit` (1-100): Number of items to return
- `page`: Page number for pagination
- `filters[]`: Filter by status, test, etc.
- `order_by`: Sort field (created_at, duration)
- `order_direction`: asc or desc

**Example:**
```bash
curl "https://api.mux.com/video/v1/assets?limit=10&filters[status]=ready" \
  -u YOUR_TOKEN_ID:YOUR_TOKEN_SECRET
```

### Update Asset

Update asset metadata.

**Endpoint:** `PATCH /assets/{ASSET_ID}`

**Request Body:**
```json
{
  "metadata": {
    "title": "Updated Course Title",
    "description": "Updated description"
  }
}
```

### Delete Asset

Permanently delete an asset.

**Endpoint:** `DELETE /assets/{ASSET_ID}`

## Live Streams API

### Create Live Stream

Create a new live stream for broadcasting.

**Endpoint:** `POST /live-streams`

**Request Body:**
```json
{
  "playback_policy": ["public"],
  "new_asset_settings": {
    "playback_policy": ["public"],
    "mp4_support": "standard",
    "normalize_audio": true
  },
  "reconnect_window": 60,
  "latency_mode": "low",
  "reduced_latency": false,
  "test": false,
  "simulcast_targets": [],
  "cors_origin": "*",
  "metadata": {
    "course_id": "123",
    "title": "Live Session - Chapter 1",
    "instructor": "John Doe"
  }
}
```

**Response:**
```json
{
  "data": {
    "id": "LIVE1234",
    "created_at": "2023-01-01T00:00:00Z",
    "stream_key": "sk_live_1234567890abcdef",
    "status": "idle",
    "reconnect_window": 60,
    "playback_ids": [
      {
        "id": "PLAYBACK123",
        "policy": "public"
      }
    ],
    "new_asset_settings": {},
    "latency_mode": "low",
    "reduced_latency": false,
    "test": false,
    "simulcast_targets": [],
    "recent_asset_ids": []
  }
}
```

### Get Live Stream

Retrieve live stream details.

**Endpoint:** `GET /live-streams/{LIVE_STREAM_ID}`

### List Live Streams

List all live streams.

**Endpoint:** `GET /live-streams`

### Update Live Stream

Update live stream settings.

**Endpoint:** `PATCH /live-streams/{LIVE_STREAM_ID}`

### Delete Live Stream

Delete a live stream.

**Endpoint:** `DELETE /live-streams/{LIVE_STREAM_ID}`

### Reset Stream Key

Generate a new stream key for security.

**Endpoint:** `POST /live-streams/{LIVE_STREAM_ID}/reset-stream-key`

## Uploads API

### Create Direct Upload

Create a direct upload URL for client-side uploads.

**Endpoint:** `POST /uploads`

**Request Body:**
```json
{
  "new_asset_settings": {
    "playback_policy": ["public"],
    "mp4_support": "standard",
    "normalize_audio": true,
    "metadata": {
      "course_id": "123",
      "title": "Student Upload"
    }
  },
  "test": false,
  "cors_origin": "*",
  "timeout": 3600
}
```

**Response:**
```json
{
  "data": {
    "id": "UPLOAD1234",
    "status": "waiting",
    "timeout": 3600,
    "new_asset_settings": {},
    "cors_origin": "*",
    "test": false,
    "url": "https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234",
    "upload_id": "UPLOAD1234"
  }
}
```

### Get Upload

Retrieve upload details.

**Endpoint:** `GET /uploads/{UPLOAD_ID}`

### Cancel Upload

Cancel an in-progress upload.

**Endpoint:** `DELETE /uploads/{UPLOAD_ID}`

## Playback IDs API

### Create Playback ID

Create a new playback ID for an asset.

**Endpoint:** `POST /assets/{ASSET_ID}/playback-ids`

**Request Body:**
```json
{
  "policy": "signed"
}
```

**Response:**
```json
{
  "data": {
    "id": "PLAYBACK456",
    "policy": "signed"
  }
}
```

### Delete Playback ID

Remove a playback ID.

**Endpoint:** `DELETE /assets/{ASSET_ID}/playback-ids/{PLAYBACK_ID}`

## Signing Keys API

### Create Signing Key

Create a key for signed URLs.

**Endpoint:** `POST /signing-keys`

**Response:**
```json
{
  "data": {
    "id": "SIGNING123",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

### List Signing Keys

List all signing keys.

**Endpoint:** `GET /signing-keys`

### Delete Signing Key

Delete a signing key.

**Endpoint:** `DELETE /signing-keys/{SIGNING_KEY_ID}`

## URL Signing

Generate signed URLs for secure playback:

```javascript
const crypto = require('crypto');

function signPlaybackUrl(playbackId, signingKey, expiration) {
  const key = signingKey.private_key;
  const expirationTime = Math.floor(Date.now() / 1000) + expiration;
  
  const params = new URLSearchParams({
    token: expirationTime,
    signature: ''
  });
  
  const stringToSign = `${playbackId}?${params.toString()}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(stringToSign)
    .sign(key, 'base64');
  
  return `https://stream.mux.com/${playbackId}.m3u8?token=${expirationTime}&signature=${signature}`;
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

### Error Response Format

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "The input parameter 'input' is required.",
    "code": "invalid_input",
    "param": "input"
  }
}
```

## Rate Limits

- **Standard**: 100 requests per minute
- **Burst**: Up to 200 requests in a short period
- **Rate limit headers** included in responses:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## SDK Examples

### Node.js

```javascript
const Mux = require('@mux/mux-node');

const { Video } = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET);

// Create asset
const asset = await Video.Assets.create({
  input: 'https://example.com/video.mp4',
  playback_policy: 'public'
});

// List assets
const assets = await Video.Assets.list({
  limit: 10,
  filters: { status: 'ready' }
});
```

### Python

```python
import mux

client = mux.Video(
    token_id=os.environ['MUX_TOKEN_ID'],
    token_secret=os.environ['MUX_TOKEN_SECRET']
)

# Create asset
asset = client.assets.create(
    input='https://example.com/video.mp4',
    playback_policy=['public']
)

# List assets
assets = client.assets.list(limit=10, filters={'status': 'ready'})
```

## Best Practices

1. **Use environment variables** for credentials
2. **Implement retry logic** for failed requests
3. **Monitor rate limits** using response headers
4. **Use webhooks** for status updates instead of polling
5. **Store asset IDs** in your database for reference
6. **Use signed URLs** for restricted content
7. **Implement proper error handling** for all API calls

## Testing

Use the `test: true` parameter to create test assets that don't incur charges:

```json
{
  "input": "https://example.com/video.mp4",
  "test": true
}
```

Test assets are automatically deleted after 24 hours.

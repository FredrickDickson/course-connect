# Mux Uploader Integration Guide

This guide covers integrating Mux Uploader into your Course Connect application for video uploads from instructors and students.

## Overview

Mux Uploader is a drop-in component that provides:
- Direct-to-Mux video uploads
- Progress tracking
- Error handling
- Customizable UI
- Multiple file support
- Chunked uploads for large files

## Installation

### HTML Element

Include via CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@mux/uploader"></script>
```

Or install via npm:
```bash
npm install @mux/uploader
```

### React Component

Install the React package:
```bash
npm install @mux/uploader-react
```

## Quick Start

### HTML Element

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mux/uploader"></script>
</head>
<body>
  <mux-uploader
    endpoint="https://api.mux.com/video/v1/uploads"
    id="my-uploader"
  ></mux-uploader>
</body>
</html>
```

### React Component

```jsx
import { MuxUploader } from '@mux/uploader-react';

function VideoUpload({ courseId, userId }) {
  return (
    <MuxUploader
      endpoint="https://api.mux.com/video/v1/uploads"
      id={`uploader-${courseId}-${userId}`}
      metadata={{
        course_id: courseId,
        user_id: userId,
        upload_type: 'student_submission'
      }}
    />
  );
}
```

## Server Setup

### Create Upload URL

Before uploading, create a direct upload URL on your server:

```javascript
// Node.js/Express example
const Mux = require('@mux/mux-node');
const { Video } = new Mux(process.env.MUX_TOKEN_ID, process.env.MUX_TOKEN_SECRET);

app.post('/api/upload-url', async (req, res) => {
  try {
    const { courseId, userId, title } = req.body;
    
    const upload = await Video.Uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
        normalize_audio: true,
        metadata: {
          course_id: courseId,
          user_id: userId,
          title: title || 'Untitled Video',
          upload_date: new Date().toISOString()
        }
      },
      cors_origin: process.env.FRONTEND_URL,
      test: process.env.NODE_ENV !== 'production'
    });

    res.json({
      upload_url: upload.url,
      upload_id: upload.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Webhook Handler

Set up webhook to handle upload completion:

```javascript
app.post('/api/webhooks/mux', (req, res) => {
  const signature = req.headers['mux-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.MUX_WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }

  const { type, data } = req.body;

  switch (type) {
    case 'video.upload.asset_created':
      // Upload completed and asset created
      handleUploadComplete(data);
      break;
    
    case 'video.asset.ready':
      // Asset is ready for playback
      handleAssetReady(data);
      break;
    
    case 'video.asset.errored':
      // Asset processing failed
      handleUploadError(data);
      break;
  }

  res.sendStatus(200);
});

function handleUploadComplete(data) {
  // Store upload information in database
  db.videos.create({
    upload_id: data.id,
    asset_id: data.asset_id,
    status: 'processing',
    created_at: new Date()
  });
}

function handleAssetReady(data) {
  // Update video record with playback information
  db.videos.update(
    { asset_id: data.id },
    {
      status: 'ready',
      playback_id: data.playback_ids[0].id,
      duration: data.duration,
      ready_at: new Date()
    }
  );
}
```

## Configuration Options

### Required Attributes

- `endpoint`: The upload URL (created via Mux API)

### Common Attributes

#### Basic Configuration
```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  id="course-video-uploader"
></mux-uploader>
```

#### Metadata
```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  metadata='{
    "course_id": "123",
    "user_id": "456",
    "title": "My Course Video",
    "category": "education"
  }'
></mux-uploader>
```

#### File Restrictions
```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  type="file"
  accept="video/*"
  max-file-size="2147483648"
></mux-uploader>
```

#### Customization
```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  no-drop="false"
  no-progress="false"
  no-retry="false"
  chunk-size="10485760"
></mux-uploader>
```

## React Integration

### Complete Upload Component

```jsx
import React, { useState, useRef } from 'react';
import { MuxUploader, MuxUploaderDrop } from '@mux/uploader-react';

function CourseVideoUpload({ courseId, userId, onUploadComplete }) {
  const [uploadUrl, setUploadUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const uploaderRef = useRef(null);

  // Get upload URL from server
  const getUploadUrl = async (title) => {
    try {
      const response = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userId,
          title
        })
      });
      
      const data = await response.json();
      setUploadUrl(data.upload_url);
      return data.upload_url;
    } catch (error) {
      console.error('Failed to get upload URL:', error);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const title = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    
    await getUploadUrl(title);
  };

  // Handle upload progress
  const handleProgress = (event) => {
    setProgress(event.detail.progress);
  };

  // Handle upload success
  const handleSuccess = (event) => {
    setUploading(false);
    setProgress(100);
    
    // Notify parent component
    if (onUploadComplete) {
      onUploadComplete({
        uploadId: event.detail.upload_id,
        fileName: event.detail.file.name
      });
    }
  };

  // Handle upload error
  const handleError = (event) => {
    setUploading(false);
    console.error('Upload error:', event.detail);
    alert('Upload failed. Please try again.');
  };

  return (
    <div className="video-upload-container">
      <h3>Upload Course Video</h3>
      
      {!uploadUrl ? (
        <div>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <p>Maximum file size: 2GB</p>
        </div>
      ) : (
        <div>
          <MuxUploader
            ref={uploaderRef}
            endpoint={uploadUrl}
            onUploadprogress={handleProgress}
            onUploadsuccess={handleSuccess}
            onUploaderror={handleError}
            metadata={{
              course_id: courseId,
              user_id: userId,
              upload_timestamp: Date.now()
            }}
          />
          
          {uploading && (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
              <span>{Math.round(progress)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseVideoUpload;
```

### Drag and Drop Upload

```jsx
import { MuxUploaderDrop } from '@mux/uploader-react';

function DragDropUpload({ courseId, userId }) {
  const [uploadUrl, setUploadUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = () => setIsDragging(true);
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = async () => {
    setIsDragging(false);
    // Get upload URL and handle file
  };

  return (
    <div 
      className={`drop-zone ${isDragging ? 'dragging' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <MuxUploaderDrop
        endpoint={uploadUrl}
        onDragenter={handleDragEnter}
        onDragleave={handleDragLeave}
      >
        <div className="drop-content">
          <p>Drag and drop video files here</p>
          <p>or click to browse</p>
        </div>
      </MuxUploaderDrop>
    </div>
  );
}
```

## Custom UI Components

### Custom Upload Button

```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  id="custom-uploader"
>
  <button slot="file-select" type="button">
    Choose Video File
  </button>
</mux-uploader>

<style>
mux-uploader::part(file-select) {
  background: #0066cc;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

mux-uploader::part(file-select):hover {
  background: #0052a3;
}
</style>
```

### Custom Progress Bar

```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  id="custom-uploader"
>
  <div slot="progress-bar">
    <div class="custom-progress">
      <div class="progress-fill"></div>
      <span class="progress-text">0%</span>
    </div>
  </div>
</mux-uploader>

<script>
const uploader = document.getElementById('custom-uploader');
const progressFill = uploader.querySelector('.progress-fill');
const progressText = uploader.querySelector('.progress-text');

uploader.addEventListener('uploadprogress', (event) => {
  const progress = event.detail.progress;
  progressFill.style.width = `${progress}%`;
  progressText.textContent = `${Math.round(progress)}%`;
});
</script>

<style>
.custom-progress {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #0066cc;
  transition: width 0.3s ease;
}

.progress-text {
  margin-left: 8px;
  font-size: 14px;
}
</style>
```

## Error Handling

### Common Upload Errors

```javascript
const uploader = document.getElementById('my-uploader');

uploader.addEventListener('uploaderror', (event) => {
  const error = event.detail;
  
  switch (error.type) {
    case 'file-too-large':
      alert('File size exceeds maximum limit (2GB)');
      break;
    
    case 'invalid-file-type':
      alert('Please select a valid video file');
      break;
    
    case 'network-error':
      alert('Network connection lost. Please try again.');
      break;
    
    case 'server-error':
      alert('Upload server error. Please try again later.');
      break;
    
    default:
      alert(`Upload failed: ${error.message}`);
  }
});
```

### Retry Logic

```jsx
function VideoUploadWithRetry() {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const handleError = (event) => {
    if (retryCount < maxRetries) {
      setRetryCount(retryCount + 1);
      setTimeout(() => {
        // Retry upload
        event.target.retry();
      }, 2000 * retryCount); // Exponential backoff
    } else {
      alert('Upload failed after multiple attempts');
    }
  };

  return (
    <MuxUploader
      endpoint={uploadUrl}
      onUploaderror={handleError}
      max-retries={maxRetries}
    />
  );
}
```

## File Validation

### Client-side Validation

```javascript
function validateVideoFile(file) {
  const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ];

  if (file.size > maxSize) {
    throw new Error('File size exceeds 2GB limit');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Unsupported video format');
  }

  return true;
}

// Usage
const fileInput = document.getElementById('video-input');
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  
  try {
    validateVideoFile(file);
    // Proceed with upload
  } catch (error) {
    alert(error.message);
    event.target.value = ''; // Clear input
  }
});
```

### Server-side Validation

```javascript
app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileSize, mimeType } = req.body;
    
    // Validate file size
    if (fileSize > 2 * 1024 * 1024 * 1024) {
      return res.status(400).json({ error: 'File too large' });
    }
    
    // Validate MIME type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Create upload URL
    const upload = await Video.Uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard'
      },
      cors_origin: process.env.FRONTEND_URL
    });
    
    res.json({ upload_url: upload.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Progress Tracking

### Real-time Progress

```jsx
function UploadProgress({ uploader }) {
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    let lastTime = Date.now();
    let lastLoaded = 0;

    const handleProgress = (event) => {
      const currentTime = Date.now();
      const currentLoaded = event.detail.loaded;
      const total = event.detail.total;
      
      // Calculate progress percentage
      const progressPercent = (currentLoaded / total) * 100;
      setProgress(progressPercent);
      
      // Calculate upload speed
      const timeDiff = (currentTime - lastTime) / 1000; // seconds
      const loadedDiff = currentLoaded - lastLoaded;
      const speed = loadedDiff / timeDiff; // bytes per second
      setUploadSpeed(formatBytes(speed));
      
      // Calculate time remaining
      const remainingBytes = total - currentLoaded;
      const remainingTime = remainingBytes / speed;
      setTimeRemaining(formatTime(remainingTime));
      
      lastTime = currentTime;
      lastLoaded = currentLoaded;
    };

    uploader.addEventListener('uploadprogress', handleProgress);
    
    return () => {
      uploader.removeEventListener('uploadprogress', handleProgress);
    };
  }, [uploader]);

  return (
    <div className="upload-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-details">
        <span>{Math.round(progress)}%</span>
        <span>{uploadSpeed}/s</span>
        {timeRemaining && <span>{timeRemaining} remaining</span>}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
```

## Course Connect Integration

### Complete Upload Flow

```jsx
// components/CourseVideoUploader.js
import React, { useState } from 'react';
import VideoUpload from './VideoUpload';
import api from '../utils/api';

function CourseVideoUploader({ courseId, userId, onVideoUploaded }) {
  const [uploadStep, setUploadStep] = useState('idle'); // idle, uploading, processing, ready
  const [uploadedVideo, setUploadedVideo] = useState(null);

  const handleUploadComplete = async (uploadData) => {
    setUploadStep('processing');
    
    try {
      // Save upload to database
      const video = await api.post('/videos', {
        courseId,
        userId,
        uploadId: uploadData.uploadId,
        fileName: uploadData.fileName,
        status: 'processing'
      });
      
      setUploadedVideo(video.data);
      
      // Poll for asset readiness
      pollForVideoReady(video.data.id);
      
    } catch (error) {
      console.error('Failed to save video:', error);
      setUploadStep('error');
    }
  };

  const pollForVideoReady = (videoId) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/videos/${videoId}`);
        const video = response.data;
        
        if (video.status === 'ready') {
          clearInterval(interval);
          setUploadStep('ready');
          setUploadedVideo(video);
          
          if (onVideoUploaded) {
            onVideoUploaded(video);
          }
        } else if (video.status === 'error') {
          clearInterval(interval);
          setUploadStep('error');
        }
      } catch (error) {
        console.error('Error polling video status:', error);
      }
    }, 5000); // Poll every 5 seconds
  };

  return (
    <div className="course-video-uploader">
      <h2>Upload Course Video</h2>
      
      {uploadStep === 'idle' && (
        <VideoUpload
          courseId={courseId}
          userId={userId}
          onUploadComplete={handleUploadComplete}
        />
      )}
      
      {uploadStep === 'uploading' && (
        <div className="upload-status">
          <p>Uploading video...</p>
        </div>
      )}
      
      {uploadStep === 'processing' && (
        <div className="upload-status">
          <p>Processing video... This may take a few minutes.</p>
          <div className="processing-animation">
            <div className="spinner"></div>
          </div>
        </div>
      )}
      
      {uploadStep === 'ready' && uploadedVideo && (
        <div className="upload-success">
          <h3>Video uploaded successfully!</h3>
          <p>Video ID: {uploadedVideo.id}</p>
          <p>Duration: {formatDuration(uploadedVideo.duration)}</p>
          <button onClick={() => onVideoUploaded(uploadedVideo)}>
            Add to Course
          </button>
        </div>
      )}
      
      {uploadStep === 'error' && (
        <div className="upload-error">
          <p>Upload failed. Please try again.</p>
          <button onClick={() => setUploadStep('idle')}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export default CourseVideoUploader;
```

## Security Considerations

### CORS Configuration

```javascript
// When creating upload URL
const upload = await Video.Uploads.create({
  new_asset_settings: { /* ... */ },
  cors_origin: 'https://your-course-connect-app.com' // Restrict to your domain
});
```

### File Size Limits

```javascript
// Enforce limits on both client and server
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Client-side
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}

// Server-side when creating upload
const upload = await Video.Uploads.create({
  new_asset_settings: { /* ... */ },
  timeout: 3600, // 1 hour timeout
});
```

### Authentication

```javascript
// Ensure only authenticated users can upload
app.post('/api/upload-url', authenticateUser, async (req, res) => {
  // User is authenticated, proceed with upload URL creation
});
```

## Testing

### Unit Testing Upload Component

```jsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import VideoUpload from './VideoUpload';

// Mock fetch
global.fetch = jest.fn();

test('upload component handles file selection', async () => {
  fetch.mockResolvedValueOnce({
    json: () => Promise.resolve({
      upload_url: 'https://test-upload-url.com'
    })
  });

  const { getByLabelText } = render(
    <VideoUpload courseId="123" userId="456" />
  );
  
  const fileInput = getByLabelText(/Choose video file/i);
  const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
  
  fireEvent.change(fileInput, { target: { files: [file] } });
  
  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('test')
    });
  });
});
```

## Troubleshooting

### Common Issues

1. **Upload gets stuck at 100%**
   - Check webhook configuration
   - Verify asset processing status
   - Check for processing errors

2. **CORS errors**
   - Ensure cors_origin is set correctly
   - Check browser console for specific CORS issues
   - Verify domain matches exactly

3. **Large file timeouts**
   - Increase timeout value when creating upload
   - Implement chunked uploads
   - Check network connectivity

4. **Upload fails intermittently**
   - Implement retry logic
   - Check network stability
   - Verify server capacity

### Debug Mode

```html
<mux-uploader
  endpoint="https://storage.googleapis.com/mux-uploads/uploads/UPLOAD1234"
  debug="true"
></mux-uploader>
```

This enables detailed logging in the browser console.

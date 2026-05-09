# Mux Player Integration Guide

This guide covers integrating Mux Player into your Course Connect application for video playback.

## Overview

Mux Player is a drop-in component that provides:
- Adaptive bitrate streaming
- Built-in controls and accessibility
- Performance optimization
- Analytics integration
- Customizable themes and branding

## Installation

### HTML Element

Include via CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/@mux/mux-player"></script>
```

Or install via npm:
```bash
npm install @mux/mux-player
```

### React Component

Install the React package:
```bash
npm install @mux/mux-player-react
```

## Quick Start

### HTML Element

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mux/mux-player"></script>
</head>
<body>
  <mux-player
    playback-id="EFGH5678"
    metadata-video-title="Course Introduction"
    metadata-viewer-user-id="user123"
    stream-type="on-demand"
    accent-color="#0066cc"
  ></mux-player>
</body>
</html>
```

### React Component

```jsx
import MuxPlayer from '@mux/mux-player-react';

function CourseVideo({ playbackId, title, userId }) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
        viewer_user_id: userId,
        video_series: "Course Connect",
        video_id: playbackId
      }}
      streamType="on-demand"
      accentColor="#0066cc"
      autoPlay={false}
      thumbnailTime={10}
    />
  );
}
```

## Configuration Options

### Required Attributes

- `playback-id`: The Mux playback ID for the video

### Common Attributes

#### Basic Configuration
```html
<mux-player
  playback-id="EFGH5678"
  stream-type="on-demand"
  accent-color="#0066cc"
  auto-play="false"
  muted="false"
  loop="false"
></mux-player>
```

#### Metadata for Analytics
```html
<mux-player
  playback-id="EFGH5678"
  metadata-video-title="Introduction to React"
  metadata-viewer-user-id="user123"
  metadata-video-series="Frontend Development"
  metadata-video-duration="1800"
></mux-player>
```

#### Playback Control
```html
<mux-player
  playback-id="EFGH5678"
  start-time="30"
  thumbnail-time="60"
  poster="https://example.com/thumbnail.jpg"
></mux-player>
```

#### Advanced Configuration
```html
<mux-player
  playback-id="EFGH5678"
  playback-token="jwt-token"
  custom-domain="video.yourapp.com"
  forward-seek-info="true"
  prefer-cmcd="true"
  target-live-window="0"
></mux-player>
```

## Live Streaming

### Live Stream Player
```html
<mux-player
  playback-id="LIVE1234"
  stream-type="live"
  live-edge-start="true"
  target-live-window="0"
></mux-player>
```

### Live Stream with DVR
```html
<mux-player
  playback-id="LIVE1234"
  stream-type="live"
  target-live-window="14400"
  live-edge-start="false"
></mux-player>
```

## Theming and Customization

### CSS Custom Properties
```css
mux-player {
  --mux-player-theme: light;
  --mux-player-accent-color: #0066cc;
  --mux-player-font-family: 'Inter', sans-serif;
  --mux-player-border-radius: 8px;
  --mux-player-controls-backdrop-color: rgba(0, 0, 0, 0.7);
}
```

### Built-in Themes
```html
<!-- Light theme -->
<mux-player playback-id="EFGH5678" theme="light"></mux-player>

<!-- Dark theme -->
<mux-player playback-id="EFGH5678" theme="dark"></mux-player>

<!-- Minimal theme -->
<mux-player playback-id="EFGH5678" theme="minimal"></mux-player>
```

### Custom Controls
```html
<mux-player
  playback-id="EFGH5678"
  no-hotkeys="true"
  no-seek-forward="true"
  no-seek-backward="true"
></mux-player>
```

## Responsive Design

### Aspect Ratio
```html
<mux-player
  playback-id="EFGH5678"
  style="aspect-ratio: 16/9; width: 100%;"
></mux-player>
```

### Responsive Container
```css
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-container mux-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

```html
<div class="video-container">
  <mux-player playback-id="EFGH5678"></mux-player>
</div>
```

## Advanced Features

### Chapters
```html
<mux-player
  playback-id="EFGH5678"
  chapters='[
    { "start": 0, "title": "Introduction" },
    { "start": 120, "title": "Main Content" },
    { "start": 600, "title": "Conclusion" }
  ]'
></mux-player>
```

### Subtitles and Captions
```html
<mux-player
  playback-id="EFGH5678"
  default-subtitle-lang="en"
  subtitles='[
    { "language": "en", "url": "/captions-en.vtt" },
    { "language": "es", "url": "/captions-es.vtt" }
  ]'
></mux-player>
```

### Ad Integration
```html
<mux-player
  playback-id="EFGH5678"
  ad-tag-url="https://adserver.com/vast.xml"
  ad-data='{"client": "vast", "tag": "https://adserver.com/vast.xml"}'
></mux-player>
```

## Event Handling

### JavaScript Events
```html
<mux-player id="myPlayer" playback-id="EFGH5678"></mux-player>

<script>
  const player = document.getElementById('myPlayer');

  // Player ready
  player.addEventListener('loadstart', () => {
    console.log('Player loading');
  });

  // Play/pause events
  player.addEventListener('play', () => {
    console.log('Video started playing');
  });

  player.addEventListener('pause', () => {
    console.log('Video paused');
  });

  // Progress tracking
  player.addEventListener('timeupdate', () => {
    const progress = (player.currentTime / player.duration) * 100;
    console.log(`Progress: ${progress}%`);
  });

  // Completion
  player.addEventListener('ended', () => {
    console.log('Video completed');
    // Mark course completion
    markVideoCompleted();
  });

  // Error handling
  player.addEventListener('error', (event) => {
    console.error('Player error:', event);
  });
</script>
```

### React Event Handlers
```jsx
import MuxPlayer from '@mux/mux-player-react';
import { useState } from 'react';

function CourseVideoPlayer({ playbackId, onProgress, onComplete }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleTimeUpdate = (event) => {
    const { currentTime, duration } = event.target;
    const progress = (currentTime / duration) * 100;
    onProgress(progress);
  };

  const handleEnded = () => {
    onComplete();
  };

  return (
    <MuxPlayer
      playbackId={playbackId}
      onPlay={handlePlay}
      onPause={handlePause}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
      metadata={{
        video_title: "Course Content",
        viewer_user_id: "user123"
      }}
    />
  );
}
```

## Performance Optimization

### Lazy Loading
```html
<!-- Load player only when visible -->
<mux-player
  playback-id="EFGH5678"
  loading="lazy"
  preload="none"
></mux-player>
```

### Preload Strategy
```html
<!-- Preload metadata -->
<mux-player
  playback-id="EFGH5678"
  preload="metadata"
></mux-player>

<!-- Preload full video -->
<mux-player
  playback-id="EFGH5678"
  preload="auto"
></mux-player>
```

### Background Video
```html
<mux-player
  playback-id="EFGH5678"
  muted="true"
  loop="true"
  autoplay="true"
  playsinline="true"
  style="pointer-events: none;"
></mux-player>
```

## Accessibility

### ARIA Labels
```html
<mux-player
  playback-id="EFGH5678"
  aria-label="Course introduction video"
  title="Course Introduction"
></mux-player>
```

### Keyboard Navigation
```html
<mux-player
  playback-id="EFGH5678"
  no-hotkeys="false"
></mux-player>
```

Keyboard shortcuts:
- `Space` - Play/Pause
- `Arrow Left/Right` - Seek backward/forward
- `Arrow Up/Down` - Volume up/down
- `F` - Fullscreen
- `M` - Mute/Unmute
- `C` - Captions

## Error Handling

### Common Error Scenarios
```javascript
const player = document.getElementById('myPlayer');

player.addEventListener('error', (event) => {
  const error = event.target.error;
  
  switch (error.code) {
    case 1: // MEDIA_ERR_ABORTED
      console.log('Playback aborted');
      break;
    case 2: // MEDIA_ERR_NETWORK
      console.log('Network error');
      showErrorMessage('Network connection lost');
      break;
    case 3: // MEDIA_ERR_DECODE
      console.log('Video decode error');
      showErrorMessage('Video format not supported');
      break;
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      console.log('Video not found');
      showErrorMessage('Video not available');
      break;
  }
});
```

### Fallback Content
```html
<mux-player playback-id="EFGH5678">
  <div slot="fallback">
    <p>Video playback is not supported in your browser.</p>
    <a href="https://example.com/video.mp4">Download video</a>
  </div>
</mux-player>
```

## Course Connect Integration

### Video Progress Tracking
```javascript
class CourseVideoTracker {
  constructor(player, courseId, userId) {
    this.player = player;
    this.courseId = courseId;
    this.userId = userId;
    this.lastProgress = 0;
    
    this.setupTracking();
  }

  setupTracking() {
    let progressTimer;
    
    this.player.addEventListener('play', () => {
      progressTimer = setInterval(() => {
        this.saveProgress();
      }, 5000); // Save every 5 seconds
    });

    this.player.addEventListener('pause', () => {
      clearInterval(progressTimer);
      this.saveProgress();
    });

    this.player.addEventListener('ended', () => {
      clearInterval(progressTimer);
      this.markCompleted();
    });
  }

  saveProgress() {
    const progress = (this.player.currentTime / this.player.duration) * 100;
    
    if (Math.abs(progress - this.lastProgress) > 1) { // Only save significant changes
      fetch('/api/video-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: this.courseId,
          userId: this.userId,
          playbackId: this.player.playbackId,
          currentTime: this.player.currentTime,
          duration: this.player.duration,
          progress
        })
      });
      
      this.lastProgress = progress;
    }
  }

  markCompleted() {
    fetch('/api/video-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: this.courseId,
        userId: this.userId,
        playbackId: this.player.playbackId
      })
    });
  }
}

// Usage
const player = document.getElementById('courseVideo');
const tracker = new CourseVideoTracker(player, 'course123', 'user456');
```

### Video Quality Control
```html
<mux-player
  playback-id="EFGH5678"
  max-resolution="1080p"
  min-resolution="480p"
></mux-player>
```

## Testing

### Unit Testing with React Testing Library
```jsx
import { render, fireEvent } from '@testing-library/react';
import MuxPlayer from '@mux/mux-player-react';

test('video player loads and plays', async () => {
  const { getByRole } = render(
    <MuxPlayer playbackId="test-playback-id" />
  );
  
  const playButton = getByRole('button', { name: /play/i });
  fireEvent.click(playButton);
  
  // Assert video is playing
  expect(getByRole('button', { name: /pause/i })).toBeInTheDocument();
});
```

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Video not loading**
   - Check playback ID is correct
   - Verify asset status is "ready"
   - Check network connectivity

2. **No controls visible**
   - Ensure controls are not disabled
   - Check CSS custom properties
   - Verify player dimensions

3. **Analytics not working**
   - Ensure metadata is properly set
   - Check viewer_user_id is included
   - Verify no ad blockers are blocking requests

### Debug Mode
```html
<mux-player
  playback-id="EFGH5678"
  debug="true"
></mux-player>
```

This enables detailed logging in the browser console.

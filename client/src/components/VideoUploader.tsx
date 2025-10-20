import { useState, useCallback } from 'react';
import { Upload, Video, X, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VideoUploaderProps {
  lessonId: string;
  currentVideoUrl?: string;
  onUploadComplete: (videoUrl: string) => void;
}

export function VideoUploader({ lessonId, currentVideoUrl, onUploadComplete }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(currentVideoUrl);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));

    if (videoFile) {
      setVideoFile(videoFile);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload a video file (MP4, AVI, MOV, etc.)',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setVideoFile(files[0]);
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', videoFile);

      // Get video duration (optional)
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        formData.append('duration', duration.toString());
      };
      video.src = URL.createObjectURL(videoFile);

      // Simulate progress (since we can't track real upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // Use fetch directly for FormData uploads
      const res = await fetch(`/api/instructor/lessons/${lessonId}/video`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Upload failed');
      }

      const response = await res.json();

      clearInterval(progressInterval);
      setProgress(100);

      setUploadedUrl(response.videoUrl);
      onUploadComplete(response.videoUrl);

      toast({
        title: 'Success',
        description: 'Video uploaded successfully',
      });

      // Reset after a short delay
      setTimeout(() => {
        setVideoFile(null);
        setProgress(0);
        setUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Error uploading video:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive',
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setUploadedUrl(undefined);
  };

  return (
    <div className="space-y-4" data-testid="video-uploader">
      {!uploadedUrl && !videoFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          `}
          data-testid="dropzone"
        >
          <input
            type="file"
            id="video-upload"
            accept="video/*"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-video"
          />
          <label htmlFor="video-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Drop video here or click to upload</h3>
            <p className="text-sm text-gray-500">
              Supports MP4, AVI, MOV, WebM (max 500MB)
            </p>
          </label>
        </div>
      )}

      {videoFile && !uploading && !uploadedUrl && (
        <div className="border rounded-lg p-4 flex items-center justify-between" data-testid="video-preview">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">{videoFile.name}</p>
              <p className="text-sm text-gray-500">
                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={uploadVideo} data-testid="button-upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button variant="ghost" size="icon" onClick={removeVideo} data-testid="button-remove">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="border rounded-lg p-4" data-testid="upload-progress">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <div className="flex-1">
              <p className="font-medium">Uploading video...</p>
              <p className="text-sm text-gray-500">{videoFile?.name}</p>
            </div>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {uploadedUrl && (
        <div className="border rounded-lg p-4 bg-green-50" data-testid="upload-complete">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Video uploaded successfully</p>
                <p className="text-sm text-green-700">{videoFile?.name || 'Current video'}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeVideo} data-testid="button-change">
              Change Video
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

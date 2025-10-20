import { useState } from 'react';
import { Video, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ObjectUploader } from '@/components/ObjectUploader';
import type { UploadResult } from "@uppy/core";

interface VideoUploaderProps {
  lessonId: string;
  currentVideoUrl?: string;
  onUploadComplete: (videoUrl: string) => void;
}

export function VideoUploader({ lessonId, currentVideoUrl, onUploadComplete }: VideoUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState(currentVideoUrl);
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const data = await response.json() as { uploadURL: string };

      return {
        method: 'PUT' as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error('Error getting upload URL:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to get upload URL',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      if (!result.successful || result.successful.length === 0) {
        throw new Error('Upload failed');
      }

      const uploadedFile = result.successful[0];
      const videoUrl = uploadedFile.uploadURL;

      // Extract video duration from the uploaded file
      let duration: number | null = null;
      if (uploadedFile.data instanceof File) {
        duration = await getVideoDuration(uploadedFile.data);
      }

      // Update the lesson with the video URL and duration
      const response = await apiRequest(
        'PUT',
        `/api/instructor/lessons/${lessonId}/video-url`,
        {
          videoUrl,
          duration,
        }
      );

      const data = await response.json() as { objectPath: string; lesson: any };

      setUploadedUrl(data.objectPath);
      onUploadComplete(data.objectPath);

      toast({
        title: 'Success',
        description: 'Video uploaded successfully',
      });
    } catch (error) {
      console.error('Error completing upload:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to complete upload',
        variant: 'destructive',
      });
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(0); // Default to 0 if duration can't be determined
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const removeVideo = () => {
    setUploadedUrl(undefined);
  };

  return (
    <div className="space-y-4" data-testid="video-uploader">
      {!uploadedUrl ? (
        <div>
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={524288000}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="w-full"
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <Video className="w-12 h-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold text-center">Upload Video</h3>
                <p className="text-sm text-gray-500 text-center">
                  Supports MP4, AVI, MOV, WebM (max 500MB)
                </p>
              </div>
            </div>
          </ObjectUploader>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-green-50" data-testid="upload-complete">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Video uploaded successfully</p>
                <p className="text-sm text-green-700">Stored in cloud storage</p>
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

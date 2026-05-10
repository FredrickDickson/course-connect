"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface MuxUploaderProps {
  lessonId: string;
  onUploadComplete: (muxAssetId: string, playbackId: string) => void;
  onError: (error: string) => void;
  className?: string;
}

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  message: string;
}

export function MuxUploader({ lessonId, onUploadComplete, onError, className }: MuxUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      onError('Please select a video file');
      return;
    }

    // Validate file size (5GB limit)
    if (file.size > 5 * 1024 * 1024 * 1024) {
      onError('Video file must be less than 5GB');
      return;
    }

    // Cancel any existing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsUploading(true);
    setUploadProgress({
      progress: 0,
      status: 'uploading',
      message: 'Preparing upload...'
    });

    try {
      // Get upload URL via Supabase edge function
      const { data: initData, error: initError } = await supabase.functions.invoke(
        'mux-upload-url',
        {
          body: {
            lessonId,
            fileName: file.name,
            fileSize: file.size,
          },
        },
      );

      if (initError || !initData?.uploadUrl) {
        throw new Error(initError?.message || 'Failed to get upload URL');
      }

      const { uploadUrl, assetId, muxAssetId } = initData;

      setUploadProgress({
        progress: 10,
        status: 'uploading',
        message: 'Uploading to Mux...'
      });

      // Upload file directly to Mux with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 40) + 10; // 10% -> 50%
            setUploadProgress({
              progress: percent,
              status: 'uploading',
              message: `Uploading: ${(event.loaded / 1024 / 1024).toFixed(1)} MB / ${(event.total / 1024 / 1024).toFixed(1)} MB`
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);

        // Wire up abort controller
        if (abortControllerRef.current) {
          abortControllerRef.current.signal.addEventListener('abort', () => xhr.abort());
        }
      });

      setUploadProgress({
        progress: 50,
        status: 'processing',
        message: 'Processing video... this may take a few minutes'
      });

      // Poll for asset readiness using muxAssetId (assetId is null until upload completes)
      const pollInterval = setInterval(async () => {
        try {
          const { data: statusData } = await supabase.functions.invoke(
            'mux-asset-status',
            { body: { muxAssetId } },
          );
          const muxAsset = statusData?.muxAsset;
          const asset = statusData?.asset;

          // Check DB record (updated by webhook) OR live Mux API status as fallback
          const dbReady = muxAsset?.upload_status === 'ready';
          const apiReady = asset?.status === 'ready';
          const dbErrored = muxAsset?.upload_status === 'errored';
          const apiErrored = asset?.status === 'errored';

          if (dbReady || apiReady) {
            clearInterval(pollInterval);
            setUploadProgress({
              progress: 100,
              status: 'ready',
              message: 'Upload complete!'
            });
            const playbackId = muxAsset?.mux_playback_id || asset?.playback_ids?.[0]?.id || '';
            onUploadComplete(muxAssetId, playbackId);
            setIsUploading(false);
          } else if (dbErrored || apiErrored) {
            clearInterval(pollInterval);
            setUploadProgress({
              progress: 0,
              status: 'error',
              message: 'Upload failed'
            });
            onError('Video processing failed');
            setIsUploading(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000);

      // Cleanup after 30 minutes (5GB uploads + processing can take 15-25 min)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (uploadProgress?.status !== 'ready') {
          setUploadProgress({
            progress: 0,
            status: 'error',
            message: 'Upload timeout — please try again'
          });
          onError('Upload timed out after 30 minutes');
          setIsUploading(false);
        }
      }, 1800000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: 'Upload failed'
      });
      onError(error instanceof Error ? error.message : 'Upload failed');
      setIsUploading(false);
    } finally {
      abortControllerRef.current = null;
    }
  }, [lessonId, onUploadComplete, onError]);

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle>Upload Video to Mux</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="mux-upload"
          />
          <label
            htmlFor="mux-upload"
            className={cn(
              "cursor-pointer flex flex-col items-center justify-center space-y-2",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploadProgress?.status === 'ready' ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : uploadProgress?.status === 'error' ? (
              <AlertCircle className="h-12 w-12 text-red-500" />
            ) : isUploading ? (
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
            
            <span className="text-sm font-medium">
              {uploadProgress?.message || 'Click to upload video'}
            </span>
            
            {uploadProgress && (
              <div className="w-full mt-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Upload Progress</span>
                  <span>{uploadProgress.progress}%</span>
                </div>
                <Progress value={uploadProgress.progress} className="w-full" />
              </div>
            )}
          </label>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Supported formats:</strong> MP4, MOV, WebM</p>
          <p><strong>File size limit:</strong> 5GB</p>
          <p><strong>Processing time:</strong> 2-15 minutes depending on file size</p>
        </div>
      </CardContent>
    </Card>
  );
}

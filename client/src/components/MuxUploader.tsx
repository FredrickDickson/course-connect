"use client";

import React, { useState, useCallback, useRef } from "react";
import * as UpChunk from "@mux/upchunk";
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
  const upChunkRef = useRef<ReturnType<typeof UpChunk.createUpload> | null>(null);

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
    if (upChunkRef.current) {
      upChunkRef.current.abort();
      upChunkRef.current = null;
    }

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

      if (initError) {
        console.error('Edge function error:', initError);
        console.error('Error context:', (initError as any).context);
        // Try to get the actual error message from the response body
        const response = (initError as any).context;
        let errorMessage = initError.message || 'Unknown error';
        if (response && response.body) {
          try {
            const text = await response.text();
            console.error('Response body text:', text);
            if (text) {
              try {
                const json = JSON.parse(text);
                errorMessage = json.error || json.message || text;
              } catch {
                errorMessage = text;
              }
            }
          } catch (e) {
            console.error('Failed to read response body:', e);
          }
        }
        throw new Error(errorMessage);
      }

      if (!initData?.uploadUrl) {
        console.error('No upload URL in response:', initData);
        throw new Error('No upload URL returned from edge function');
      }

      const { uploadUrl, assetId, muxAssetId, uploadId } = initData;

      setUploadProgress({
        progress: 10,
        status: 'uploading',
        message: 'Uploading to Mux...'
      });

      // Upload file directly to Mux in resumable chunks (retries on network blips
      // instead of failing the whole multi-GB upload on one dropped connection).
      await new Promise<void>((resolve, reject) => {
        const upload = UpChunk.createUpload({
          endpoint: uploadUrl,
          file,
          chunkSize: 30720, // 30MB chunks
        });
        upChunkRef.current = upload;

        upload.on('progress', (event) => {
          const percent = Math.round(event.detail * 0.4) + 10; // 10% -> 50%
          setUploadProgress({
            progress: percent,
            status: 'uploading',
            message: `Uploading: ${((event.detail / 100) * (file.size / 1024 / 1024)).toFixed(1)} MB / ${(file.size / 1024 / 1024).toFixed(1)} MB`
          });
        });

        upload.on('success', () => resolve());
        upload.on('error', (event) => reject(new Error(event.detail.message || 'Upload failed')));
      });

      setUploadProgress({
        progress: 50,
        status: 'processing',
        message: 'Processing video... this may take a few minutes'
      });

      // Poll for asset readiness. assetId is null until Mux finishes ingest,
      // so we send uploadId too — the edge function will resolve the asset.
      const pollInterval = setInterval(async () => {
        try {
          const { data: statusData } = await supabase.functions.invoke(
            'mux-asset-status',
            { body: { muxAssetId, uploadId } },
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
            const finalAssetId = muxAsset?.mux_asset_id || asset?.id || assetId || '';
            onUploadComplete(finalAssetId, playbackId);
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
      upChunkRef.current = null;
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

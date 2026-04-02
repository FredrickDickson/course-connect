import { useState, useRef } from 'react';
import { Video, CheckCircle2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

interface VideoUploaderProps {
  lessonId?: string;
  currentVideoUrl?: string;
  onUploadComplete: (videoUrl: string, duration?: number) => void;
}

export function VideoUploader({ lessonId, currentVideoUrl, onUploadComplete }: VideoUploaderProps) {
  const [uploadedUrl, setUploadedUrl] = useState(currentVideoUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration));
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(0);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast({ title: 'File too large', description: 'Maximum file size is 500MB', variant: 'destructive' });
      return;
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload MP4, WebM, MOV, or AVI', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const duration = await getVideoDuration(file);
      setProgress(20);

      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = lessonId ? `${lessonId}/${fileName}` : `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-videos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;
      setProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from('course-videos')
        .getPublicUrl(filePath);

      // For private buckets, use signed URL instead
      const { data: signedData } = await supabase.storage
        .from('course-videos')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      const videoUrl = signedData?.signedUrl || publicUrl;

      setUploadedUrl(videoUrl);
      onUploadComplete(videoUrl, duration);
      setProgress(100);

      toast({ title: 'Success', description: 'Video uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeVideo = () => {
    setUploadedUrl(undefined);
    onUploadComplete('', 0);
  };

  return (
    <div className="space-y-4" data-testid="video-uploader">
      {uploading ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="font-medium mb-3">Uploading video...</p>
          <Progress value={progress} className="max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
        </div>
      ) : !uploadedUrl ? (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Upload Video</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Click to select MP4, WebM, MOV, or AVI (max 500MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-green-50" data-testid="upload-complete">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Video uploaded successfully</p>
                <p className="text-sm text-green-700 truncate max-w-md">Stored in cloud storage</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={removeVideo} data-testid="button-change">
              <X className="w-4 h-4 mr-1" /> Change
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

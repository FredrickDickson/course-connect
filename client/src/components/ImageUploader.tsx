import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onUploadComplete: (imageUrl: string) => void;
  acceptedTypes?: string;
  maxSize?: number;
  bucket?: string;
  // Fires whenever an upload starts/finishes, so a parent form can disable
  // submission while a file is mid-upload — previously nothing stopped
  // submitting the form between "file selected" and "upload finished",
  // silently saving a blank URL.
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUploader({
  currentImageUrl,
  onUploadComplete,
  acceptedTypes = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  bucket = 'course-thumbnails',
  onUploadingChange,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const { toast } = useToast();

  // Uploads are triggered immediately on file selection/drop rather than
  // requiring a separate manual "Upload" click — a two-step flow let admins
  // submit the surrounding form after only the (instant, local) preview
  // appeared, before the async upload had actually completed, silently
  // saving a blank image URL.
  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadFailed(false);
    onUploadingChange?.(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        // If bucket doesn't exist, create it first
        if (error.message.includes('Bucket not found') || error.message.includes('The bucket was not found')) {
          const { error: createError } = await supabase.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024, // 5MB
          });

          if (createError) {
            throw new Error(`Failed to create storage bucket: ${createError.message}`);
          }

          // Retry upload after creating bucket
          const { error: retryError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false,
            });

          if (retryError) {
            throw new Error(`Upload failed: ${retryError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

          setUploadedUrl(publicUrl);
          onUploadComplete(publicUrl);

          toast({
            title: 'Success',
            description: 'Image uploaded successfully',
          });

          setImageFile(null);
          return;
        }

        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setUploadedUrl(publicUrl);
      onUploadComplete(publicUrl);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });

      setImageFile(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload image',
        variant: 'destructive',
      });
      setUploadFailed(true);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const selectFile = (file: File) => {
    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: `Image must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: 'destructive',
      });
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    uploadImage(file);
  };

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
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      selectFile(imageFile);
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, maxSize, bucket]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      selectFile(files[0]);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setUploadedUrl(undefined);
    setPreviewUrl(undefined);
    setUploadFailed(false);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="space-y-4" data-testid="image-uploader">
      {!previewUrl && !imageFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          `}
          data-testid="dropzone-image"
        >
          <input
            type="file"
            id="image-upload"
            accept={acceptedTypes}
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-image"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Drop image here or click to upload</h3>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, WebP (max {maxSize / (1024 * 1024)}MB)
            </p>
          </label>
        </div>
      )}

      {previewUrl && (
        <div className="space-y-3">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-muted">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              data-testid="image-preview"
            />
          </div>

          {uploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2" data-testid="uploading-image">
              <Upload className="w-4 h-4 animate-pulse" />
              Uploading...
            </div>
          )}

          {!uploading && uploadFailed && imageFile && (
            <div className="flex gap-2">
              <Button
                onClick={() => uploadImage(imageFile)}
                className="flex-1"
                data-testid="button-upload-image"
              >
                <Upload className="w-4 h-4 mr-2" />
                Retry Upload
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeImage}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!uploading && uploadedUrl && (
            <div className="border rounded-lg p-4 bg-green-50" data-testid="upload-complete-image">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Image uploaded successfully</p>
                    <p className="text-sm text-green-700">Ready to use as thumbnail</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={removeImage} data-testid="button-change-image">
                  Change Image
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

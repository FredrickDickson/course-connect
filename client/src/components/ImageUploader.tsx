import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onUploadComplete: (imageUrl: string) => void;
  acceptedTypes?: string;
  maxSize?: number;
}

export function ImageUploader({ 
  currentImageUrl, 
  onUploadComplete,
  acceptedTypes = "image/*",
  maxSize = 5 * 1024 * 1024 // 5MB default
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState(currentImageUrl);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
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
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      if (imageFile.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: `Image must be less than ${maxSize / (1024 * 1024)}MB`,
          variant: 'destructive',
        });
        return;
      }
      setImageFile(imageFile);
      setPreviewUrl(URL.createObjectURL(imageFile));
    } else {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file (JPG, PNG, etc.)',
        variant: 'destructive',
      });
    }
  }, [toast, maxSize]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      if (files[0].size > maxSize) {
        toast({
          title: 'File Too Large',
          description: `Image must be less than ${maxSize / (1024 * 1024)}MB`,
          variant: 'destructive',
        });
        return;
      }
      setImageFile(files[0]);
      setPreviewUrl(URL.createObjectURL(files[0]));
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Upload failed');
      }

      const response = await res.json();

      setUploadedUrl(response.imageUrl);
      onUploadComplete(response.imageUrl);

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
      setPreviewUrl(currentImageUrl);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setUploadedUrl(undefined);
    setPreviewUrl(undefined);
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
          <div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-gray-200">
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
              data-testid="image-preview"
            />
          </div>

          {!uploadedUrl && imageFile && (
            <div className="flex gap-2">
              <Button 
                onClick={uploadImage} 
                disabled={uploading}
                className="flex-1"
                data-testid="button-upload-image"
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={removeImage}
                disabled={uploading}
                data-testid="button-remove-image"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {uploadedUrl && (
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

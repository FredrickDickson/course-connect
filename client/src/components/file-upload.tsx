import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

export default function FileUpload({ 
  onFilesChange, 
  maxFiles = 5, 
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/*', 'application/pdf']
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploadedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);

    try {
      const newFiles: UploadedFile[] = [];

      for (const file of files) {
        // Validate file size
        if (file.size > maxSize) {
          alert(`File ${file.name} is too large (max ${maxSize / 1024 / 1024}MB)`);
          continue;
        }

        // Validate file type
        const isValidType = acceptedTypes.some(type => {
          if (type.endsWith('/*')) {
            return file.type.startsWith(type.slice(0, -2));
          }
          return file.type === type;
        });

        if (!isValidType) {
          alert(`File ${file.name} is not an accepted type`);
          continue;
        }

        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `post-attachments/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-attachments')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          // If bucket doesn't exist, show helpful message
          if (uploadError.message.includes('The resource was not found')) {
            alert('Storage bucket not configured. Please contact administrator to set up file upload storage.');
            setUploading(false);
            return;
          }
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('post-attachments')
          .getPublicUrl(filePath);

        newFiles.push({
          url: publicUrl,
          name: file.name,
          type: file.type,
        });
      }

      const updatedFiles = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updatedFiles);
      onFilesChange(updatedFiles);

    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          id="file-upload"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileChange}
          disabled={uploading || uploadedFiles.length >= maxFiles}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={uploading || uploadedFiles.length >= maxFiles}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Attach Files
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          {uploadedFiles.length}/{maxFiles} files (max {maxSize / 1024 / 1024}MB each)
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
              {file.type.startsWith('image/') ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-10 w-10 object-cover rounded"
                />
              ) : (
                <div className="h-10 w-10 bg-primary/10 rounded flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
              )}
              <span className="text-sm flex-1 truncate">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

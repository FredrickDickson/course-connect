import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  userName: string;
  onAvatarChange: (url: string) => void;
}

export default function AvatarUpload({ currentAvatarUrl, userId, userName, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Check if user-avatars bucket exists by trying to list it
      const { data: bucketCheck, error: bucketError } = await supabase.storage
        .from('user-avatars')
        .list('', { limit: 1 });

      // If bucket doesn't exist, create it
      if (bucketError && bucketError.message.includes('The resource was not found')) {
        console.log('User-avatars bucket not found. Please create the "user-avatars" storage bucket in Supabase console.');
        alert('Storage bucket not configured. Please contact administrator to set up avatar storage.');
        setUploading(false);
        return;
      }

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onAvatarChange(publicUrl);

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          avatar_updated_at: new Date().toISOString()
        })
        .eq('user_id' as any, userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

    } catch (error) {
      console.error('Avatar upload error:', error);
      alert('Failed to upload avatar. Please check console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className="h-24 w-24 cursor-pointer">
          <AvatarImage src={previewUrl || undefined} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
            {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <label
          htmlFor="avatar-upload"
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {uploading ? 'Uploading...' : 'Click to change avatar'}
      </p>
    </div>
  );
}

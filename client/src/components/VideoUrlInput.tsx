import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, X, Youtube, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface VideoUrlInputProps {
  value: string;
  onChange: (value: string, metadata?: { platform: 'youtube' | 'vimeo'; videoId: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function VideoUrlInput({ 
  value, 
  onChange, 
  disabled, 
  placeholder = "Paste YouTube or Vimeo URL here..." 
}: VideoUrlInputProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    platform?: 'youtube' | 'vimeo';
    videoId?: string;
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!value) {
      setValidationResult(null);
      return;
    }

    const validateUrl = async () => {
      setIsValidating(true);
      try {
        const res = await apiRequest("POST", "/api/videos/validate", { url: value });
        const data = await res.json();
        
        setValidationResult({
          valid: true,
          platform: data.platform,
          videoId: data.videoId,
        });
        
        onChange(value, { platform: data.platform, videoId: data.videoId });
      } catch (error: any) {
        const errorData = await error.json?.catch(() => ({}));
        setValidationResult({
          valid: false,
          error: errorData.message || "Invalid video URL",
        });
      } finally {
        setIsValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateUrl, 500);
    return () => clearTimeout(debounceTimer);
  }, [value, onChange]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    onChange(pastedText);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="video-url">Video URL</Label>
      <div className="relative">
        <Input
          id="video-url"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          disabled={disabled}
          placeholder={placeholder}
          className={`pr-10 ${
            validationResult?.valid === false ? 'border-destructive' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isValidating && (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          )}
          {validationResult?.valid && validationResult.platform === 'youtube' && (
            <Youtube className="h-5 w-5 text-red-600" />
          )}
          {validationResult?.valid && validationResult.platform === 'vimeo' && (
            <Video className="h-5 w-5 text-blue-600" />
          )}
          {validationResult?.valid === false && (
            <X className="h-5 w-5 text-destructive" />
          )}
        </div>
      </div>
      
      {validationResult?.error && (
        <p className="text-sm text-destructive">{validationResult.error}</p>
      )}
      
      {validationResult?.valid && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>
            Valid {validationResult.platform === 'youtube' ? 'YouTube' : 'Vimeo'} video detected
          </span>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        Supported formats: youtube.com/watch?v=..., youtu.be/..., vimeo.com/...
      </div>
    </div>
  );
}

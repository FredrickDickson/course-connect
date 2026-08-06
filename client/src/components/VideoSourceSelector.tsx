import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link2, Zap } from "lucide-react";

export type VideoSource = "upload" | "external" | "mux";

interface VideoSourceSelectorProps {
  value: VideoSource;
  onChange: (value: VideoSource) => void;
  disabled?: boolean;
}

export function VideoSourceSelector({ value, onChange, disabled }: VideoSourceSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Video Source</Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as VideoSource)}
        disabled={disabled}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card
          className={`cursor-pointer transition-colors ${
            value === "upload"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <CardContent className="p-4">
            <Label htmlFor="upload" className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="upload" id="upload" onClick={(e) => e.stopPropagation()} />
              <Upload className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <span className="font-medium">Upload Video</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload directly to our server
                </p>
              </div>
            </Label>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            value === "external"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <CardContent className="p-4">
            <Label htmlFor="external" className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="external" id="external" onClick={(e) => e.stopPropagation()} />
              <Link2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <span className="font-medium">External URL</span>
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube or Vimeo link
                </p>
              </div>
            </Label>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            value === "mux"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <CardContent className="p-4">
            <Label htmlFor="mux" className="flex items-center space-x-3 cursor-pointer">
              <RadioGroupItem value="mux" id="mux" onClick={(e) => e.stopPropagation()} />
              <Zap className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <span className="font-medium">Mux Streaming</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Professional video hosting with analytics
                </p>
              </div>
            </Label>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );
}

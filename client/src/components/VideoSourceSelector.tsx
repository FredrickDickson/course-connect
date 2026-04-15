import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Link2 } from "lucide-react";

export type VideoSource = "upload" | "external";

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
        className="grid grid-cols-2 gap-4"
      >
        <Card
          className={`cursor-pointer transition-colors ${
            value === "upload"
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/50"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="upload" id="upload" />
              <Upload className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <Label htmlFor="upload" className="font-medium cursor-pointer">
                  Upload Video
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload directly to our server
                </p>
              </div>
            </div>
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
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="external" id="external" />
              <Link2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <Label htmlFor="external" className="font-medium cursor-pointer">
                  External URL
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  YouTube or Vimeo link
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );
}

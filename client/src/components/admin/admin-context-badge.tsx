/**
 * Admin Context Badge
 * Visual indicator when admin is acting on behalf of an instructor
 */

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminContextBadgeProps {
  instructorId: string;
  instructorName: string;
  instructorImage?: string;
  onClearContext?: () => void;
  showClearButton?: boolean;
}

export default function AdminContextBadge({
  instructorId,
  instructorName,
  instructorImage,
  onClearContext,
  showClearButton = false,
}: AdminContextBadgeProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-[#610000]/10 to-[#8b6f47]/10 border-2 border-[#610000]/20 rounded-xl">
      <Shield className="w-5 h-5 text-[#610000]" />
      
      <div className="flex items-center gap-2 flex-1">
        <Avatar className="h-6 w-6 border-2 border-[#610000]/30">
          <AvatarImage src={instructorImage} />
          <AvatarFallback className="text-xs bg-[#610000] text-white">
            {instructorName.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <Badge variant="outline" className="border-[#610000] text-[#610000] text-xs font-semibold w-fit">
            Admin Mode
          </Badge>
          <span className="text-sm font-medium text-[#2c2015]">
            Acting as: <span className="font-bold">{instructorName}</span>
          </span>
        </div>
      </div>

      {showClearButton && onClearContext && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearContext}
          className="h-8 px-2 hover:bg-red-100 hover:text-red-600"
        >
          <X className="w-4 h-4" />
          <span className="ml-1 text-xs">Clear</span>
        </Button>
      )}
    </div>
  );
}

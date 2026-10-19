/**
 * AI Tutor Floating Button
 * Triggers the AI Tutor panel with avatar and name styling
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AITutorPanel from './AITutorPanel';
import type { LessonContext } from './types';

interface AITutorButtonProps {
  lessonContext: LessonContext;
  className?: string;
}

export default function AITutorButton({ lessonContext, className }: AITutorButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    console.log('AI Tutor button clicked, current state:', isOpen);
    setIsOpen(!isOpen);
    console.log('Setting isOpen to:', !isOpen);
  };

  return (
    <>
      {/* Floating Avatar Button - Styled like reference */}
      <div className={cn("fixed bottom-24 right-6 z-40", className)}>
        <button
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "group relative flex items-center gap-3 rounded-full shadow-2xl transition-all duration-300 overflow-hidden",
            "bg-gradient-to-r from-[#5A2633] to-[#6B2D3D]",
            "hover:shadow-[0_10px_40px_rgba(90,38,51,0.4)]",
            "transform hover:scale-105",
            isOpen ? "pr-4 pl-2 py-2" : isHovered ? "pr-6 pl-2 py-2" : "p-2"
          )}
          aria-label="Ask Michael Smith - AI Tutor"
        >
          {/* Avatar Circle with Border */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-white p-0.5 shadow-inner">
              <div className="w-full h-full rounded-full overflow-hidden">
                {/* Professional Avatar Image */}
                <img 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces" 
                  alt="Michael Smith - AI Tutor"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Expandable Text */}
          <div
            className={cn(
              "flex items-center gap-2 transition-all duration-300 overflow-hidden whitespace-nowrap",
              isOpen || isHovered ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
            )}
          >
            {isOpen ? (
              <>
                <span className="text-white font-semibold text-base">Close</span>
                <X className="h-4 w-4 text-white" />
              </>
            ) : (
              <span className="text-white font-semibold text-base">Ask Michael Smith</span>
            )}
          </div>

          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </button>
      </div>

      {/* AI Tutor Panel */}
      {console.log('Rendering AITutorPanel, isOpen:', isOpen)}
      <AITutorPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        lessonContext={lessonContext}
      />
    </>
  );
}

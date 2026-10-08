/**
 * AI Tutor Floating Button
 * Triggers the AI Tutor panel
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

  const handleClick = () => {
    console.log('AI Tutor button clicked, current state:', isOpen);
    setIsOpen(!isOpen);
    console.log('Setting isOpen to:', !isOpen);
  };

  return (
    <>
      {/* Floating Button - Smaller Size with Better Positioning */}
      <div className={cn("fixed bottom-24 right-6 z-40", className)}>
        <Button
          onClick={handleClick}
          size="default"
          className={cn(
            "rounded-full w-12 h-12 shadow-lg transition-all duration-300",
            "bg-gradient-to-r from-[#5A2633] to-[#5A2633] hover:from-[#5A2633] hover:to-[#4a1f29]",
            "text-white hover:scale-105",
            isOpen && "scale-90"
          )}
          aria-label="AI Tutor"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <div className="relative">
              <Bot className="h-5 w-5" />
              <Sparkles className="h-2.5 w-2.5 absolute -top-0.5 -right-0.5 text-yellow-300 animate-pulse" />
            </div>
          )}
        </Button>
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-[#5A2633] animate-ping opacity-20 pointer-events-none" />
        )}
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

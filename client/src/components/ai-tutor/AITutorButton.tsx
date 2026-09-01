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
      {/* Floating Button */}
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={handleClick}
          size="lg"
          className={cn(
            "rounded-full w-14 h-14 shadow-lg transition-all duration-300",
            "bg-gradient-to-r from-[#5A2633] to-[#5A2633] hover:from-[#5A2633] hover:to-[#4a1f29]",
            "text-white hover:scale-110",
            isOpen && "scale-90"
          )}
          aria-label="AI Tutor"
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <div className="relative">
              <Bot className="h-6 w-6" />
              <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
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

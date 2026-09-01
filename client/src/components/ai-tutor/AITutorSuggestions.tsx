/**
 * AI Tutor Suggestions Component
 * Shows contextual quick action suggestions based on current lesson
 */

import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';
import type { LessonContext } from './types';

interface AITutorSuggestionsProps {
  lessonContext: LessonContext;
  onSuggestionClick: (suggestion: string) => void;
}

export default function AITutorSuggestions({ lessonContext, onSuggestionClick }: AITutorSuggestionsProps) {
  // Generate contextual suggestions based on lesson
  const getSuggestions = (): string[] => {
    const { lessonType, lessonTitle, lessonContent } = lessonContext;
    
    // Check lesson content for keywords
    const content = (lessonTitle + ' ' + (lessonContent || '')).toLowerCase();
    
    // Quiz-specific suggestions
    if (lessonType === 'quiz') {
      return [
        "Explain this quiz question to me",
        "Why is this answer correct?",
        "Create practice questions on this topic",
      ];
    }
    
    // Assignment-specific suggestions
    if (lessonType === 'assignment') {
      return [
        "Review and grade my assignment",
        "Help me improve my draft",
        "What should I focus on in this assignment?",
      ];
    }
    
    // Arbitration-specific suggestions
    if (content.includes('arbitration agreement') || content.includes('arbitration clause')) {
      return [
        "Explain this concept as a lecturer would",
        "Grade my draft arbitration clause",
        "Show me a real-world example",
      ];
    }
    
    if (content.includes('award') || content.includes('decision')) {
      return [
        "How would you grade an arbitral award?",
        "Review my award draft",
        "Explain the key elements I should include",
      ];
    }
    
    // Mediation-specific suggestions
    if (content.includes('mediation') || content.includes('negotiation')) {
      return [
        "Simulate a mediation scenario for practice",
        "How should I approach this mediation?",
        "Grade my mediation strategy",
      ];
    }
    
    // Video lesson suggestions
    if (lessonType === 'video') {
      return [
        "Summarize this lesson like a lecturer",
        "Quiz me on what I just learned",
        "Explain the most important concept here",
      ];
    }
    
    // Article lesson suggestions
    if (lessonType === 'article') {
      return [
        "Break this down for me step-by-step",
        "Create a practice exercise on this",
        "How would this appear on an exam?",
      ];
    }
    
    // Generic suggestions (fallback)
    return [
      "Teach me this concept from scratch",
      "Grade my understanding of this topic",
      "What should I focus on learning?",
    ];
  };

  const suggestions = getSuggestions();

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span>Try asking:</span>
      </div>
      <div className="grid gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="justify-start text-left h-auto py-3 px-4 whitespace-normal hover:bg-[#5A2633]/5 hover:border-[#5A2633]/30"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

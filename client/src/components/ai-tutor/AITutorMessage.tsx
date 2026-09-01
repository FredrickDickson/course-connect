/**
 * AI Tutor Message Component
 * Displays individual chat messages with appropriate styling
 */

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from './types';

interface AITutorMessageProps {
  message: Message;
}

export default function AITutorMessage({ message }: AITutorMessageProps) {
  const isUser = message.role === 'user';
  const isMichael = message.role === 'assistant';

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold",
        isUser 
          ? "bg-[#5A2633] text-white" 
          : "bg-gradient-to-br from-[#5A2633] to-[#5A2633] text-white border-2 border-[#5A2633]/20"
      )}>
        {isUser ? <User className="h-4 w-4" /> : 'MS'}
      </div>

      {/* Message bubble */}
      <div className={cn(
        "flex-1 rounded-lg px-4 py-3 max-w-[85%]",
        isUser 
          ? "bg-[#5A2633] text-white ml-auto" 
          : "bg-gray-50 text-gray-900 border border-gray-200"
      )}>
        <div className={cn(
          "text-sm whitespace-pre-wrap break-words",
          isUser ? "text-white" : "text-gray-900"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

/**
 * AI Tutor Chat Panel
 * Main interface for interacting with the AI Tutor
 */

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, X, Minimize2, Trash2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Message, LessonContext, ChatResponse } from './types';
import AITutorMessage from './AITutorMessage';
import AITutorSuggestions from './AITutorSuggestions';

interface AITutorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lessonContext: LessonContext;
}

export default function AITutorPanel({ isOpen, onClose, lessonContext }: AITutorPanelProps) {
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message,
          conversationId,
          lessonContext,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response to messages
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          createdAt: new Date().toISOString(),
        }
      ]);

      // Store suggestions for quick actions (optional)
      if (data.suggestions) {
        // You can store these in state if you want to show them
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message immediately
    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        createdAt: new Date().toISOString(),
      }
    ]);

    // Send to API
    sendMessage.mutate(userMessage);
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    textareaRef.current?.focus();
  };

  // Clear conversation
  const handleClearConversation = () => {
    setMessages([]);
    setConversationId(null);
    toast({
      title: 'Conversation cleared',
      description: 'Starting a new conversation',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 z-40 flex items-end md:items-start justify-center md:justify-end p-4 md:p-0">
      {/* Mobile backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 md:hidden" 
        onClick={onClose}
      />

      {/* Panel */}
      <Card className="relative w-full md:w-[400px] h-[80vh] md:h-[600px] flex flex-col shadow-2xl border-2 border-[#610000]/20 animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#610000] to-[#8b0000] text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold text-lg border-2 border-white/30">
              MS
            </div>
            <div>
              <h3 className="font-semibold">Michael Smith</h3>
              <p className="text-xs opacity-90">ADR Learning Assistant • {lessonContext.lessonTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleClearConversation}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center text-white font-bold text-2xl border-4 border-[#610000]/20 shadow-lg">
                MS
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-1">Hi! I'm Michael Smith</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Your ADR Learning Assistant
                </p>
                <p className="text-xs text-muted-foreground max-w-md">
                  I can help you understand lessons, grade assignments, explain quizzes, 
                  review your drafts, and support your learning journey. What would you like help with?
                </p>
              </div>
              <AITutorSuggestions 
                lessonContext={lessonContext}
                onSuggestionClick={handleSuggestionClick}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <AITutorMessage key={index} message={message} />
              ))}
              {sendMessage.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 space-y-2">
          {sendMessage.isError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to send message. Please try again.</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question about this lesson..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={sendMessage.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessage.isPending}
              size="icon"
              className="bg-[#610000] hover:bg-[#7d0000] h-[60px] w-[60px] flex-shrink-0"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}

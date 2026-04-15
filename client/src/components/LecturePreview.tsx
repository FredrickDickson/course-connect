import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayer } from './VideoPlayer';
import {
  Video,
  FileText,
  ClipboardCheck,
  FileUp,
  Download,
  Clock,
  Circle,
  X,
} from 'lucide-react';

interface LecturePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  lessonType: 'video' | 'text' | 'quiz' | 'assignment';
}

export function LecturePreview({
  open,
  onOpenChange,
  lessonId,
  lessonTitle,
  lessonType,
}: LecturePreviewProps) {
  // Fetch lesson data from Supabase
  const { data: lessonData, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson-preview', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!lessonId,
  });

  // Fetch quiz with questions and answers
  const { data: quizData, isLoading: quizLoading } = useQuery({
    queryKey: ['lesson-preview-quiz', lessonId],
    queryFn: async () => {
      const { data: quiz, error: qErr } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (qErr) throw qErr;
      if (!quiz) return null;

      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quiz.id)
        .order('order');

      const questionsWithAnswers = await Promise.all(
        (questions || []).map(async (q) => {
          const { data: answers } = await supabase
            .from('quiz_answers')
            .select('*')
            .eq('question_id', q.id)
            .order('order');
          return { ...q, answers: answers || [] };
        })
      );

      return { ...quiz, questions: questionsWithAnswers };
    },
    enabled: open && !!lessonId && lessonType === 'quiz',
  });

  // Fetch assignment
  const { data: assignmentData, isLoading: assignmentLoading } = useQuery({
    queryKey: ['lesson-preview-assignment', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!lessonId && lessonType === 'assignment',
  });

  const renderVideoPreview = () => {
    const lessonDataAny = lessonData as any;
    if (!lessonDataAny?.video_url && !lessonDataAny?.video_id) {
      return (
        <div className="text-center py-12">
          <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No video content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <VideoPlayer
          videoUrl={lessonDataAny?.video_url || undefined}
          videoPlatform={lessonDataAny?.video_platform as 'youtube' | 'vimeo' | undefined}
          videoId={lessonDataAny?.video_id || undefined}
        />
        {lessonDataAny.duration_seconds && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {Math.floor(lessonDataAny.duration_seconds / 60)}:{String(lessonDataAny.duration_seconds % 60).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderArticlePreview = () => {
    if (!lessonData?.content) {
      return (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No article content available</p>
        </div>
      );
    }

    return (
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: lessonData.content }}
      />
    );
  };

  const renderQuizPreview = () => {
    if (quizLoading) {
      return (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      );
    }
    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
      return (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No quiz content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg mb-2">{quizData.title}</h3>
                {quizData.description && (
                  <p className="text-sm text-muted-foreground">{quizData.description}</p>
                )}
              </div>
              <Badge variant="outline" className="bg-white">
                {quizData.questions.length} Question{quizData.questions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm">
              {quizData.time_limit_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {quizData.time_limit_minutes} min
                </span>
              )}
              <span>Passing Score: {quizData.passing_score}%</span>
              <span>Max Attempts: {quizData.max_attempts}</span>
            </div>
          </CardContent>
        </Card>

        {quizData.questions.map((question: any, index: number) => (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Question {index + 1} ({question.points} point{question.points !== 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{question.question}</p>
              {question.question_type === 'fill_blank' ? (
                <input type="text" placeholder="Type your answer..." className="w-full px-3 py-2 border rounded-md" />
              ) : (
                <div className="space-y-2">
                  {question.answers.map((answer: any, aIndex: number) => (
                    <label key={answer.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <Circle className="w-5 h-5 text-muted-foreground" />
                      <span>{answer.answer}</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderAssignmentPreview = () => {
    if (assignmentLoading) {
      return (
        <div className="text-center py-12">
          <FileUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading assignment...</p>
        </div>
      );
    }
    if (!assignmentData) {
      return (
        <div className="text-center py-12">
          <FileUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No assignment content available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-lg mb-2">{assignmentData.title}</h3>
            {assignmentData.description && (
              <p className="text-sm text-muted-foreground mb-4">{assignmentData.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{assignmentData.max_score} Points</span>
              {assignmentData.due_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Due: {new Date(assignmentData.due_date).toLocaleString()}
                </span>
              )}
              {assignmentData.allow_late_submission && (
                <Badge variant="outline" className="bg-white">Late submissions allowed</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {assignmentData.instructions && (
          <Card>
            <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: assignmentData.instructions }} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{lessonTitle}</DialogTitle>
          <DialogDescription>Preview Mode (Student View)</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {lessonType === 'video' && renderVideoPreview()}
            {lessonType === 'text' && renderArticlePreview()}
            {lessonType === 'quiz' && renderQuizPreview()}
            {lessonType === 'assignment' && renderAssignmentPreview()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

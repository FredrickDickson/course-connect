import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VideoUploader } from './VideoUploader';
import { RichTextEditor } from './RichTextEditor';
import { QuizBuilder } from './QuizBuilder';
import { AssignmentBuilder } from './AssignmentBuilder';
import { VideoSourceSelector, VideoSource } from './VideoSourceSelector';
import { VideoUrlInput } from './VideoUrlInput';
import { Video, FileText, ClipboardCheck, FileUp, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LectureContentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  moduleId: string;
  lesson?: {
    id: string;
    title: string;
    description?: string;
    contentType: 'video' | 'text' | 'quiz' | 'assignment';
    videoUrl?: string;
    videoPlatform?: 'youtube' | 'vimeo';
    videoId?: string;
    content?: string;
    duration?: number;
  };
  onSave: () => void;
}

export function LectureContentEditor({
  open,
  onOpenChange,
  courseId,
  moduleId,
  lesson,
  onSave,
}: LectureContentEditorProps) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [contentType, setContentType] = useState<'video' | 'text' | 'quiz' | 'assignment'>(
    lesson?.contentType || 'video'
  );
  const [videoSource, setVideoSource] = useState<VideoSource>(
    lesson?.videoPlatform && lesson?.videoId ? 'external' : 'upload'
  );
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'vimeo' | null>(
    lesson?.videoPlatform || null
  );
  const [videoId, setVideoId] = useState(lesson?.videoId || '');
  const [videoDuration, setVideoDuration] = useState(lesson?.duration || 0);
  const [articleContent, setArticleContent] = useState(lesson?.content || '');
  const [saving, setSaving] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id || null);
  const { toast } = useToast();

  // Reset state when lesson prop changes
  useEffect(() => {
    setTitle(lesson?.title || '');
    setDescription(lesson?.description || '');
    setContentType(lesson?.contentType || 'video');
    setVideoSource(lesson?.videoPlatform && lesson?.videoId ? 'external' : 'upload');
    setVideoUrl(lesson?.videoUrl || '');
    setVideoPlatform(lesson?.videoPlatform || null);
    setVideoId(lesson?.videoId || '');
    setVideoDuration(lesson?.duration || 0);
    setArticleContent(lesson?.content || '');
    setSavedLessonId(lesson?.id || null);
  }, [lesson]);

  // Auto-save to create the lesson so video/quiz/assignment can be attached immediately
  const ensureLessonExists = async (): Promise<string> => {
    if (savedLessonId) return savedLessonId;

    if (!title.trim()) {
      throw new Error('Please enter a lecture title first');
    }

    const { data: maxOrderData } = await supabase
      .from('lessons')
      .select('order')
      .eq('module_id', moduleId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrderData?.[0]?.order ?? 0) + 1;

    const { data, error } = await supabase
      .from('lessons')
      .insert({
        title,
        description: description || null,
        content_type: contentType,
        module_id: moduleId,
        order: nextOrder,
      })
      .select('id')
      .single();

    if (error) throw error;
    setSavedLessonId(data.id);
    return data.id;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a lecture title', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      const lessonData: any = {
        title,
        description: description || null,
        content_type: contentType,
        content: contentType === 'text' ? articleContent || null : null,
        duration_seconds: contentType === 'video' ? videoDuration || null : null,
      };

      // Handle video data based on source
      if (contentType === 'video') {
        if (videoSource === 'upload') {
          lessonData.video_url = videoUrl || null;
          lessonData.video_platform = null;
          lessonData.video_id = null;
        } else if (videoSource === 'external') {
          lessonData.video_url = videoUrl || null; // Store original URL for reference
          lessonData.video_platform = videoPlatform;
          lessonData.video_id = videoId || null;
        }
      } else {
        lessonData.video_url = null;
        lessonData.video_platform = null;
        lessonData.video_id = null;
      }

      if (savedLessonId) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', savedLessonId);
        if (error) throw error;
      } else {
        const { data: maxOrderData } = await supabase
          .from('lessons')
          .select('order')
          .eq('module_id', moduleId)
          .order('order', { ascending: false })
          .limit(1);

        const nextOrder = (maxOrderData?.[0]?.order ?? 0) + 1;

        const { data, error } = await supabase
          .from('lessons')
          .insert({ ...lessonData, module_id: moduleId, order: nextOrder })
          .select('id')
          .single();
        if (error) throw error;
        setSavedLessonId(data.id);
      }

      toast({ title: 'Success', description: savedLessonId ? 'Lecture updated successfully' : 'Lecture created successfully' });
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lecture:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save lecture',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = async (url: string, duration?: number) => {
    setVideoUrl(url);
    if (duration) setVideoDuration(duration);

    // Auto-save video URL to lesson if it exists
    if (savedLessonId && url) {
      const { error } = await supabase.from('lessons').update({
        video_url: url,
        video_platform: null,
        video_id: null,
        duration_seconds: duration || null,
      }).eq('id', savedLessonId);
      if (error) {
        console.error('Error saving video URL:', error);
        toast({ title: 'Error', description: 'Failed to save video URL', variant: 'destructive' });
      }
    }
  };

  const handleVideoUrlChange = (url: string, metadata?: { platform: 'youtube' | 'vimeo'; videoId: string }) => {
    setVideoUrl(url);
    if (metadata) {
      setVideoPlatform(metadata.platform);
      setVideoId(metadata.videoId);
    }

    // Auto-save video data to lesson if it exists
    if (savedLessonId && url && metadata) {
      supabase.from('lessons').update({
        video_url: url,
        video_platform: metadata.platform,
        video_id: metadata.videoId,
      }).eq('id', savedLessonId).then(({ error }) => {
        if (error) {
          console.error('Error saving video metadata:', error);
          toast({ title: 'Error', description: 'Failed to save video metadata', variant: 'destructive' });
        }
      });
    }
  };

  const handleVideoSourceChange = (source: VideoSource) => {
    setVideoSource(source);
    // Clear video data when switching sources
    if (source === 'upload') {
      setVideoPlatform(null);
      setVideoId('');
    } else {
      setVideoUrl('');
    }
  };

  const handleTabChange = async (value: string) => {
    setContentType(value as any);
    // For quiz/assignment tabs, auto-save the lesson first if it has a title
    if ((value === 'quiz' || value === 'assignment' || value === 'video') && !savedLessonId && title.trim()) {
      try {
        await ensureLessonExists();
      } catch (err) {
        // Ignore - user hasn't entered title yet
      }
    }
  };

  const currentLessonId = savedLessonId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-lecture-editor">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lecture' : 'Add New Lecture'}</DialogTitle>
          <DialogDescription>
            Create engaging content for your students. Enter a title and start adding content immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="lecture-title">Lecture Title *</Label>
              <Input id="lecture-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Introduction to Mediation" data-testid="input-title" />
            </div>
            <div>
              <Label htmlFor="lecture-description">Description (Optional)</Label>
              <Textarea id="lecture-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of what students will learn" rows={2} data-testid="input-description" />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Lecture Type</Label>
            <Tabs value={contentType} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" />Video</TabsTrigger>
                <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Article</TabsTrigger>
                <TabsTrigger value="quiz"><ClipboardCheck className="w-4 h-4 mr-2" />Quiz</TabsTrigger>
                <TabsTrigger value="assignment"><FileUp className="w-4 h-4 mr-2" />Assignment</TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="mt-6">
                <div className="space-y-6">
                  <VideoSourceSelector
                    value={videoSource}
                    onChange={handleVideoSourceChange}
                  />
                  
                  {videoSource === 'upload' ? (
                    <VideoUploader
                      lessonId={currentLessonId || undefined}
                      currentVideoUrl={videoUrl}
                      onUploadComplete={handleVideoUpload}
                    />
                  ) : (
                    <VideoUrlInput
                      value={videoUrl}
                      onChange={handleVideoUrlChange}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-6">
                <RichTextEditor content={articleContent} onChange={setArticleContent} placeholder="Write your article content here." />
              </TabsContent>

              <TabsContent value="quiz" className="mt-6">
                {currentLessonId ? (
                  <QuizBuilder lessonId={currentLessonId} onSave={async (quizData) => {
                    try {
                      console.log('Saving quiz with lessonId:', currentLessonId);
                      console.log('Quiz data:', quizData);
                      
                       const normalizedQuestions = (quizData.questions || []).map((question: any, questionIndex: number) => ({
                         question: question.question,
                         questionType: question.questionType || question.type || 'multiple_choice',
                         points: question.points ?? 1,
                         order: question.order ?? questionIndex,
                         answers: question.questionType === 'fill_blank'
                           ? (question.correctAnswer?.trim()
                               ? [{ answer: question.correctAnswer.trim(), isCorrect: true }]
                               : [])
                           : (question.answers || []).map((answer: any, answerIndex: number) => ({
                               answer: answer.answer || answer.text || '',
                               isCorrect: !!answer.isCorrect,
                               order: answerIndex,
                             })),
                       }));

                      console.log('Normalized questions:', normalizedQuestions);

                      // Insert quiz with snake_case columns
                      const { data: quiz, error: quizError } = await supabase.from('quizzes').insert({
                        lesson_id: currentLessonId,
                        title: quizData.title,
                        description: quizData.description || null,
                        time_limit_minutes: quizData.timeLimit || null,
                        passing_score: quizData.passingScore ?? 80,
                        max_attempts: quizData.maxAttempts ?? 3,
                      }).select().single();
                      
                      console.log('Quiz insert result:', { quiz, quizError });
                      if (quizError) throw quizError;

                      // Insert questions and answers - batch insert for efficiency
                       if (normalizedQuestions.length > 0) {
                         console.log('Inserting questions for quiz:', quiz.id);
                         
                         // Batch insert all questions
                         const questionsToInsert = normalizedQuestions.map((q: any, idx: number) => ({
                           quiz_id: quiz.id,
                           question: q.question,
                           question_type: q.questionType,
                           points: q.points ?? 1,
                           order: q.order ?? idx,
                         }));
                         
                         console.log('Questions to insert:', questionsToInsert);
                         const { data: questions, error: questionsError } = await supabase
                           .from('quiz_questions')
                           .insert(questionsToInsert)
                           .select();
                         
                         console.log('Questions insert result:', { questions, questionsError });
                         if (questionsError) {
                           console.error('Questions insert error details:', JSON.stringify(questionsError, null, 2));
                           throw questionsError;
                         }

                         // Insert answers for each question
                         for (let i = 0; i < questions.length; i++) {
                           const question = questions[i];
                           const q = normalizedQuestions[i];
                           
                           if (q.answers?.length > 0) {
                             console.log('Inserting answers for question:', question.id);
                             const answersToInsert = q.answers.map((a: any, idx: number) => ({
                               question_id: question.id,
                               answer: a.answer,
                               is_correct: a.isCorrect ?? false,
                               order: a.order ?? idx,
                             }));
                             console.log('Answers to insert:', answersToInsert);
                             const { error: aError } = await supabase.from('quiz_answers').insert(answersToInsert);
                             console.log('Answers insert result:', { error: aError });
                             if (aError) {
                               console.error('Answers insert error details:', JSON.stringify(aError, null, 2));
                               throw aError;
                             }
                           }
                         }
                      }

                      toast({ title: 'Success', description: 'Quiz saved successfully' });
                    } catch (error) {
                       const errorMessage = error instanceof Error
                         ? error.message
                         : typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
                           ? error.message
                           : 'Failed to save quiz';
                       toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
                    }
                  }} />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Enter a lecture title first</p>
                    <p className="text-sm text-muted-foreground">Type a title above, then the quiz builder will appear automatically</p>
                    {title.trim() && (
                      <Button className="mt-4" onClick={async () => {
                        try { await ensureLessonExists(); } catch (err) {
                          toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                        }
                      }}>
                        Create Lecture & Add Quiz
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assignment" className="mt-6">
                {currentLessonId ? (
                  <AssignmentBuilder lessonId={currentLessonId} onSave={async (assignmentData) => {
                    try {
                      const { error } = await supabase.from('assignments').insert({
                        lesson_id: currentLessonId,
                        title: assignmentData.title,
                        description: assignmentData.description || '',
                        instructions: assignmentData.instructions || null,
                        max_score: assignmentData.maxPoints ?? 100,
                        due_date: assignmentData.dueDate || null,
                        allow_late_submission: assignmentData.allowLateSubmission ?? true,
                      });
                      if (error) throw error;
                      toast({ title: 'Success', description: 'Assignment saved successfully' });
                    } catch (error) {
                      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save assignment', variant: 'destructive' });
                    }
                  }} />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                    <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-medium mb-2">Enter a lecture title first</p>
                    <p className="text-sm text-muted-foreground">Type a title above, then the assignment builder will appear automatically</p>
                    {title.trim() && (
                      <Button className="mt-4" onClick={async () => {
                        try { await ensureLessonExists(); } catch (err) {
                          toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                        }
                      }}>
                        Create Lecture & Add Assignment
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} data-testid="button-cancel">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save">
            {saving ? <>Saving...</> : <><Save className="w-4 h-4 mr-2" />{lesson ? 'Update Lecture' : 'Create Lecture'}</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

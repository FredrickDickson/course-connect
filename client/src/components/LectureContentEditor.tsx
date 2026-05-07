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

export function LectureContentEditor({ open, onOpenChange, lesson, courseId, moduleId, onSave: onLectureSave }: LectureContentEditorProps) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [description, setDescription] = useState(lesson?.description || '');
  const [articleContent, setArticleContent] = useState(lesson?.content || '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
  const [videoPlatform, setVideoPlatform] = useState<'youtube' | 'vimeo' | null>(lesson?.videoPlatform || null);
  const [videoId, setVideoId] = useState(lesson?.videoId || '');
  const [videoDuration, setVideoDuration] = useState<number | undefined>(lesson?.duration || undefined);
  const [videoSource, setVideoSource] = useState<VideoSource>(lesson?.videoUrl ? 'upload' : (lesson?.videoPlatform ? 'external' : 'upload'));
  const [contentType, setContentType] = useState<'video' | 'text' | 'quiz' | 'assignment'>('video');
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id || null);
  const [pendingQuizData, setPendingQuizData] = useState<any>(null);
  const [pendingAssignmentData, setPendingAssignmentData] = useState<any>(null);
  const [existingQuiz, setExistingQuiz] = useState<any>(null);
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
  const [saving, setSaving] = useState(false);
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
    setPendingQuizData(null);
    setPendingAssignmentData(null);
  }, [lesson]);

  // Fetch existing quiz/assignment data when lesson changes
  useEffect(() => {
    if (lesson?.id) {
      // Fetch existing quiz
      supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lesson.id)
        .single()
        .then(async ({ data: quizData, error }) => {
          if (quizData && !error) {
            // Fetch questions separately
            const { data: questionsData } = await supabase
              .from('quiz_questions')
              .select('*')
              .eq('quiz_id', quizData.id)
              .order('order');
            
            const questionsWithAnswers = await Promise.all(
              (questionsData || []).map(async (q: any) => {
                const { data: answersData } = await supabase
                  .from('quiz_answers')
                  .select('*')
                  .eq('question_id', q.id)
                  .order('order');
                
                return {
                  id: q.id,
                  question: q.question,
                  questionType: q.question_type,
                  points: q.points,
                  order: q.order,
                  answers: (answersData || []).map((a: any) => ({
                    id: a.id,
                    answer: a.answer,
                    isCorrect: a.is_correct,
                    order: a.order,
                  })),
                };
              })
            );
            
            setExistingQuiz({
              id: quizData.id,
              title: quizData.title,
              description: quizData.description,
              timeLimit: quizData.time_limit_minutes,
              passingScore: quizData.passing_score,
              maxAttempts: quizData.max_attempts,
              questions: questionsWithAnswers,
            });
          } else {
            setExistingQuiz(null);
          }
        });

      // Fetch existing assignment
      supabase
        .from('assignments')
        .select('*')
        .eq('lesson_id', lesson.id)
        .maybeSingle()
        .then(({ data: assignmentData, error }) => {
          if (assignmentData && !error) {
            setExistingAssignment({
              id: assignmentData.id,
              title: assignmentData.title,
              description: assignmentData.description,
              instructions: assignmentData.instructions,
              maxPoints: assignmentData.max_score,
              dueDate: assignmentData.due_date,
              allowLateSubmission: assignmentData.allow_late_submission,
            });
          } else {
            setExistingAssignment(null);
          }
        });
    } else {
      setExistingQuiz(null);
      setExistingAssignment(null);
    }
  }, [lesson?.id]);

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

      // Save quiz if pending data exists
      console.log('handleSave: pendingQuizData:', pendingQuizData);
      if (pendingQuizData) {
        console.log('Saving quiz with data:', pendingQuizData);
        const lessonIdToUse = savedLessonId || (await ensureLessonExists());
        
        const normalizedQuestions = (pendingQuizData.questions || []).map((question: any, questionIndex: number) => ({
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

        // Check if quiz already exists
        const { data: existingQuizData } = await supabase
          .from('quizzes')
          .select('id')
          .eq('lesson_id', lessonIdToUse)
          .single();

        let quizId: string;

        if (existingQuizData) {
          // Delete existing quiz (CASCADE will delete questions and answers)
          const { error: deleteError } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', existingQuizData.id);
          if (deleteError) throw deleteError;
        } else {
          // Create new quiz
          const { data: quiz, error: quizError } = await supabase.from('quizzes').insert({
            lesson_id: lessonIdToUse,
            title: pendingQuizData.title,
            description: pendingQuizData.description || null,
            time_limit_minutes: pendingQuizData.timeLimit || null,
            passing_score: pendingQuizData.passingScore ?? 80,
            max_attempts: pendingQuizData.maxAttempts ?? 3,
          }).select().single();
          
          if (quizError) throw quizError;
          quizId = quiz.id;
        }

        if (normalizedQuestions.length > 0) {
          const questionsToInsert = normalizedQuestions.map((q: any, idx: number) => ({
            quiz_id: quizId,
            question: q.question,
            question_type: q.questionType,
            points: q.points ?? 1,
            order: q.order ?? idx,
          }));
          
          const { data: questions, error: questionsError } = await supabase
            .from('quiz_questions')
            .insert(questionsToInsert)
            .select();
          
          if (questionsError) throw questionsError;

          for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const q = normalizedQuestions[i];
            
            if (q.answers?.length > 0) {
              const answersToInsert = q.answers.map((a: any, idx: number) => ({
                question_id: question.id,
                answer: a.answer,
                is_correct: a.isCorrect ?? false,
                order: a.order ?? idx,
              }));
              const { error: aError } = await supabase.from('quiz_answers').insert(answersToInsert);
              if (aError) throw aError;
            }
          }
        }
      }

      // Save assignment if pending data exists
      if (pendingAssignmentData) {
        const lessonIdToUse = savedLessonId || (await ensureLessonExists());
        
        // Check if assignment already exists
        const { data: existingAssignmentData } = await supabase
          .from('assignments')
          .select('id')
          .eq('lesson_id', lessonIdToUse)
          .single();

        if (existingAssignmentData) {
          // Update existing assignment
          const { error } = await supabase
            .from('assignments')
            .update({
              title: pendingAssignmentData.title,
              description: pendingAssignmentData.description || '',
              instructions: pendingAssignmentData.instructions || null,
              max_score: pendingAssignmentData.maxPoints ?? 100,
              due_date: pendingAssignmentData.dueDate || null,
              allow_late_submission: pendingAssignmentData.allowLateSubmission ?? true,
            })
            .eq('id', existingAssignmentData.id);
          if (error) throw error;
        } else {
          // Create new assignment
          const { error } = await supabase.from('assignments').insert({
            lesson_id: lessonIdToUse,
            title: pendingAssignmentData.title,
            description: pendingAssignmentData.description || '',
            instructions: pendingAssignmentData.instructions || null,
            max_score: pendingAssignmentData.maxPoints ?? 100,
            due_date: pendingAssignmentData.dueDate || null,
            allow_late_submission: pendingAssignmentData.allowLateSubmission ?? true,
          });
          if (error) throw error;
        }
      }

      toast({ title: 'Success', description: savedLessonId ? 'Lecture updated successfully' : 'Lecture created successfully' });
      onLectureSave();
      onOpenChange(false);
      setPendingQuizData(null);
      setPendingAssignmentData(null);
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-lecture-editor">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lecture' : 'Add New Lecture'}</DialogTitle>
          <DialogDescription>
            Create engaging content for your students. Enter a title and start adding content immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="lecture-title">Lecture Title *</Label>
                <Input id="lecture-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Introduction to Mediation" data-testid="input-title" />
              </div>
              <div>
                <Label htmlFor="lecture-description">Description (Optional)</Label>
                <Textarea id="lecture-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this lecture..." rows={2} />
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
                    <QuizBuilder lessonId={currentLessonId} initialQuiz={existingQuiz} onSave={(quizData) => {
                      console.log('LectureContentEditor received quizData:', quizData);
                      setPendingQuizData(quizData);
                      console.log('pendingQuizData set to:', quizData);
                      toast({ title: 'Quiz saved', description: 'Click "Save Lecture" to save all changes' });
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
                    <AssignmentBuilder lessonId={currentLessonId} initialAssignment={existingAssignment} onSave={(assignmentData) => {
                      // Store assignment data to be saved when main save button is clicked
                      setPendingAssignmentData(assignmentData);
                      toast({ title: 'Assignment ready', description: 'Click "Save Lecture" to save the assignment' });
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

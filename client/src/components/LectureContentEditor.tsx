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
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || '');
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
    setVideoUrl(lesson?.videoUrl || '');
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

    const { data: existing } = await supabase
      .from('lessons')
      .select('order')
      .eq('module_id', moduleId)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.order || 0) + 1;

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
      const lessonData = {
        title,
        description: description || null,
        content_type: contentType,
        video_url: contentType === 'video' ? videoUrl || null : null,
        content: contentType === 'text' ? articleContent || null : null,
        duration_seconds: contentType === 'video' ? videoDuration || null : null,
      };

      if (savedLessonId) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', savedLessonId);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase
          .from('lessons')
          .select('order')
          .eq('module_id', moduleId)
          .order('order', { ascending: false })
          .limit(1);

        const nextOrder = (existing?.[0]?.order || 0) + 1;

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
      await supabase.from('lessons').update({
        video_url: url,
        duration_seconds: duration || null,
      }).eq('id', savedLessonId);
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
                <VideoUploader
                  lessonId={currentLessonId || undefined}
                  currentVideoUrl={videoUrl}
                  onUploadComplete={handleVideoUpload}
                />
              </TabsContent>

              <TabsContent value="text" className="mt-6">
                <RichTextEditor content={articleContent} onChange={setArticleContent} placeholder="Write your article content here." />
              </TabsContent>

              <TabsContent value="quiz" className="mt-6">
                {currentLessonId ? (
                  <QuizBuilder lessonId={currentLessonId} onSave={async (quizData) => {
                    try {
                      const { error } = await supabase.from('quizzes').insert({ ...quizData, lesson_id: currentLessonId });
                      if (error) throw error;
                      toast({ title: 'Success', description: 'Quiz saved successfully' });
                    } catch (error) {
                      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save quiz', variant: 'destructive' });
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
                      const { error } = await supabase.from('assignments').insert({ ...assignmentData, lesson_id: currentLessonId });
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

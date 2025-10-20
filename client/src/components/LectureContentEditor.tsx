import { useState } from 'react';
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
import { apiRequest, queryClient } from '@/lib/queryClient';

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
  const [articleContent, setArticleContent] = useState(lesson?.content || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a lecture title',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (lesson) {
        // Update existing lesson
        await apiRequest('PUT', `/api/instructor/lessons/${lesson.id}`, {
          title,
          description,
          contentType,
          videoUrl: contentType === 'video' ? videoUrl : undefined,
          content: contentType === 'text' ? articleContent : undefined,
        });

        toast({
          title: 'Success',
          description: 'Lecture updated successfully',
        });
      } else {
        // Create new lesson
        await apiRequest('POST', `/api/instructor/modules/${moduleId}/lessons`, {
          title,
          description,
          contentType,
          videoUrl: contentType === 'video' ? videoUrl : undefined,
          content: contentType === 'text' ? articleContent : undefined,
        });

        toast({
          title: 'Success',
          description: 'Lecture created successfully',
        });
      }

      // Invalidate curriculum cache
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses', courseId, 'modules'] });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-lecture-editor">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lecture' : 'Add New Lecture'}</DialogTitle>
          <DialogDescription>
            Create engaging content for your students with videos, articles, quizzes, or assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="lecture-title">Lecture Title *</Label>
              <Input
                id="lecture-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Mediation"
                data-testid="input-title"
              />
            </div>

            <div>
              <Label htmlFor="lecture-description">Description (Optional)</Label>
              <Textarea
                id="lecture-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what students will learn"
                rows={2}
                data-testid="input-description"
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Lecture Type</Label>
            <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="video" data-testid="tab-video">
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </TabsTrigger>
                <TabsTrigger value="text" data-testid="tab-text">
                  <FileText className="w-4 h-4 mr-2" />
                  Article
                </TabsTrigger>
                <TabsTrigger value="quiz" data-testid="tab-quiz">
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  Quiz
                </TabsTrigger>
                <TabsTrigger value="assignment" data-testid="tab-assignment">
                  <FileUp className="w-4 h-4 mr-2" />
                  Assignment
                </TabsTrigger>
              </TabsList>

              <TabsContent value="video" className="mt-6">
                {lesson?.id ? (
                  <VideoUploader
                    lessonId={lesson.id}
                    currentVideoUrl={videoUrl}
                    onUploadComplete={(url) => setVideoUrl(url)}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
                    <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">Save the lecture first to upload video</p>
                    <p className="text-sm text-gray-500">
                      You'll be able to upload video after creating the lecture
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-6">
                <RichTextEditor
                  content={articleContent}
                  onChange={setArticleContent}
                  placeholder="Write your article content here. Use the toolbar for formatting."
                />
              </TabsContent>

              <TabsContent value="quiz" className="mt-6">
                {lesson?.id ? (
                  <QuizBuilder
                    lessonId={lesson.id}
                    onSave={async (quizData) => {
                      try {
                        await apiRequest('POST', `/api/instructor/lessons/${lesson.id}/quiz`, quizData);
                        toast({
                          title: 'Success',
                          description: 'Quiz saved successfully',
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: error instanceof Error ? error.message : 'Failed to save quiz',
                          variant: 'destructive',
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">Save the lecture first to create a quiz</p>
                    <p className="text-sm text-gray-500">
                      You'll be able to build the quiz after creating the lecture
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assignment" className="mt-6">
                {lesson?.id ? (
                  <AssignmentBuilder
                    lessonId={lesson.id}
                    onSave={async (assignmentData) => {
                      try {
                        await apiRequest('POST', `/api/instructor/lessons/${lesson.id}/assignment`, assignmentData);
                        toast({
                          title: 'Success',
                          description: 'Assignment saved successfully',
                        });
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: error instanceof Error ? error.message : 'Failed to save assignment',
                          variant: 'destructive',
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
                    <FileUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">Save the lecture first to create an assignment</p>
                    <p className="text-sm text-gray-500">
                      You'll be able to build the assignment after creating the lecture
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="button-save">
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {lesson ? 'Update Lecture' : 'Create Lecture'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

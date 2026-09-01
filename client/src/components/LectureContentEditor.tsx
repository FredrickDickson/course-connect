import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { VideoUploader } from './VideoUploader';
import { MuxUploader } from './MuxUploader';
import { RichTextEditor } from './RichTextEditor';
import { QuizBuilder } from './QuizBuilder';
import { AssignmentBuilder } from './AssignmentBuilder';
import { PresentationBuilder } from './PresentationBuilder';
import { VideoSourceSelector, VideoSource } from './VideoSourceSelector';
import { VideoUrlInput } from './VideoUrlInput';
import { Video, FileText, ClipboardCheck, FileUp, Save, Upload, Trash2, Download, File, Link as LinkIcon, Loader2, Plus, Presentation as PresentationIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchQuizForLesson, fetchAssignmentForLesson, fetchPresentationForLesson } from '@/lib/curriculum-mutations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LectureContentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  moduleId: string;
  lesson?: {
    id: string;
    title: string;
    description?: string;
    contentType: 'video' | 'text' | 'quiz' | 'assignment' | 'presentation';
    videoUrl?: string;
    videoPlatform?: 'youtube' | 'vimeo';
    videoId?: string;
    muxAssetId?: string;
    muxPlaybackId?: string;
    muxStatus?: string;
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
  const [muxAssetId, setMuxAssetId] = useState<string>('');
  const [muxPlaybackId, setMuxPlaybackId] = useState<string>('');
  const [muxStatus, setMuxStatus] = useState<string>('pending');
  const [contentType, setContentType] = useState<'video' | 'text' | 'quiz' | 'assignment' | 'presentation'>('video');
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id || null);
  const [existingQuiz, setExistingQuiz] = useState<any>(null);
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
  const [existingPresentation, setExistingPresentation] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const { toast } = useToast();
  const ensureLessonPromiseRef = useRef<Promise<string> | null>(null);
  const [videoDirty, setVideoDirty] = useState(false);

  // Reset full editor state when the dialog (re)opens
  useEffect(() => {
    if (!open) return;
    setTitle(lesson?.title || '');
    setDescription(lesson?.description || '');
    setContentType(lesson?.contentType || 'video');
    setVideoSource(lesson?.videoPlatform && lesson?.videoId ? 'external' : (lesson?.muxAssetId ? 'mux' : 'upload'));
    setVideoUrl(lesson?.videoUrl || '');
    setVideoPlatform(lesson?.videoPlatform || null);
    setVideoId(lesson?.videoId || '');
    setMuxAssetId(lesson?.muxAssetId || '');
    setMuxPlaybackId(lesson?.muxPlaybackId || '');
    setMuxStatus(lesson?.muxStatus || 'pending');
    setVideoDuration(lesson?.duration || 0);
    setArticleContent(lesson?.content || '');
    setSavedLessonId(lesson?.id || null);
    setExistingQuiz(null);
    setExistingAssignment(null);
    setExistingPresentation(null);
    ensureLessonPromiseRef.current = null;
    setVideoDirty(false);
  }, [open, lesson?.id]);

  const refreshAttachments = async (lessonId: string) => {
    const [quiz, assignment, presentation] = await Promise.all([
      fetchQuizForLesson(lessonId),
      fetchAssignmentForLesson(lessonId),
      fetchPresentationForLesson(lessonId),
    ]);
    setExistingQuiz(quiz);
    setExistingAssignment(assignment);
    setExistingPresentation(presentation);
  };

  // Fetch existing quiz/assignment data when an existing lesson is opened
  useEffect(() => {
    if (!open) return;
    if (savedLessonId) {
      refreshAttachments(savedLessonId).catch(() => {});
    }
  }, [open, savedLessonId]);

  // Auto-save to create the lesson so video/quiz/assignment can be attached immediately.
  // Concurrent-safe: returns the same in-flight promise to prevent duplicate inserts.
  const ensureLessonExists = async (contentTypeOverride?: typeof contentType): Promise<string> => {
    if (savedLessonId) return savedLessonId;
    if (!title.trim()) throw new Error('Please enter a lecture title first');
    if (ensureLessonPromiseRef.current) return ensureLessonPromiseRef.current;

    const promise = (async () => {
      const { data: newId, error } = await (supabase as any).rpc('create_lesson', {
        _module_id: moduleId,
        _title: title,
        _description: description || null,
        _content_type: contentTypeOverride ?? contentType,
        _mux_asset_id: muxAssetId || null,
        _mux_playback_id: muxPlaybackId || null,
        _mux_status: muxStatus || null,
      });
      if (error) throw error;
      setSavedLessonId(newId as string);
      return newId as string;
    })();
    ensureLessonPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      // Keep the resolved id cached implicitly via savedLessonId; clear ref so retries work
      ensureLessonPromiseRef.current = null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: 'Validation Error', description: 'Please enter a lecture title', variant: 'destructive' });
      return;
    }
    if (!moduleId) {
      toast({ title: 'Error', description: 'Missing section. Please reopen the editor from a section.', variant: 'destructive' });
      return;
    }
    if (contentType === 'presentation' && !existingPresentation) {
      toast({ title: 'Missing presentation file', description: 'Upload a PDF in the Presentation tab before saving, or switch to a different lecture type.', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      // Make sure we have a live session before issuing RLS-protected writes.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: 'Session expired', description: 'Please sign in again to continue.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      try {
        const { data: who } = await (supabase as any).rpc('debug_whoami');
        console.log('[lecture-save] whoami', who, 'moduleId', moduleId, 'session.user.id', sessionData.session.user.id);
      } catch (e) { console.warn('whoami failed', e); }
      try {
        const { data: dbg, error: dbgErr } = await (supabase as any).rpc('debug_lessons_insert', { _module_id: moduleId });
        console.log('[lecture-save] debug_lessons_insert', dbg, 'err', dbgErr);
      } catch (e) { console.warn('debug_lessons_insert failed', e); }

      const lessonData: any = {
        title,
        description: description || null,
        content_type: contentType,
        content: contentType === 'text' ? articleContent || null : null,
        duration_seconds: contentType === 'video' ? videoDuration || null : null,
      };

      // Handle video data based on source
      // When editing an existing lesson, only touch video columns if the user
      // actually interacted with the video controls. This prevents a pure
      // title-edit from wiping the existing video.
      const shouldWriteVideoFields = !savedLessonId || videoDirty || contentType !== 'video';
      if (contentType === 'video' && shouldWriteVideoFields) {
        if (videoSource === 'upload') {
          lessonData.video_url = videoUrl || null;
          lessonData.video_platform = null;
          lessonData.video_id = null;
          lessonData.mux_asset_id = null;
          lessonData.mux_playback_id = null;
          lessonData.mux_status = null;
        } else if (videoSource === 'external') {
          lessonData.video_url = videoUrl || null; // Store original URL for reference
          lessonData.video_platform = videoPlatform;
          lessonData.video_id = videoId || null;
          lessonData.mux_asset_id = null;
          lessonData.mux_playback_id = null;
          lessonData.mux_status = null;
        } else if (videoSource === 'mux') {
          lessonData.video_url = null;
          lessonData.video_platform = null;
          lessonData.video_id = null;
          // Preserve existing Mux asset if local state is empty (e.g. title-only edit)
          lessonData.mux_asset_id = muxAssetId || lesson?.muxAssetId || null;
          lessonData.mux_playback_id = muxPlaybackId || lesson?.muxPlaybackId || null;
          lessonData.mux_status = muxStatus || lesson?.muxStatus || 'pending';
        }
      } else if (contentType !== 'video' && shouldWriteVideoFields) {
        lessonData.video_url = null;
        lessonData.video_platform = null;
        lessonData.video_id = null;
        lessonData.mux_asset_id = null;
        lessonData.mux_playback_id = null;
        lessonData.mux_status = null;
      }

      if (savedLessonId) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', savedLessonId);
        if (error) throw error;
      } else {
        const { data: newId, error } = await (supabase as any).rpc('create_lesson', {
          _module_id: moduleId,
          _title: title,
          _description: description || null,
          _content_type: contentType,
          _content: lessonData.content ?? null,
          _video_url: lessonData.video_url ?? null,
          _video_platform: lessonData.video_platform ?? null,
          _video_id: lessonData.video_id ?? null,
          _duration_seconds: lessonData.duration_seconds ?? null,
          _mux_asset_id: lessonData.mux_asset_id ?? null,
          _mux_playback_id: lessonData.mux_playback_id ?? null,
          _mux_status: lessonData.mux_status ?? null,
        });
        if (error) throw error;
        setSavedLessonId(newId as string);
      }

      toast({ title: 'Success', description: savedLessonId ? 'Lecture updated successfully' : 'Lecture created successfully' });
      onLectureSave();
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
    setVideoDirty(true);
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
    setVideoDirty(true);
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
    setVideoDirty(true);
    setVideoSource(source);
    // Clear video data when switching sources
    if (source === 'upload') {
      setVideoPlatform(null);
      setVideoId('');
      setMuxAssetId('');
      setMuxPlaybackId('');
      setMuxStatus('pending');
    } else if (source === 'external') {
      setVideoUrl('');
      setMuxAssetId('');
      setMuxPlaybackId('');
      setMuxStatus('pending');
    } else if (source === 'mux') {
      setVideoUrl('');
      setVideoPlatform(null);
      setVideoId('');
    }
  };

  const handleMuxUploadComplete = (assetId: string, playbackId: string, durationSeconds?: number) => {
    // The lessons row is already persisted server-side by this point: MuxUploader only
    // calls onUploadComplete after mux-asset-status confirms the DB record is ready
    // (webhook, or the polling endpoint's own fallback write). Writing it again here
    // from the client would just race those two server-side writers, so we only update
    // local state — the explicit "Save Lecture" click still persists from this state too.
    setVideoDirty(true);
    setMuxAssetId(assetId);
    setMuxPlaybackId(playbackId);
    setMuxStatus('ready');
    if (durationSeconds) setVideoDuration(Math.round(durationSeconds));
  };

  const handleMuxUploadError = (errorMessage: string) => {
    toast({ title: 'Mux Upload Error', description: errorMessage, variant: 'destructive' });
    setMuxStatus('error');
  };

  const handleDeleteMuxVideo = async () => {
    if (!muxAssetId || !savedLessonId) return;

    setDeletingVideo(true);
    try {
      const { error } = await supabase.functions.invoke('mux-delete-asset', {
        body: { lessonId: savedLessonId },
      });
      if (error) throw new Error(error.message || 'Failed to delete video');

      // Clear local state
      setMuxAssetId('');
      setMuxPlaybackId('');
      setMuxStatus('pending');
      setVideoDirty(true);

      toast({ title: 'Success', description: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting Mux video:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete video',
        variant: 'destructive',
      });
    } finally {
      setDeletingVideo(false);
    }
  };

  const handleTabChange = async (value: string) => {
    setContentType(value as any);
    // For quiz/assignment tabs, auto-save the lesson first if it has a title
    if ((value === 'quiz' || value === 'assignment' || value === 'video' || value === 'presentation') && !savedLessonId && title.trim()) {
      try {
        // Pass the newly-selected type explicitly: `contentType` state hasn't
        // re-rendered yet at this point, so reading it here would still see
        // the previous tab's value.
        await ensureLessonExists(value as typeof contentType);
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
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="video"><Video className="w-4 h-4 mr-2" />Video</TabsTrigger>
                  <TabsTrigger value="presentation"><PresentationIcon className="w-4 h-4 mr-2" />Presentation</TabsTrigger>
                  <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Article</TabsTrigger>
                  <TabsTrigger value="quiz"><ClipboardCheck className="w-4 h-4 mr-2" />Quiz</TabsTrigger>
                  <TabsTrigger value="assignment"><FileUp className="w-4 h-4 mr-2" />Assignment</TabsTrigger>
                  <TabsTrigger value="resources"><Download className="w-4 h-4 mr-2" />Resources</TabsTrigger>
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
                    ) : videoSource === 'mux' ? (
                      currentLessonId ? (
                        <div className="space-y-4">
                          {muxAssetId && muxStatus === 'ready' && (
                            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <Video className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-medium text-green-800 dark:text-green-200">Video uploaded successfully</span>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteMuxVideo}
                                disabled={deletingVideo}
                              >
                                {deletingVideo ? (
                                  <>Deleting...</>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Video
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                          <MuxUploader
                            lessonId={currentLessonId}
                            onUploadComplete={handleMuxUploadComplete}
                            onError={handleMuxUploadError}
                          />
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium mb-2">Enter a lecture title first</p>
                          <p className="text-sm text-muted-foreground">Type a title above, then the Mux uploader will appear automatically</p>
                          {title.trim() && (
                            <Button className="mt-4" onClick={async () => {
                              try { await ensureLessonExists(); } catch (err) {
                                toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                              }
                            }}>
                              Create Lecture & Upload Video
                            </Button>
                          )}
                        </div>
                      )
                    ) : (
                      <VideoUrlInput
                        value={videoUrl}
                        onChange={handleVideoUrlChange}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="presentation" className="mt-6">
                  {currentLessonId ? (
                    <PresentationBuilder
                      key={`presentation-${currentLessonId}-${existingPresentation?.id || 'new'}`}
                      lessonId={currentLessonId}
                      initialPresentation={existingPresentation}
                      onSaved={() => refreshAttachments(currentLessonId)}
                      onDeleted={() => refreshAttachments(currentLessonId)}
                    />
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                      <PresentationIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-2">Enter a lecture title first</p>
                      <p className="text-sm text-muted-foreground">Type a title above, then the presentation uploader will appear automatically</p>
                      {title.trim() && (
                        <Button className="mt-4" onClick={async () => {
                          try { await ensureLessonExists(); } catch (err) {
                            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                          }
                        }}>
                          Create Lecture & Add Presentation
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="text" className="mt-6">
                  <RichTextEditor content={articleContent} onChange={setArticleContent} placeholder="Write your article content here." />
                </TabsContent>

                <TabsContent value="quiz" className="mt-6">
                  {currentLessonId ? (
                    <QuizBuilder
                      key={`quiz-${currentLessonId}-${existingQuiz?.id || 'new'}`}
                      lessonId={currentLessonId}
                      initialQuiz={existingQuiz}
                      onSaved={() => refreshAttachments(currentLessonId)}
                      onDeleted={() => refreshAttachments(currentLessonId)}
                    />
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
                    <AssignmentBuilder
                      key={`assignment-${currentLessonId}-${existingAssignment?.id || 'new'}`}
                      lessonId={currentLessonId}
                      initialAssignment={existingAssignment}
                      onSaved={() => refreshAttachments(currentLessonId)}
                      onDeleted={() => refreshAttachments(currentLessonId)}
                    />
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

                <TabsContent value="resources" className="mt-6">
                  {currentLessonId ? (
                    <LessonResourceManager lessonId={currentLessonId} />
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/50">
                      <Download className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-2">Enter a lecture title first</p>
                      <p className="text-sm text-muted-foreground">Type a title above, then you can add downloadable resources for students</p>
                      {title.trim() && (
                        <Button className="mt-4" onClick={async () => {
                          try { await ensureLessonExists(); } catch (err) {
                            toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'destructive' });
                          }
                        }}>
                          Create Lecture & Add Resources
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
        {!savedLessonId && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> After creating the lecture, you can add downloadable resources (PDFs, documents, links) for students in the Resources tab when editing the lesson.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Lesson Resource Manager Component
function LessonResourceManager({ lessonId }: { lessonId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceLink, setResourceLink] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch resources for this lesson
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['lesson-resources', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_resources')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!lessonId,
  });

  // Delete resource mutation
  const deleteResource = useMutation({
    mutationFn: async (resourceId: string) => {
      const { error } = await supabase
        .from('lesson_resources')
        .delete()
        .eq('id', resourceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-resources', lessonId] });
      toast({ title: 'Success', description: 'Resource deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to delete resource', variant: 'destructive' });
    },
  });

  const handleAddResource = async () => {
    if (!resourceName.trim()) {
      toast({ title: 'Error', description: 'Please enter a resource name', variant: 'destructive' });
      return;
    }

    if (!resourceFile && !resourceLink.trim()) {
      toast({ title: 'Error', description: 'Please select a file or enter a link', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = resourceLink || null;
      let fileName = resourceName;
      let fileSize = null;
      let fileType = 'link';

      // Upload file if provided
      if (resourceFile) {
        const fileExt = resourceFile.name.split('.').pop();
        const filePath = `${lessonId}/${Date.now()}_${resourceFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('lesson-resources')
          .upload(filePath, resourceFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('lesson-resources')
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        fileName = resourceFile.name;
        fileSize = resourceFile.size;
        fileType = resourceFile.type || 'file';
      }

      // Insert resource record
      const { error: insertError } = await supabase
        .from('lesson_resources')
        .insert({
          lesson_id: lessonId as any,
          name: resourceName,
          file_url: fileUrl as any,
          file_size_mb: fileSize ? parseFloat((fileSize / (1024 * 1024)).toFixed(2)) : null as any,
          resource_type: (resourceFile ? 'file' : 'link') as any,
        });

      if (insertError) throw insertError;

      toast({ title: 'Success', description: 'Resource added successfully' });
      queryClient.invalidateQueries({ queryKey: ['lesson-resources', lessonId] });
      
      // Reset form
      setResourceName('');
      setResourceFile(null);
      setResourceLink('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding resource:', error);
      toast({ title: 'Error', description: 'Failed to add resource', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    if (type?.includes('pdf')) return <File className="w-5 h-5 text-red-500" />;
    if (type?.includes('image')) return <File className="w-5 h-5 text-blue-500" />;
    if (type?.includes('video')) return <Video className="w-5 h-5 text-purple-500" />;
    if (type === 'link') return <LinkIcon className="w-5 h-5 text-green-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[#2c2015]">Lesson Resources</h3>
          <p className="text-sm text-[#6b5d4f]">Add downloadable files or links for students</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm" className="bg-[#5A2633] text-white hover:bg-[#5A2633]">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="bg-[#f5f3ed] border-[#d4c5b0]/30">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="resource-name" className="text-[#2c2015]">Resource Name *</Label>
              <Input
                id="resource-name"
                value={resourceName}
                onChange={(e) => setResourceName(e.target.value)}
                placeholder="e.g., Lecture Notes, Exercise Sheet"
                className="border-[#d4c5b0]"
              />
            </div>

            <div>
              <Label htmlFor="resource-file" className="text-[#2c2015]">Upload File</Label>
              <Input
                id="resource-file"
                type="file"
                onChange={(e) => setResourceFile(e.target.files?.[0] || null)}
                className="border-[#d4c5b0]"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
              />
            </div>

            <div className="text-center text-sm text-[#8b6f47]">— or —</div>

            <div>
              <Label htmlFor="resource-link" className="text-[#2c2015]">External Link</Label>
              <Input
                id="resource-link"
                value={resourceLink}
                onChange={(e) => setResourceLink(e.target.value)}
                placeholder="https://example.com/resource"
                className="border-[#d4c5b0]"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddResource}
                disabled={uploading}
                className="bg-[#5A2633] text-white hover:bg-[#5A2633]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Resource
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setResourceName('');
                  setResourceFile(null);
                  setResourceLink('');
                }}
                disabled={uploading}
                className="border-[#d4c5b0]/50 text-[#5A2633] hover:bg-[#f5f3ed]"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#5A2633]" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-8 text-[#8b6f47]">
          <Download className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No resources added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((resource: any) => (
            <Card key={resource.id} className="bg-white border-[#d4c5b0]/30">
              <CardContent className="p-4 flex items-center gap-3">
                {getResourceIcon(resource.resource_type || resource.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#2c2015] truncate">{resource.name}</p>
                  <p className="text-xs text-[#8b6f47]">
                    {(resource.resource_type || 'file').toUpperCase()}
                    {resource.file_size_mb ? ` · ${resource.file_size_mb} MB` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Delete this resource?')) {
                      deleteResource.mutate(resource.id);
                    }
                  }}
                  className="text-[#5A2633] hover:text-[#5A2633] hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VideoUploader } from './VideoUploader';
import { MuxUploader } from './MuxUploader';
import { RichTextEditor } from './RichTextEditor';
import { QuizBuilder } from './QuizBuilder';
import { AssignmentBuilder } from './AssignmentBuilder';
import { VideoSourceSelector, VideoSource } from './VideoSourceSelector';
import { VideoUrlInput } from './VideoUrlInput';
import { Video, FileText, ClipboardCheck, FileUp, Save, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchQuizForLesson, fetchAssignmentForLesson } from '@/lib/curriculum-mutations';

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
  const [contentType, setContentType] = useState<'video' | 'text' | 'quiz' | 'assignment'>('video');
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lesson?.id || null);
  const [existingQuiz, setExistingQuiz] = useState<any>(null);
  const [existingAssignment, setExistingAssignment] = useState<any>(null);
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
    ensureLessonPromiseRef.current = null;
    setVideoDirty(false);
  }, [open, lesson?.id]);

  const refreshAttachments = async (lessonId: string) => {
    const [quiz, assignment] = await Promise.all([
      fetchQuizForLesson(lessonId),
      fetchAssignmentForLesson(lessonId),
    ]);
    setExistingQuiz(quiz);
    setExistingAssignment(assignment);
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
  const ensureLessonExists = async (): Promise<string> => {
    if (savedLessonId) return savedLessonId;
    if (!title.trim()) throw new Error('Please enter a lecture title first');
    if (ensureLessonPromiseRef.current) return ensureLessonPromiseRef.current;

    const promise = (async () => {
      const { data: newId, error } = await (supabase as any).rpc('create_lesson', {
        _module_id: moduleId,
        _title: title,
        _description: description || null,
        _content_type: contentType,
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
      if (contentType === 'video') {
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
      } else {
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

  const handleMuxUploadComplete = async (assetId: string, playbackId: string) => {
    setMuxAssetId(assetId);
    setMuxPlaybackId(playbackId);
    setMuxStatus('ready');

    // Auto-save mux data to lesson if it exists
    if (savedLessonId && assetId) {
      const { error } = await supabase.from('lessons').update({
        video_url: null,
        video_platform: null,
        video_id: null,
        mux_asset_id: assetId,
        mux_playback_id: playbackId,
        mux_status: 'ready',
      }).eq('id', savedLessonId);
      if (error) {
        console.error('Error saving mux asset:', error);
        toast({ title: 'Error', description: 'Failed to save Mux asset', variant: 'destructive' });
      }
    }
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

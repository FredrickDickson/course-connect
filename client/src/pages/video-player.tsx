import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingState } from "@/components/ui/loading-state";
import { LazyVideoPlayer, type VideoPlayerRef } from "@/components/ui/lazy-video-player";
import { performanceMonitor } from "@/lib/performance";
import CourseTopBar from "@/components/learn/course-top-bar";
import CourseSidebar from "@/components/learn/course-sidebar";
import ContentTabs from "@/components/learn/content-tabs";
import UpNextOverlay from "@/components/learn/up-next-overlay";
import CourseCompleteModal from "@/components/learn/course-complete-modal";
import ArticleStage from "@/components/learn/article-stage";
import QuizStage from "@/components/learn/quiz-stage";
import AssignmentStage from "@/components/learn/assignment-stage";
import PresentationStage from "@/components/learn/presentation-stage";
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { LearnCourse, LearnLesson, ProgressRow } from "@/components/learn/types";
import { AITutorButton } from "@/components/ai-tutor";

const VP: any = LazyVideoPlayer;

export default function VideoPlayerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const { user, isAuthenticated, isLoading, isInstructor } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const videoRef = useRef<VideoPlayerRef>(null);
  const [showUpNext, setShowUpNext] = useState(false);
  const [completedShown, setCompletedShown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [theatreMode, setTheatreMode] = useState(false);
  const lastSavedSec = useRef(0);
  const resumeToastShown = useRef<string | null>(null);
  const completionModalShownThisSession = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({ title: "Please log in", variant: "destructive" });
      setTimeout(() => (window.location.href = "/login"), 400);
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: courseWithEnrollment, isLoading: courseLoading } = useQuery({
    queryKey: ["course-with-enrollment", courseId, user?.id],
    enabled: !!courseId && isAuthenticated,
    queryFn: async () => {
      const startTime = Date.now();
      
      // Combine course data and enrollment check in parallel
      const [courseResult, progressEnrollmentResult] = await Promise.all([
        supabase
          .from("courses")
          .select(`*, modules:modules!modules_course_id_fkey(*, lessons:lessons!lessons_module_id_fkey(*))`)
          .eq("id", courseId!)
          .single(),
        (supabase as any).from("enrollments").select("*")
          .eq("course_id", courseId!).eq("user_id", user!.id).maybeSingle()
      ]);

      if (courseResult.error) throw courseResult.error;
      if (progressEnrollmentResult.error) throw progressEnrollmentResult.error;

      // Sort modules + lessons by order
      const course = courseResult.data as any as LearnCourse;
      course.modules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      course.modules.forEach(m => { m.lessons = (m.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); });

      const queryTime = Date.now() - startTime;
      performanceMonitor.trackQuery(["course-with-enrollment", courseId || "", user?.id || ""], queryTime);

      return {
        course,
        enrollment: {
          isEnrolled: !!progressEnrollmentResult.data,
          paymentEnrollment: null,
          progressEnrollment: progressEnrollmentResult.data
        }
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Extract course and enrollment from combined query
  const course = courseWithEnrollment?.course;
  const enrollment = courseWithEnrollment?.enrollment;

  const allLessons = useMemo<LearnLesson[]>(
    () => course?.modules?.flatMap(m => m.lessons || []) || [],
    [course]
  );

  const { data: progress = [] } = useQuery<ProgressRow[]>({
    queryKey: ["learn-progress", courseId, user?.id],
    enabled: !!user?.id && allLessons.length > 0,
    queryFn: async () => {
      const ids = allLessons.map(l => l.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("progress")
        .select("lesson_id, completed, watch_time_seconds, slide_index")
        .eq("user_id", user!.id).in("lesson_id", ids);
      if (error) throw error;
      return (data || []) as ProgressRow[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Redirect to appropriate lesson if lessonId is not provided
  useEffect(() => {
    if (course && !lessonId && isAuthenticated) {
      // Flatten all lessons in order
      const allLessonsForRedirect: LearnLesson[] = [];
      course.modules?.forEach((module: any) => {
        if (module.lessons) {
          allLessonsForRedirect.push(...module.lessons);
        }
      });
      
      if (allLessonsForRedirect.length > 0) {
        // Find first incomplete lesson based on progress
        const completedLessonIds = new Set(progress.filter(p => p.completed).map(p => p.lesson_id));
        const nextIncompleteLesson = allLessonsForRedirect.find(lesson => !completedLessonIds.has(lesson.id));
        
        // Navigate to first incomplete or first lesson
        const targetLessonId = nextIncompleteLesson?.id ?? allLessonsForRedirect[0]?.id;
        if (targetLessonId) {
          navigate(`/learn/${courseId}/${targetLessonId}`);
        }
      }
    }
  }, [course, lessonId, progress, isAuthenticated, courseId, navigate]);

  const upsertProgress = useMutation({
    mutationFn: async ({ id, completed, watchTimeSeconds, slideIndex }: { id: string; completed: boolean; watchTimeSeconds?: number; slideIndex?: number }) => {
      const payload: Record<string, any> = {
        user_id: user!.id, lesson_id: id, completed,
        last_watched_at: new Date().toISOString(),
      };
      if (watchTimeSeconds !== undefined) payload.watch_time_seconds = Math.floor(watchTimeSeconds);
      if (slideIndex !== undefined) payload.slide_index = Math.floor(slideIndex);
      const { error } = await supabase.from("progress").upsert(payload, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
    onMutate: async ({ id, completed, watchTimeSeconds, slideIndex }) => {
      // Optimistic update so checkbox/progress tick immediately
      const key = ["learn-progress", courseId, user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProgressRow[]>(key) || [];
      const patch: Partial<ProgressRow> = { completed };
      if (watchTimeSeconds !== undefined) patch.watch_time_seconds = Math.floor(watchTimeSeconds);
      if (slideIndex !== undefined) patch.slide_index = Math.floor(slideIndex);
      const next = prev.some(p => p.lesson_id === id)
        ? prev.map(p => p.lesson_id === id ? { ...p, ...patch } : p)
        : [...prev, { lesson_id: id, watch_time_seconds: null, slide_index: null, ...patch } as ProgressRow];
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["learn-progress", courseId, user?.id], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["learn-progress", courseId] }),
  });

  // Update enrollment completion status when course is complete
  const updateEnrollmentCompletion = useMutation({
    mutationFn: async () => {
      // Update enrollment
      const { error: enrollmentError } = await supabase
        .from("enrollments")
        .update({
          completed_at: new Date().toISOString(),
          status: "COMPLETED",
          progress: 100,
        })
        .eq("user_id", user!.id)
        .eq("course_id", courseId);
      if (enrollmentError) throw enrollmentError;

      // Create course completion record
      try {
        const { data: courseData } = await supabase
          .from("courses")
          .select("track, level")
          .eq("id", courseId!)
          .single();

        if (courseData) {
          await supabase.from("course_completion_records").insert({
            user_id: user!.id,
            course_id: courseId!,
            track: (courseData.track || "ARBITRATION").toUpperCase(),
            level_achieved: (courseData.level || "ASSOCIATE").toUpperCase(),
            assessment_passed: true,
            completed_at: new Date().toISOString(),
            is_supplementary: false,
          });
        }
      } catch (err) {
        console.error("Failed to create course completion record:", err);
        // Non-fatal - enrollment update succeeded
      }
    },
    onSuccess: () => {
      toast({ title: "Course completed!", description: "Your certificate is now available." });
      qc.invalidateQueries({ queryKey: ["enrollments", user?.id] });
      qc.invalidateQueries({ queryKey: ["course-completion-records", user?.id] });
    },
    onError: (e: Error) => {
      console.error("Failed to update enrollment completion:", e);
    },
  });

  const currentLesson = allLessons.find(l => l.id === lessonId);
  const currentModule = course?.modules?.find(m => m.lessons?.some(l => l.id === lessonId));
  const idx = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = idx > 0 ? allLessons[idx - 1] : undefined;
  const nextLesson = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : undefined;
  const completedCount = progress.filter(p => p.completed).length;

  const goToLesson = (id: string) => navigate(`/learn/${courseId}/${id}`);
  const handleToggleComplete = (id: string, completed: boolean) => {
    const existing = progress.find(p => p.lesson_id === id);
    upsertProgress.mutate({
      id, completed,
      watchTimeSeconds: existing?.watch_time_seconds ?? undefined,
      slideIndex: existing?.slide_index ?? undefined,
    });
  };

  const resumeSeconds = currentLesson
    ? (progress.find(p => p.lesson_id === currentLesson.id)?.watch_time_seconds || 0)
    : 0;
  const resumeSlideIndex = currentLesson
    ? (progress.find(p => p.lesson_id === currentLesson.id)?.slide_index || 0)
    : 0;

  // Reset autosave clock when switching lesson; show resume toast once.
  useEffect(() => {
    lastSavedSec.current = 0;
    if (!currentLesson || resumeToastShown.current === currentLesson.id) return;
    const isPresentation = (currentLesson.content_type || "").toLowerCase() === "presentation";
    if (isPresentation) {
      if (resumeSlideIndex > 0) {
        resumeToastShown.current = currentLesson.id;
        toast({ title: "Resumed playback", description: `Continuing from slide ${resumeSlideIndex + 1}` });
      }
    } else if (resumeSeconds > 5) {
      resumeToastShown.current = currentLesson.id;
      const mm = Math.floor(resumeSeconds / 60);
      const ss = String(Math.floor(resumeSeconds % 60)).padStart(2, "0");
      toast({ title: "Resumed playback", description: `Continuing from ${mm}:${ss}` });
    }
  }, [currentLesson?.id]);

  // Save on tab close
  useEffect(() => {
    const onUnload = () => {
      const cur = videoRef.current?.currentTime || 0;
      const dur = videoRef.current?.duration || 0;
      if (!currentLesson || !cur) return;
      try {
        upsertProgress.mutate({ id: currentLesson.id, completed: dur ? cur >= dur * 0.9 : false, watchTimeSeconds: cur });
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [currentLesson?.id]);

  // External videos require manual completion - removed auto-complete to ensure users actually watch the content

  // Course complete modal - show only once per session
  useEffect(() => {
    if (!completionModalShownThisSession.current && allLessons.length > 0 && completedCount === allLessons.length) {
      completionModalShownThisSession.current = true;
      setCompletedShown(true);
      // Update enrollment completion status when course is complete
      updateEnrollmentCompletion.mutate();
    }
  }, [completedCount, allLessons.length]);

  if (isLoading || courseLoading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState message="Loading course..." size="lg" />
      </div>
    );
  }
  if (!enrollment?.isEnrolled && !currentLesson?.is_preview && !isInstructor()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Enroll to access this course</h1>
        <p className="text-muted-foreground mb-6">You need to be enrolled to view these lessons.</p>
        <Link href={`/course/${courseId}`}><Button>Go to course page</Button></Link>
      </div>
    );
  }
  if (!currentLesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Lesson not found</h1>
        <Link href={`/course/${courseId}`}><Button>Back to course</Button></Link>
      </div>
    );
  }

  const sectionIndex = (course.modules?.findIndex(m => m.id === currentModule?.id) ?? 0) + 1;
  const lessonType = (currentLesson.content_type || "video").toLowerCase();
  const isVideoLesson = lessonType === "video" || (!!currentLesson.video_url || !!currentLesson.video_id);
  const lessonProgress = progress.find(p => p.lesson_id === currentLesson.id);

  return (
    <div className="h-screen flex flex-col bg-[#F5F1E8] overflow-hidden">
      {!theatreMode && (
        <CourseTopBar
          course={course}
          completed={completedCount}
          total={allLessons.length}
          nextLessonHref={nextLesson ? `/learn/${courseId}/${nextLesson.id}` : undefined}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Left side with dark theme (kept for navigation contrast) */}
        {sidebarOpen && !theatreMode && (
          <div className="hidden lg:block">
            <CourseSidebar
              course={course} courseId={courseId!} currentLessonId={currentLesson.id}
              progress={progress} onToggleComplete={handleToggleComplete}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
        {!sidebarOpen && !theatreMode && (
          <button onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex fixed left-0 top-20 z-20 bg-[#5A2633] text-white px-3 py-2 rounded-r-md shadow items-center gap-2 text-sm hover:bg-[#3D1A22] transition-colors">
            <ListVideo className="h-4 w-4" /> Course content
          </button>
        )}

        <main className="flex-1 flex flex-col overflow-y-auto bg-[#F5F1E8]">
          {/* Course Header - Lesson Title and Metadata with Official CIMA Colors */}
          {!theatreMode && (
            <div className="px-6 lg:px-12 py-6 bg-white border-b border-[#E8E4DC]">
              <div className="max-w-5xl">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-[#B49A67] uppercase tracking-wider">
                    {currentModule?.title || 'Module'} - Video Lesson
                  </span>
                  {currentLesson.content_type && (
                    <Badge className="bg-[#5A2633] text-white text-xs border-0 uppercase">
                      {currentLesson.content_type}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-[#252525] mb-3 leading-tight">
                  {currentLesson.title}
                </h1>
                {currentLesson.description && (
                  <p className="text-base text-[#4A4A4A] leading-relaxed max-w-4xl">
                    {currentLesson.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Video/Content Area - Dark Theme */}
          {isVideoLesson ? (
            <div className="bg-black">
              <ErrorBoundary>
                <VP
                  ref={videoRef}
                  src={currentLesson.video_url}
                  videoPlatform={currentLesson.mux_playback_id ? 'mux' : currentLesson.video_platform}
                  videoId={currentLesson.video_id}
                  muxPlaybackId={currentLesson.mux_playback_id}
                  startAt={resumeSeconds}
                  onTimeUpdate={(cur: number, dur: number) => {
                    if (!cur) return;
                    upsertProgress.mutate({ id: currentLesson.id, completed: dur ? cur >= dur * 0.9 : false, watchTimeSeconds: cur });
                  }}
                  onEnded={() => {
                    upsertProgress.mutate({ id: currentLesson.id, completed: true, watchTimeSeconds: videoRef.current?.duration || 0 });
                    if (nextLesson) setShowUpNext(true);
                  }}
                  onTheatreModeChange={setTheatreMode}
                />
                {showUpNext && nextLesson && (
                  <UpNextOverlay
                    nextTitle={nextLesson.title}
                    onPlay={() => { setShowUpNext(false); goToLesson(nextLesson.id); }}
                    onCancel={() => setShowUpNext(false)}
                  />
                )}
              </ErrorBoundary>
            </div>
          ) : lessonType === "article" ? (
            <ArticleStage
              lesson={currentLesson}
              completed={!!lessonProgress?.completed}
              onMarkComplete={() => handleToggleComplete(currentLesson.id, true)}
            />
          ) : lessonType === "quiz" ? (
            <QuizStage lesson={currentLesson} onComplete={() => handleToggleComplete(currentLesson.id, true)} />
          ) : lessonType === "assignment" ? (
            <AssignmentStage lesson={currentLesson} onComplete={() => handleToggleComplete(currentLesson.id, true)} />
          ) : lessonType === "presentation" ? (
            <PresentationStage
              lesson={currentLesson}
              initialSlide={resumeSlideIndex}
              completed={!!lessonProgress?.completed}
              onProgress={(slideIndex, completed) =>
                upsertProgress.mutate({ id: currentLesson.id, completed, slideIndex })
              }
            />
          ) : null}

          {/* Content Section - Official CIMA Light Theme */}
          <div className="px-6 lg:px-12 py-8 bg-[#F5F1E8]">
            <div className="max-w-5xl space-y-8">
              {/* Transcript/Overview Section */}
              <ContentTabs
                course={course}
                lesson={currentLesson}
                moduleTitle={currentModule?.title}
                getCurrentVideoTime={() => videoRef.current?.currentTime || 0}
              />

              {/* Navigation Buttons - Official CIMA Colors */}
              <div className="flex items-center justify-between gap-4 pt-6 pb-20 border-t border-[#D1CEC7]">
                <Button 
                  variant="outline" 
                  size="lg" 
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)} 
                  className="flex-1 sm:flex-none border-[#D1CEC7] hover:border-[#B49A67] bg-white text-[#5A2633] hover:bg-[#F5F1E8] transition-all"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous lesson
                </Button>
                <Button 
                  size="lg" 
                  disabled={!nextLesson}
                  onClick={() => nextLesson && goToLesson(nextLesson.id)}
                  className="flex-1 sm:flex-none bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-md hover:shadow-lg transition-all"
                >
                  {nextLesson ? "Next lesson" : "Course Complete"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Course Content Button */}
          {!theatreMode && (
            <div className="lg:hidden fixed bottom-6 right-6 z-30">
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button size="lg" className="bg-[#5A2633] hover:bg-[#3D1A22] text-white shadow-lg">
                    <ListVideo className="h-5 w-5 mr-2" />
                    Course content
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-full sm:max-w-md bg-white border-l border-[#E8E4DC] text-[#252525] [&>button]:text-[#5A2633] [&>button]:opacity-100 [&>button]:right-3 [&>button]:top-3 [&>button]:h-10 [&>button]:w-10 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:hover:bg-[#F5F1E8] [&>button>svg]:h-5 [&>button>svg]:w-5">
                  <CourseSidebar
                    course={course} courseId={courseId!} currentLessonId={currentLesson.id}
                    progress={progress} onToggleComplete={handleToggleComplete}
                    onLessonClick={() => setMobileSheetOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>
          )}
        </main>
      </div>

      <CourseCompleteModal
        open={completedShown && completedCount === allLessons.length}
        onOpenChange={(o) => !o && setCompletedShown(false)}
        courseTitle={course.title}
        courseId={course.id}
      />

      {/* AI Tutor - Only show when enrolled or instructor */}
      {(enrollment?.isEnrolled || isInstructor()) && currentLesson && (
        <AITutorButton
          lessonContext={{
            courseId: courseId!,
            courseName: course.title,
            courseLevel: course.level || 'associate',
            courseTrack: course.track || 'ARBITRATION',
            lessonId: currentLesson.id,
            lessonTitle: currentLesson.title,
            lessonType: lessonType as any,
            lessonContent: currentLesson.content || undefined,
            lessonDescription: currentLesson.description || undefined,
          }}
        />
      )}
    </div>
  );
}

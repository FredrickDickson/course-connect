import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import type { LearnCourse, LearnLesson, ProgressRow } from "@/components/learn/types";

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
  const lastSavedSec = useRef(0);
  const resumeToastShown = useRef<string | null>(null);

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
      const [courseResult, paymentEnrollmentResult, progressEnrollmentResult] = await Promise.all([
        supabase
          .from("courses")
          .select(`*, modules:modules!modules_course_id_fkey(*, lessons:lessons!lessons_module_id_fkey(*))`)
          .eq("id", courseId!)
          .single(),
        (supabase as any).from("course_enrollments").select("*")
          .eq("course_id", courseId!).eq("user_id", user!.id).neq("payment_status", "cancelled").maybeSingle(),
        (supabase as any).from("enrollments").select("*")
          .eq("course_id", courseId!).eq("user_id", user!.id).maybeSingle()
      ]);

      if (courseResult.error) throw courseResult.error;
      if (paymentEnrollmentResult.error) throw paymentEnrollmentResult.error;
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
          isEnrolled: !!(paymentEnrollmentResult.data || progressEnrollmentResult.data),
          paymentEnrollment: paymentEnrollmentResult.data,
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
        .select("lesson_id, completed, watch_time_seconds")
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
    mutationFn: async ({ id, completed, watch }: { id: string; completed: boolean; watch: number }) => {
      const { error } = await supabase.from("progress").upsert({
        user_id: user!.id, lesson_id: id, completed, watch_time_seconds: Math.floor(watch),
        last_watched_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
    onMutate: async ({ id, completed, watch }) => {
      // Optimistic update so checkbox/progress tick immediately
      const key = ["learn-progress", courseId, user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ProgressRow[]>(key) || [];
      const next = prev.some(p => p.lesson_id === id)
        ? prev.map(p => p.lesson_id === id ? { ...p, completed, watch_time_seconds: Math.floor(watch) } : p)
        : [...prev, { lesson_id: id, completed, watch_time_seconds: Math.floor(watch) } as ProgressRow];
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _v, ctx: any) => { if (ctx?.prev) qc.setQueryData(["learn-progress", courseId, user?.id], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["learn-progress", courseId] }),
  });

  // Update enrollment completion status when course is complete
  const updateEnrollmentCompletion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("enrollments")
        .update({
          completed_at: new Date().toISOString(),
          status: "COMPLETED",
          progress: 100,
        })
        .eq("user_id", user!.id)
        .eq("course_id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Course completed!", description: "Your certificate is now available." });
      qc.invalidateQueries({ queryKey: ["enrollments", user?.id] });
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
  const handleToggleComplete = (id: string, completed: boolean) =>
    upsertProgress.mutate({ id, completed, watch: progress.find(p => p.lesson_id === id)?.watch_time_seconds || 0 });

  const resumeSeconds = currentLesson
    ? (progress.find(p => p.lesson_id === currentLesson.id)?.watch_time_seconds || 0)
    : 0;

  // Reset autosave clock when switching lesson; show resume toast once.
  useEffect(() => {
    lastSavedSec.current = 0;
    if (currentLesson && resumeSeconds > 5 && resumeToastShown.current !== currentLesson.id) {
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
        upsertProgress.mutate({ id: currentLesson.id, completed: dur ? cur >= dur * 0.9 : false, watch: cur });
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [currentLesson?.id]);

  // External videos require manual completion - removed auto-complete to ensure users actually watch the content

  // Course complete modal
  useEffect(() => {
    if (!completedShown && allLessons.length > 0 && completedCount === allLessons.length) {
      setCompletedShown(true);
      // Update enrollment completion status when course is complete
      updateEnrollmentCompletion.mutate();
    }
  }, [completedCount, allLessons.length, completedShown]);

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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <CourseTopBar
        course={course}
        completed={completedCount}
        total={allLessons.length}
        nextLessonHref={nextLesson ? `/learn/${courseId}/${nextLesson.id}` : undefined}
      />

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-3 border-b bg-background">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/course-catalog">Course Catalog</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/course/${courseId}`}>{course.title}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentLesson.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {isVideoLesson ? (
            <div className="flex-1 bg-black relative">
              <ErrorBoundary>
                <VP
                  ref={videoRef}
                  src={currentLesson.video_url}
                  platform={currentLesson.video_platform}
                  videoId={currentLesson.video_id}
                  onTimeUpdate={(cur: number, dur: number) => {
                    if (!cur) return;
                    upsertProgress.mutate({ id: currentLesson.id, completed: dur ? cur >= dur * 0.9 : false, watch: cur });
                  }}
                  onEnded={() => {
                    upsertProgress.mutate({ id: currentLesson.id, completed: true, watch: videoRef.current?.duration || 0 });
                    if (nextLesson) setShowUpNext(true);
                  }}
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
          ) : null}

          <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4 max-w-5xl w-full">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Section {sectionIndex} · {currentModule?.title}</p>
                <h2 className="text-xl sm:text-2xl font-bold font-serif">{currentLesson.title}</h2>
              </div>
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="default" className="lg:hidden"><ListVideo className="h-4 w-4 mr-2" />Course content</Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="p-0 w-full sm:max-w-md bg-[#1C1D1F] border-l-0">
                    <CourseSidebar
                      course={course} courseId={courseId!} currentLessonId={currentLesson.id}
                      progress={progress} onToggleComplete={handleToggleComplete}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t">
              <Button variant="outline" size="sm" disabled={!prevLesson}
                onClick={() => prevLesson && goToLesson(prevLesson.id)} className="min-w-0">
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{prevLesson?.title || "Previous"}</span>
              </Button>
              <Button size="sm" disabled={!nextLesson}
                onClick={() => nextLesson && goToLesson(nextLesson.id)}
                className="bg-[#B91C1C] hover:bg-[#A01818] min-w-0">
                <span className="truncate max-w-[120px] sm:max-w-[200px]">{nextLesson?.title || "Course end"}</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <ContentTabs
              course={course}
              lesson={currentLesson}
              moduleTitle={currentModule?.title}
              getCurrentVideoTime={() => videoRef.current?.currentTime || 0}
            />
          </div>
        </main>

        {sidebarOpen && (
          <div className="hidden lg:block">
            <CourseSidebar
              course={course} courseId={courseId!} currentLessonId={currentLesson.id}
              progress={progress} onToggleComplete={handleToggleComplete}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        )}
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)}
            className="hidden lg:flex fixed right-3 top-20 z-20 bg-[#1C1D1F] text-white px-3 py-2 rounded-l-md shadow items-center gap-2 text-sm">
            <ListVideo className="h-4 w-4" /> Course content
          </button>
        )}
      </div>

      <CourseCompleteModal
        open={completedShown && completedCount === allLessons.length}
        onOpenChange={(o) => !o && setCompletedShown(false)}
        courseTitle={course.title}
        courseId={course.id}
      />
    </div>
  );
}

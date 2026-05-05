import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { isUnauthorizedError } from "@/lib/authUtils";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import VideoPlayer from "@/components/ui/video-player";
import type { VideoPlayerRef } from "@/components/ui/video-player";
import { AlertCircle } from "lucide-react";

// Type definitions
import { Database } from "@/integrations/supabase/types";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
type Module = Database["public"]["Tables"]["modules"]["Row"] & {
  lessons?: Lesson[];
};
type Course = Database["public"]["Tables"]["courses"]["Row"] & {
  modules?: Module[];
};

interface ProgressItem {
  completed: boolean;
  watch_time_seconds: number;
  lesson: Lesson;
}

export default function VideoPlayer() {
  const { courseId, lessonId } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<VideoPlayerRef>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [note, setNote] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isExternalVideo, setIsExternalVideo] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          `
          *,
          modules:modules!modules_course_id_fkey(*, lessons:lessons!lessons_module_id_fkey(*))
        `,
        )
        .eq("id", courseId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && isAuthenticated,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment-check", courseId],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId as string)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data ? { isEnrolled: true, ...data } : { isEnrolled: false };
    },
    enabled: !!courseId && !!user && isAuthenticated,
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ["progress", courseId],
    queryFn: async () => {
      // Get all modules and lessons for this course first to filter progress correctly
      const { data, error } = await supabase
        .from("progress")
        .select("*, lesson:lessons!inner(*)")
        .eq("user_id", user?.id || "");

      if (error) throw error;

      // Filter the progress records that belong to this course's lessons
      const courseLessons =
        course?.modules?.flatMap(
          (m: Module) => m.lessons?.map((l: Lesson) => l.id) || [],
        ) || [];
      return (data || []).filter((p: any) =>
        courseLessons.includes(p.lesson_id),
      );
    },
    enabled: !!courseId && !!user && !!course && isAuthenticated,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({
      lessonId,
      watch_time_seconds,
      completed,
    }: {
      lessonId: string;
      watch_time_seconds: number;
      completed: boolean;
    }) => {
      const { data, error } = await supabase
        .from("progress")
        .upsert(
          {
            user_id: user?.id || "",
            lesson_id: lessonId,
            watch_time_seconds: watch_time_seconds,
            completed: completed,
            last_watched_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,lesson_id",
          },
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
    },
  });

  // Find current lesson and module
  const currentLesson = course?.modules?.reduce(
    (found: Lesson | null, module: Module) => {
      if (found) return found;
      return (
        module.lessons?.find((lesson: Lesson) => lesson.id === lessonId) || null
      );
    },
    null as Lesson | null,
  );

  const currentModule = course?.modules?.find((module: Module) =>
    module.lessons?.some((lesson: Lesson) => lesson.id === lessonId),
  );

  // Get all lessons in order
  const allLessons =
    course?.modules?.reduce((acc: Lesson[], module: Module) => {
      return [...acc, ...(module.lessons || [])];
    }, [] as Lesson[]) || [];

  const currentLessonIndex = allLessons.findIndex(
    (lesson: Lesson) => lesson.id === lessonId,
  );
  const nextLesson = allLessons[currentLessonIndex + 1];
  const prevLesson = allLessons[currentLessonIndex - 1];

  // Check if this is an external video (YouTube/Vimeo)
  useEffect(() => {
    const lessonAny = currentLesson as any;
    setIsExternalVideo(!!(lessonAny?.video_platform && lessonAny?.video_id));
  }, [currentLesson]);


  // Auto-mark as complete for external videos after 30 seconds
  useEffect(() => {
    if (!isExternalVideo || !currentLesson) return;

    const lessonProgress = progressList.find(
      (p: { lesson_id: string | null }) => p.lesson_id === lessonId,
    );

    // If not already completed, mark as complete after 30 seconds
    if (!lessonProgress?.completed) {
      const timer = setTimeout(() => {
        updateProgressMutation.mutate({
          lessonId: currentLesson.id,
          watch_time_seconds: 30,
          completed: true,
        });
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isExternalVideo, currentLesson, progressList, lessonId]);


  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="animate-pulse p-8">
          <div className="h-64 bg-muted rounded mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (courseLoading || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="animate-pulse p-8">
          <div className="h-64 bg-muted rounded mb-4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!enrollment?.isEnrolled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-4xl mx-auto px-4 py-16 text-center"
          data-testid="not-enrolled"
        >
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-8">
            You need to be enrolled in this course to access the content.
          </p>
          <Link href={`/course/${courseId}`}>
            <Button data-testid="enroll-button">Enroll in Course</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-4xl mx-auto px-4 py-16 text-center"
          data-testid="lesson-not-found"
        >
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Lesson Not Found
          </h1>
          <p className="text-muted-foreground mb-8">
            The lesson you're looking for doesn't exist.
          </p>
          <Link href={`/course/${courseId}`}>
            <Button data-testid="back-to-course">Back to Course</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <ErrorBoundary>
              <Card className="overflow-hidden" data-testid="video-player">
                {isExternalVideo ? (
                  <VideoPlayer
                    videoUrl={(currentLesson as any)?.video_url}
                    videoPlatform={(currentLesson as any)?.video_platform}
                    videoId={(currentLesson as any)?.video_id}
                    onError={() => {
                      setVideoError("Failed to load video");
                      setIsVideoLoading(false);
                    }}
                  />
                ) : (
                  <div className="relative bg-black aspect-video">
                    {isVideoLoading && currentLesson.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                      </div>
                    )}
                    {videoError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                        <div className="text-center text-white p-4">
                          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <p className="text-red-400 mb-4">{videoError}</p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setVideoError(null);
                              setIsVideoLoading(true);
                              // Force video reload
                              const video = videoRef.current;
                              if (video) {
                                video.load();
                              }
                            }}
                          >
                            <i className="fas fa-redo mr-2"></i>
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                    {currentLesson.video_url ? (
                      <VideoPlayer
                        ref={videoRef}
                        src={currentLesson.video_url}
                        onTimeUpdate={() => {
                          const currentTime = videoRef.current?.currentTime || 0;
                          const duration = videoRef.current?.duration || 0;
                          setCurrentTime(currentTime);
                          setDuration(duration);

                          // Update progress every 10 seconds
                          if (Math.floor(currentTime) % 10 === 0 && currentLesson) {
                            const watchTimeSecondsValue = Math.floor(currentTime);
                            const completed = currentTime >= duration * 0.9;

                            updateProgressMutation.mutate({
                              lessonId: currentLesson.id,
                              watch_time_seconds: watchTimeSecondsValue,
                              completed,
                            });
                          }
                        }}
                        onLoadedMetadata={() => {
                          const duration = videoRef.current?.duration || 0;
                          setDuration(duration);
                          setIsVideoLoading(false);

                          // Resume from last watched position
                          const lessonProgress = progressList.find(
                            (p: { lesson_id: string | null; watch_time_seconds: number | null }) =>
                              p.lesson_id === lessonId,
                          );
                          if (lessonProgress && (lessonProgress.watch_time_seconds || 0) > 0) {
                            // Note: The new component doesn't support setting currentTime directly yet
                            // This functionality is temporarily disabled
                          }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onError={() => {
                          setVideoError("Failed to load video. Please check your connection or try again.");
                          setIsVideoLoading(false);
                        }}
                        onLoadStart={() => {
                          setIsVideoLoading(true);
                          setVideoError(null);
                        }}
                        onCanPlay={() => {
                          setIsVideoLoading(false);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                          <i className="fas fa-play-circle text-6xl mb-4 opacity-50"></i>
                          <p>Video content coming soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </ErrorBoundary>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline" data-testid="module-badge">
                      {currentModule?.title}
                    </Badge>
                    <Badge
                      data-testid="lesson-type"
                      className={
                        currentLesson.content_type === "video"
                          ? "bg-primary"
                          : "bg-secondary"
                      }
                    >
                      {currentLesson.content_type}
                    </Badge>
                  </div>
                  <h1
                    className="text-2xl font-bold text-foreground mb-2"
                    data-testid="lesson-title"
                  >
                    {currentLesson.title}
                  </h1>
                  {currentLesson.description && (
                    <p
                      className="text-muted-foreground"
                      data-testid="lesson-description"
                    >
                      {currentLesson.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {currentLesson.duration_seconds && (
                    <div
                      className="text-sm text-muted-foreground"
                      data-testid="lesson-duration"
                    >
                      {formatTime(currentLesson.duration_seconds)}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar - only show for uploaded videos */}
              {!isExternalVideo && duration > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span data-testid="video-progress">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                  <Progress
                    value={(currentTime / duration) * 100}
                    className="h-2"
                    data-testid="progress-bar"
                  />
                </div>
              )}
              {isExternalVideo && (
                <div className="text-sm text-muted-foreground">
                  External video - progress tracking not available
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  {prevLesson && (
                    <Link href={`/learn/${courseId}/${prevLesson.id}`}>
                      <Button variant="outline" data-testid="prev-lesson">
                        <i className="fas fa-chevron-left mr-2"></i>
                        Previous
                      </Button>
                    </Link>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Link href={`/course/${courseId}`}>
                    <Button variant="outline" data-testid="back-to-course">
                      <i className="fas fa-book mr-2"></i>
                      Course Overview
                    </Button>
                  </Link>
                  {nextLesson ? (
                    <Link href={`/learn/${courseId}/${nextLesson.id}`}>
                      <Button data-testid="next-lesson">
                        Next
                        <i className="fas fa-chevron-right ml-2"></i>
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled data-testid="course-complete">
                      <i className="fas fa-check mr-2"></i>
                      Course Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lesson Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList
                className="grid w-full grid-cols-3"
                data-testid="lesson-tabs"
              >
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" data-testid="tab-overview">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Lesson Overview
                    </h3>
                    <div className="prose prose-slate max-w-none">
                      {currentLesson.content ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: currentLesson.content,
                          }}
                        />
                      ) : (
                        <p className="text-muted-foreground">
                          This lesson covers essential concepts in{" "}
                          {currentModule?.title?.toLowerCase()}. Follow along
                          with the video content and take notes for future
                          reference.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" data-testid="tab-notes">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Personal Notes
                    </h3>
                    <Textarea
                      placeholder="Take notes while watching the lesson..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[200px] mb-4"
                      data-testid="notes-textarea"
                    />
                    <Button data-testid="save-notes">
                      <i className="fas fa-save mr-2"></i>
                      Save Notes
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" data-testid="tab-resources">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Additional Resources
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <i className="fas fa-file-pdf text-red-600"></i>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            Lesson Transcript
                          </div>
                          <div className="text-sm text-muted-foreground">
                            PDF • 2 pages
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="download-transcript"
                        >
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <i className="fas fa-file-powerpoint text-orange-600"></i>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            Presentation Slides
                          </div>
                          <div className="text-sm text-muted-foreground">
                            PPTX • 15 slides
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="download-slides"
                        >
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <i className="fas fa-external-link-alt text-blue-600"></i>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            External Reading
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Related articles and resources
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="external-resources"
                        >
                          <i className="fas fa-external-link-alt"></i>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Course Navigation */}
          <div className="space-y-6">
            {/* Course Progress */}
            <Card data-testid="course-progress">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Course Progress
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Overall Progress
                    </span>
                    <span className="font-medium">
                      {
                        progressList.filter(
                          (p: { completed: boolean | null }) => p.completed,
                        ).length
                      }{" "}
                      / {allLessons.length}
                    </span>
                  </div>
                  <Progress
                    value={
                      (progressList.filter(
                        (p: { completed: boolean | null }) => p.completed,
                      ).length /
                        allLessons.length) *
                      100
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Course Modules */}
            <Card data-testid="course-modules">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  Course Content
                </h3>
                <div className="space-y-4">
                  {course.modules?.map(
                    (module: Module, moduleIndex: number) => (
                      <div key={module.id} className="space-y-2">
                        <h4 className="font-medium text-foreground text-sm">
                          Module {moduleIndex + 1}: {module.title}
                        </h4>
                        <div className="space-y-1">
                          {module.lessons?.map(
                            (lesson: Lesson, lessonIndex: number) => {
                              const lessonProgress = progressList.find(
                                (p: { lesson_id: string | null }) =>
                                  p.lesson_id === lesson.id,
                              );
                              const isCurrentLesson = lesson.id === lessonId;
                              const isCompleted =
                                lessonProgress?.completed || false;

                              return (
                                <Link
                                  key={lesson.id}
                                  href={`/learn/${courseId}/${lesson.id}`}
                                >
                                  <div
                                    className={`flex items-center space-x-3 p-2 rounded-lg text-sm transition-colors cursor-pointer ${
                                      isCurrentLesson
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted/50"
                                    }`}
                                    data-testid={`lesson-nav-${lesson.id}`}
                                  >
                                    <div className="flex-shrink-0">
                                      {isCompleted ? (
                                        <i className="fas fa-check-circle text-green-600"></i>
                                      ) : (
                                        <i
                                          className={`fas ${lesson.content_type === "video" ? "fa-play-circle" : "fa-file-text"} ${
                                            isCurrentLesson
                                              ? "text-primary-foreground"
                                              : "text-muted-foreground"
                                          }`}
                                        ></i>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div
                                        className={`font-medium truncate ${
                                          isCurrentLesson
                                            ? "text-primary-foreground"
                                            : "text-foreground"
                                        }`}
                                      >
                                        {lesson.title}
                                      </div>
                                      {lesson.duration_seconds && (
                                        <div
                                          className={`text-xs ${
                                            isCurrentLesson
                                              ? "text-primary-foreground/80"
                                              : "text-muted-foreground"
                                          }`}
                                        >
                                          {formatTime(lesson.duration_seconds)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                              );
                            },
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

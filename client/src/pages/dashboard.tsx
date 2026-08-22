import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";
import StudentLayout from "@/components/student-layout";
import { Link, useLocation } from "wouter";
import UpcomingSessionsCard from "@/components/live-sessions/upcoming-sessions-card";
import {
  BookOpen,
  Trophy,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  PlayCircle,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isToday, isTomorrow, format } from "date-fns";
import { CourseThumbnail } from "@/components/CourseThumbnail";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Sign in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/login"), 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<any[]>({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      const { data: progressEnrollments, error: progressError } = await supabase
        .from("enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (progressError) throw progressError;

      const uniqueEnrollments = (progressEnrollments || []).reduce(
        (acc: any[], enrollment) => {
          const existing = acc.find((e) => e.course_id === enrollment.course_id);
          if (!existing) {
            acc.push(enrollment);
          }
          return acc;
        },
        []
      );

      return uniqueEnrollments;
    },
    enabled: !!user,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [favoritesResult, completionRecordsResult, enrollmentsResult, progressResult] =
        await Promise.all([
          supabase.from("favorites").select("id").eq("user_id", user!.id),
          supabase
            .from("course_completion_records")
            .select("*, courses!inner(title, track, level)")
            .eq("user_id", user!.id)
            .order("completed_at", { ascending: false }),
          supabase
            .from("enrollments")
            .select("id, course_id, completed_at")
            .eq("user_id", user!.id)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false }),
          // Total study hours reflects actual accumulated watch time, not a
          // course's static advertised duration (which is often unset).
          supabase
            .from("progress")
            .select("watch_time_seconds")
            .eq("user_id", user!.id),
        ]);

      if (favoritesResult.error) throw favoritesResult.error;
      if (completionRecordsResult.error) throw completionRecordsResult.error;
      if (enrollmentsResult.error) throw enrollmentsResult.error;
      if (progressResult.error) throw progressResult.error;

      const totalWatchSeconds = (progressResult.data || []).reduce(
        (sum: number, p: any) => sum + (p.watch_time_seconds || 0),
        0,
      );

      const completedEnrollments = enrollmentsResult.data || [];
      const courseIds = completedEnrollments.map((e: any) => e.course_id);
      let enrichedEnrollments: any[] = [];
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title, track, level")
          .in("id", courseIds);
        const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));
        enrichedEnrollments = completedEnrollments.map((e: any) => ({
          ...e,
          course: courseMap.get(e.course_id),
          track: courseMap.get(e.course_id)?.track,
          level_achieved: courseMap.get(e.course_id)?.level,
        }));
      }

      const completionRecords = completionRecordsResult.data || [];
      const allCertificates = [...completionRecords, ...enrichedEnrollments];
      const uniqueCertificates = allCertificates.reduce((acc: any[], cert) => {
        const courseId = cert.course_id || (cert as any).course?.id;
        if (
          !acc.find((c) => (c.course_id || (c as any).course?.id) === courseId)
        ) {
          acc.push(cert);
        }
        return acc;
      }, []);

      return {
        favorites: favoritesResult.data || [],
        certificates: uniqueCertificates,
        totalStudyHours: totalWatchSeconds / 3600,
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const favorites = userStats?.favorites || [];
  const certificates = userStats?.certificates || [];
  const totalStudyHours = userStats?.totalStudyHours || 0;

  const enrolledCourseIds = enrollments.map((e: any) => e.course_id);

  const { data: upcomingAssignments = [] } = useQuery<any[]>({
    queryKey: ["upcoming-assignments", user?.id, enrolledCourseIds.join(",")],
    enabled: !!user && enrolledCourseIds.length > 0,
    queryFn: async () => {
      const { data: modules, error: modulesError } = await supabase
        .from("modules")
        .select("id, title, course_id")
        .in("course_id", enrolledCourseIds);
      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map((m: any) => m.id);
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, module_id")
        .in("module_id", moduleIds);
      if (lessonsError) throw lessonsError;
      if (!lessons || lessons.length === 0) return [];

      const lessonIds = lessons.map((l: any) => l.id);
      const { data: assignments, error: assignmentsError } = await supabase
        .from("assignments")
        .select("id, title, due_date, lesson_id")
        .in("lesson_id", lessonIds)
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(10);
      if (assignmentsError) throw assignmentsError;
      if (!assignments || assignments.length === 0) return [];

      const assignmentIds = assignments.map((a: any) => a.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from("assignment_submissions")
        .select("assignment_id")
        .eq("user_id", user!.id)
        .in("assignment_id", assignmentIds);
      if (submissionsError) throw submissionsError;

      const submittedIds = new Set(
        (submissions || []).map((s: any) => s.assignment_id)
      );

      const lessonMap = new Map(lessons.map((l: any) => [l.id, l]));
      const moduleMap = new Map(modules.map((m: any) => [m.id, m]));
      const courseMap = new Map(
        enrollments.map((e: any) => [e.course_id, e.course])
      );

      return assignments
        .filter((a: any) => !submittedIds.has(a.id))
        .map((a: any) => {
          const lesson = lessonMap.get(a.lesson_id);
          const module = lesson ? moduleMap.get(lesson.module_id) : undefined;
          const course = module ? courseMap.get(module.course_id) : undefined;
          return {
            id: a.id,
            title: a.title,
            dueDate: a.due_date,
            moduleTitle: module?.title,
            courseTitle: course?.title,
            courseId: module?.course_id,
          };
        })
        .slice(0, 4);
    },
    staleTime: 2 * 60 * 1000,
  });

  const getDueDateLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return "Due Today";
    if (isTomorrow(date)) return "Due Tomorrow";
    return `Due ${format(date, "MMM d")}`;
  };

  if (authLoading || enrollmentsLoading || statsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState message="Loading your dashboard..." size="lg" />
        </div>
      </StudentLayout>
    );
  }

  const completedCount = enrollments.filter(
    (e: any) => Number(e.progress) >= 100
  ).length;
  const inProgressEnrollments = enrollments.filter(
    (e: any) => Number(e.progress) > 0 && Number(e.progress) < 100
  );
  const nextCourse = inProgressEnrollments[0];

  // Get time of day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <StudentLayout>
      {/* Hero Section - Simplified */}
      <section className="mb-12">
        <div className="space-y-6">
          {/* Greeting */}
          <div>
            <h1 className="text-4xl font-bold text-[#2c2015] font-sf-pro-display mb-2">
              {greeting}, {user?.firstName}
            </h1>
            <p className="text-lg text-[#6b5d4f] font-sf-pro-text">
              {inProgressEnrollments.length > 0
                ? "You're making great progress on your learning journey"
                : "Ready to start your professional development journey?"}
            </p>
          </div>

          {/* Continue Learning Card */}
          {nextCourse && (
            <Card className="bg-gradient-to-br from-[#610000] to-[#8b0000] border-0 rounded-[24px] overflow-hidden shadow-[0_24px_64px_rgba(97,0,0,0.16)] hover:shadow-[0_32px_80px_rgba(97,0,0,0.24)] transition-all duration-700 hover:-translate-y-1">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full">
                      <PlayCircle className="w-4 h-4 text-[#8b6f47]" />
                      <span className="text-sm font-semibold text-white">
                        Continue where you left off
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 font-sf-pro-display">
                        {nextCourse.course?.title}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {nextCourse.course?.subtitle || "Keep up the momentum"}
                      </p>
                    </div>
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">Your progress</span>
                        <span className="text-white font-bold">
                          {Math.round(Number(nextCourse.progress) || 0)}%
                        </span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#8b6f47] to-[#c5a572] h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                          style={{
                            width: `${Number(nextCourse.progress) || 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Link href={`/learn/${nextCourse.course?.id}`}>
                      <Button
                        size="lg"
                        className="bg-white text-[#610000] hover:bg-white/90 shadow-xl px-8 py-6 text-base font-semibold rounded-[16px] transition-all duration-300 hover:scale-105"
                      >
                        Continue Learning
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: BookOpen,
                value: enrollments.length,
                label: "Courses Enrolled",
                color: "from-[#610000] to-[#8b0000]",
              },
              {
                icon: Trophy,
                value: completedCount,
                label: "Courses Completed",
                color: "from-[#8b6f47] to-[#c5a572]",
              },
              {
                icon: Award,
                value: certificates.length,
                label: "Certificates Earned",
                color: "from-[#610000] to-[#8b0000]",
              },
              {
                icon: Clock,
                value: totalStudyHours >= 10 || totalStudyHours === 0
                  ? Math.round(totalStudyHours)
                  : Math.round(totalStudyHours * 10) / 10,
                label: "Total Study Hours",
                color: "from-[#8b6f47] to-[#c5a572]",
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={idx}
                  className="bg-white border-2 border-[#d4c5b0]/20 rounded-[20px] hover:border-[#8b6f47]/30 hover:shadow-[0_16px_48px_rgba(97,0,0,0.08)] transition-all duration-500 hover:-translate-y-1"
                >
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-[12px] flex items-center justify-center bg-gradient-to-br",
                          stat.color
                        )}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-[#2c2015] font-sf-pro-display">
                          {stat.value}
                        </div>
                        <p className="text-sm text-[#6b5d4f] font-sf-pro-text mt-1">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Courses */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#2c2015] font-sf-pro-display">
                  My Courses
                </h2>
                <p className="text-sm text-[#6b5d4f] mt-1">
                  {enrollments.length} active courses
                </p>
              </div>
              <Link href="/courses">
                <Button
                  variant="outline"
                  className="border-[#d4c5b0] text-[#610000] hover:bg-[#f5f3ed] hover:border-[#8b6f47]"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {enrollments.length === 0 ? (
              <Card className="bg-white border-2 border-dashed border-[#d4c5b0]/50 rounded-[24px]">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#f5f3ed] flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-[#8b6f47]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#2c2015] mb-2">
                    No courses yet
                  </h3>
                  <p className="text-[#6b5d4f] mb-6 max-w-md mx-auto">
                    Start your professional development journey by enrolling in
                    your first course
                  </p>
                  <Link href="/course-catalog">
                    <Button className="bg-gradient-to-br from-[#610000] to-[#8b0000] text-white hover:shadow-[0_20px_48px_rgba(97,0,0,0.24)] transition-all duration-500 hover:scale-105 px-8 py-6 rounded-[16px] text-base font-semibold">
                      Explore Courses
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {enrollments.slice(0, 4).map((enrollment: any) => (
                  <Link
                    key={enrollment.id}
                    href={`/learn/${enrollment.course?.id}`}
                  >
                    <Card className="group bg-white border-2 border-[#d4c5b0]/20 rounded-[20px] overflow-hidden hover:border-[#8b6f47]/30 hover:shadow-[0_24px_64px_rgba(97,0,0,0.12)] hover:-translate-y-2 transition-all duration-700 cursor-pointer">
                      <div className="relative h-40 bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center">
                        {enrollment.course?.thumbnail_url ? (
                          <CourseThumbnail
                            src={enrollment.course.thumbnail_url}
                            alt={enrollment.course.title}
                            className="absolute inset-0 w-full h-full"
                            imgClassName="group-hover:scale-125 transition-transform duration-700"
                          />
                        ) : (
                          <BookOpen className="w-16 h-16 text-white/80" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#2c2015] mb-1 line-clamp-2 font-sf-pro-display">
                            {enrollment.course?.title}
                          </h3>
                          <p className="text-sm text-[#8b6f47]">
                            {enrollment.course?.level || "Associate"} Level
                          </p>
                        </div>
                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#6b5d4f]">Progress</span>
                            <span className="text-[#610000] font-bold">
                              {Math.round(Number(enrollment.progress) || 0)}%
                            </span>
                          </div>
                          <div className="w-full bg-[#e3beb8] rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-[#610000] to-[#8b6f47] h-2 rounded-full transition-all duration-1000"
                              style={{
                                width: `${Number(enrollment.progress) || 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-8">
          {/* Upcoming Live Sessions */}
          <UpcomingSessionsCard />
          
          {/* Upcoming Activities */}
          <section>
            <h2 className="text-xl font-bold text-[#2c2015] mb-4 font-sf-pro-display flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#8b6f47]" />
              Upcoming Activities
            </h2>
            <Card className="bg-white border-2 border-[#d4c5b0]/20 rounded-[20px]">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {upcomingAssignments.map((activity: any) => (
                    <Link
                      key={activity.id}
                      href={activity.courseId ? `/learn/${activity.courseId}` : "#"}
                    >
                      <div className="flex items-start gap-3 p-3 bg-[#faf9f6] rounded-[12px] hover:bg-[#f5f3ed] transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center flex-shrink-0">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#2c2015]">
                            {activity.title}
                          </p>
                          <p className="text-xs text-[#6b5d4f] mt-1 truncate">
                            {[activity.moduleTitle, activity.courseTitle]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <p className="text-xs text-[#8b6f47] font-semibold mt-1">
                            {getDueDateLabel(activity.dueDate)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {upcomingAssignments.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#6b5d4f]">
                        No upcoming activities
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Recent Activity */}
          <section>
            <h2 className="text-xl font-bold text-[#2c2015] mb-4 font-sf-pro-display flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#8b6f47]" />
              Recent Activity
            </h2>
            <Card className="bg-white border-2 border-[#d4c5b0]/20 rounded-[20px]">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {certificates.slice(0, 3).map((cert: any) => (
                    <div
                      key={cert.id}
                      className="flex items-center gap-3 pb-4 border-b border-[#d4c5b0]/30 last:border-0 last:pb-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#610000] to-[#8b0000] flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2c2015] truncate">
                          Certificate Earned
                        </p>
                        <p className="text-xs text-[#6b5d4f] truncate">
                          {cert.courses?.title || cert.course?.title}
                        </p>
                      </div>
                    </div>
                  ))}
                  {certificates.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-[#6b5d4f]">
                        No recent activity
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </StudentLayout>
  );
}

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";
import StudentLayout from "@/components/student-layout";
import { Link, useLocation } from "wouter";
import {
  PlayCircle,
  ArrowRight,
  Calendar,
  Users,
  Heart,
  ChevronRight,
} from "lucide-react";

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
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;

      const uniqueEnrollments = (data || []).reduce(
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

  const { data: certificates = [] } = useQuery({
    queryKey: ["user-certificates", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_completion_records")
        .select("*, courses!inner(title, track, level)")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recommended courses from database
  const { data: recommendedCourses = [] } = useQuery({
    queryKey: ["recommended-courses"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          subtitle,
          price,
          thumbnail_url,
          level,
          avg_rating,
          is_published,
          is_featured,
          instructor:users!instructor_id(first_name, last_name)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: upcomingEvents = [] } = useQuery<any[]>({
    queryKey: ["upcoming-events"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("live_sessions")
        .select("*")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  if (authLoading || enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState message="Loading your dashboard..." size="lg" />
        </div>
      </StudentLayout>
    );
  }

  const inProgressEnrollments = enrollments.filter(
    (e: any) => Number(e.progress) > 0 && Number(e.progress) < 100
  );
  const completedCourses = enrollments.filter(
    (e: any) => Number(e.progress) >= 100
  );

  // Calculate overall progress
  const overallProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + Number(e.progress || 0), 0) / enrollments.length)
    : 0;

  // Get primary learning path (most progressed course)
  const primaryLearningPath = inProgressEnrollments.length > 0
    ? inProgressEnrollments.reduce((max, e) => 
        Number(e.progress) > Number(max.progress) ? e : max
      , inProgressEnrollments[0])
    : null;

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-[#f8f7f5] via-[#faf9f6] to-[#f5f3ed] rounded-[32px] overflow-hidden border border-[#d4c5b0]/20">
          <div className="grid lg:grid-cols-2 gap-8 p-8 lg:p-12">
            {/* Left Content */}
            <div className="flex flex-col justify-center space-y-6 relative z-10">
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#8b6f47] uppercase tracking-wider font-body">
                  WELCOME BACK, {user?.firstName?.toUpperCase() || "DR. DICKSON"}
                </p>
                <h1 className="text-4xl lg:text-5xl font-bold text-[#2c2015] leading-tight font-display">
                  Master dispute resolution.
                  <br />
                  <span className="text-[#610000]">Anywhere, anytime.</span>
                </h1>
                <p className="text-lg text-[#6b5d4f] leading-relaxed font-body">
                  World-class, self-paced learning in Arbitration, Mediation,
                  Litigation, Negotiation, Adjudication and more.
                </p>
              </div>

              <div className="flex gap-4">
                <Link href="/courses">
                  <Button className="bg-[#610000] text-white hover:bg-[#7d0000] px-6 py-6 text-base rounded-xl shadow-md font-semibold font-body">
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Continue learning
                  </Button>
                </Link>
                <Link href="/course-catalog">
                  <Button
                    variant="outline"
                    className="border-2 border-[#610000] text-[#610000] hover:bg-[#610000] hover:text-white px-6 py-6 text-base rounded-xl font-semibold font-body"
                  >
                    Explore courses
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Content - Learning Path Cards */}
            <div className="flex flex-col justify-center space-y-4 relative z-10">
              {/* Card 1 - Learning Path */}
              {primaryLearningPath ? (
                <Card className="bg-white border-[#d4c5b0]/30 hover:shadow-lg transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#8b6f47]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#8b6f47] font-medium uppercase tracking-wide mb-1">
                        Your Learning Path
                      </p>
                      <h3 className="text-base font-bold text-[#2c2015] line-clamp-1">
                        {primaryLearningPath.course?.title || "No active course"}
                      </h3>
                      <div className="mt-2">
                        <Progress value={Number(primaryLearningPath.progress) || 0} className="h-2" />
                        <p className="text-xs text-[#6b5d4f] mt-1">
                          {Math.round(Number(primaryLearningPath.progress) || 0)}% Complete
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white border-[#d4c5b0]/30">
                  <CardContent className="p-5 text-center">
                    <p className="text-[#6b5d4f] mb-3">Start your learning journey today!</p>
                    <Link href="/course-catalog">
                      <Button className="bg-[#610000] text-white hover:bg-[#7d0000]" size="sm">
                        Explore Courses
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Card 2 - Certificate Progress */}
              {inProgressEnrollments.length > 0 && (
                <Card className="bg-white border-[#d4c5b0]/30 hover:shadow-lg transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#8b6f47]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">🎓</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#8b6f47] font-medium uppercase tracking-wide mb-1">
                        Certificate Progress
                      </p>
                      <h3 className="text-base font-bold text-[#2c2015] line-clamp-1">
                        {inProgressEnrollments[0].course?.title || "Course"}
                      </h3>
                      <div className="mt-2">
                        <Progress value={Number(inProgressEnrollments[0].progress) || 0} className="h-2" />
                        <p className="text-xs text-[#6b5d4f] mt-1">
                          {Math.round(Number(inProgressEnrollments[0].progress) || 0)}% Complete
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Event Card - if available */}
              {upcomingEvents.length > 0 && (
                <Card className="bg-[#610000] text-white border-0 hover:shadow-lg transition-all">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-white/70 font-medium uppercase tracking-wide mb-1">
                        Upcoming Live Session
                      </p>
                      <h3 className="text-base font-bold line-clamp-1">
                        {(upcomingEvents[0] as any).title}
                      </h3>
                      <p className="text-xs text-white/80 mt-1">
                        {new Date((upcomingEvents[0] as any).scheduled_at).toLocaleDateString('en-US', { 
                          day: 'numeric', 
                          month: 'short' 
                        })} · {new Date((upcomingEvents[0] as any).scheduled_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Decorative Background Image - Clear and Visible */}
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-40 pointer-events-none hidden lg:block overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=90"
              alt=""
              className="w-full h-full object-cover"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#faf9f6]/10 to-[#faf9f6]" />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Continue Learning */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#2c2015] font-display">Continue learning</h2>
              <Link href="/courses">
                <Button variant="link" className="text-[#610000]">
                  View all <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>

            {inProgressEnrollments.length === 0 ? (
              <Card className="border-2 border-dashed border-[#d4c5b0]/50">
                <CardContent className="py-16 text-center">
                  <p className="text-[#6b5d4f] mb-4">No courses in progress</p>
                  <Link href="/course-catalog">
                    <Button className="bg-[#610000] text-white hover:bg-[#7d0000]">
                      Explore Courses
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {inProgressEnrollments.map((enrollment: any) => (
                  <Card
                    key={enrollment.id}
                    className="bg-white border-[#d4c5b0]/30 hover:shadow-xl transition-all overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row gap-0">
                      {/* Course Image */}
                      <div className="relative w-full sm:w-80 h-56 bg-gradient-to-br from-[#610000] to-[#8b0000] flex-shrink-0">
                        {enrollment.course?.thumbnail_url ? (
                          <img
                            src={enrollment.course.thumbnail_url}
                            alt={enrollment.course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#610000] to-[#8b0000]">
                            <PlayCircle className="w-16 h-16 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
                            <PlayCircle className="w-12 h-12 text-[#610000] fill-[#610000]" />
                          </div>
                        </div>
                      </div>

                      {/* Course Info */}
                      <CardContent className="flex-1 p-6 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div>
                            <Badge className="bg-[#610000]/10 text-[#610000] hover:bg-[#610000]/20 mb-3 font-semibold uppercase text-xs">
                              IN PROGRESS
                            </Badge>
                            <h3 className="text-2xl font-bold text-[#2c2015] mb-2 leading-tight">
                              {enrollment.course?.title}
                            </h3>
                            <p className="text-sm text-[#6b5d4f]">
                              {enrollment.course?.lessons?.length 
                                ? `Lesson ${enrollment.last_lesson_id || 1} of ${enrollment.course.lessons.length}`
                                : "Course"} · {enrollment.course?.track || "Arbitration Procedure"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Progress value={Number(enrollment.progress) || 0} className="h-2.5" />
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[#6b5d4f] font-medium">
                                {Math.round(Number(enrollment.progress) || 0)}% complete
                              </span>
                            </div>
                          </div>

                          <Link href={`/learn/${enrollment.course?.id}`}>
                            <Button
                              className="text-[#610000] hover:text-[#7d0000] p-0 h-auto font-bold text-base group"
                              variant="link"
                            >
                              Go to course 
                              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Progress Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardContent className="p-6 text-center">
                  <div className="relative inline-flex items-center justify-center mb-3">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#e3d5ca"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#610000"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40 * (overallProgress / 100)} ${
                          2 * Math.PI * 40
                        }`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-[#610000]">{overallProgress}%</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#2c2015]">Overall progress</p>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#d4c5b0]/30">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">In progress</span>
                    <span className="text-2xl font-bold text-[#2c2015]">
                      {inProgressEnrollments.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">Completed</span>
                    <span className="text-2xl font-bold text-[#2c2015]">
                      {completedCourses.length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Sidebar - Your Progress & Upcoming */}
          <section className="space-y-6">
            {/* Your Progress */}
            <div>
              <h3 className="text-lg font-bold text-[#2c2015] mb-4 font-display">Your progress</h3>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#e3d5ca"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="#610000"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56 * (overallProgress / 100)} ${
                            2 * Math.PI * 56
                          }`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-4xl font-bold text-[#610000]">{overallProgress}%</span>
                        <span className="text-xs text-[#6b5d4f]">Overall progress</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 text-center border-t border-[#d4c5b0]/30 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6b5d4f]">In progress</span>
                      <span className="text-lg font-bold text-[#2c2015]">
                        {inProgressEnrollments.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#6b5d4f]">Completed</span>
                      <span className="text-lg font-bold text-[#2c2015]">
                        {completedCourses.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </section>
        </div>

        {/* Recommended Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#2c2015] font-display">Recommended for you</h2>
            <Link href="/course-catalog">
              <Button variant="link" className="text-[#610000]">
                View all <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {recommendedCourses.length === 0 ? (
            <Card className="border-[#d4c5b0]/30">
              <CardContent className="py-12 text-center">
                <p className="text-[#6b5d4f] mb-4">No courses available at the moment</p>
                <Link href="/course-catalog">
                  <Button className="bg-[#610000] text-white hover:bg-[#7d0000]">
                    Browse Courses
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedCourses.map((course: any, idx: number) => (
                <Link key={course.id} href={`/course/${course.id}`}>
                  <Card className="group bg-white border-[#d4c5b0]/30 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden cursor-pointer">
                    <div className="relative h-40 bg-gradient-to-br from-[#f5f3ed] to-[#e3d5ca]">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PlayCircle className="w-16 h-16 text-[#610000]/20" />
                        </div>
                      )}
                      {course.is_featured && (
                        <Badge className="absolute top-3 left-3 bg-[#610000] text-white text-xs">
                          FEATURED
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 bg-white/80 hover:bg-white text-[#610000] rounded-full"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-[#2c2015] mb-2 line-clamp-2 text-sm">
                        {course.title}
                      </h3>
                      <p className="text-xs text-[#6b5d4f] mb-3">
                        {course.instructor 
                          ? `${course.instructor.first_name} ${course.instructor.last_name}` 
                          : "CIMA Instructor"}
                      </p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          <span className="text-sm font-bold text-[#2c2015]">
                            {course.avg_rating ? Number(course.avg_rating).toFixed(1) : "New"}
                          </span>
                          {course.avg_rating && (
                            <span className="text-yellow-500 ml-1">★★★★★</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#6b5d4f]">
                        <span>{course.level || "All levels"}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#610000]">
                          ${Number(course.price).toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </StudentLayout>
  );
}

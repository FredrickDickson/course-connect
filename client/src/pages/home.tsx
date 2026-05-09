import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CourseCardStatus, { getCourseStatus, type CourseStatus } from "@/components/course-card-status";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import {
  ArrowRight,
  BookOpen,
  Clock,
  TrendingUp,
  GraduationCap,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const { user } = useAuth();

  const { data: featuredCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["featured-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "*, category:categories(*), instructor:users!courses_instructor_id_fkey(first_name, last_name)",
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["my-enrollments"],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select(
          "*, course:courses(*, instructor:users!courses_instructor_id_fkey(first_name, last_name), modules:modules!modules_course_id_fkey(*, lessons:lessons!lessons_module_id_fkey(*)))",
        )
        .eq("user_id", user.id)
        .order("enrolled_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate progress overview from existing enrollments
  const progressOverview = user
    ? {
        totalCourses: enrollments.length,
        completedCourses: enrollments.filter((e) => Number(e.progress) >= 100)
          .length,
        totalHours: enrollments.reduce(
          (sum, e) => sum + (e.course?.duration_hours || 0),
          0,
        ),
        averageProgress:
          enrollments.length > 0
            ? enrollments.reduce((sum, e) => sum + Number(e.progress), 0) /
              enrollments.length
            : 0,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section — Executive Portal */}
      <section className="relative flex flex-col md:flex-row items-stretch">
        {/* Left: Burgundy welcome panel */}
        <div className="w-full md:w-3/5 bg-[#8b0000] text-white p-12 md:p-16 lg:p-20 flex flex-col justify-center relative overflow-hidden min-h-[480px]">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000] to-[#410000] opacity-50" />
          <div className="relative z-10 max-w-2xl">
            <span className="font-['Work_Sans'] text-white/60 uppercase tracking-[0.2em] text-xs mb-4 block">
              Executive Portal
            </span>
            <h1 className="font-['Noto_Serif'] text-5xl md:text-6xl lg:text-7xl mb-8 leading-tight">
              Welcome back,
              <br />
              <span className="italic font-light">
                {user?.firstName || "Learner"}!
              </span>
            </h1>
            <p className="font-['Inter'] text-lg text-white/80 max-w-lg mb-12 leading-relaxed">
              Your professional evolution continues. We have curated advanced
              modules based on your recent inquiries.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/dashboard">
                <button className="bg-white text-[#610000] px-8 md:px-10 py-4 rounded-sm font-['Work_Sans'] font-medium text-sm tracking-widest hover:bg-[#f5f4e8] transition-colors duration-300 shadow-xl inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  CONTINUE LEARNING
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/courses">
                <button className="border border-white/20 text-white px-8 py-4 rounded-sm font-['Work_Sans'] font-medium text-sm tracking-widest hover:bg-white/10 transition-all duration-300 inline-flex items-center gap-2">
                  EXPLORE COURSES
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right: Grayscale image panel */}
        <div className="hidden md:block w-2/5 bg-[#efeee3] relative">
          <img
            alt="Law office interior"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvjP6NGCAEqFA8hfcEqDuplUFPMzLiCCajVnjul4WfXuyDEfpzEnWQUlRp-jyL80Lm2H5d5UQmstianRK8Ego5aWU-NO5sZWgpZLKGr9ak_38JWzTbYfhD2k1pcZwYl-5_DVdmJtqcWeuVEdnfWmQ2rFBMDgIZlSuFqTqlBB1to-PHrSAUavHYCrzgyok-ekarLdN-geMicwmxSivXDUe67UJph-tsBmNRcjxm8svz8bxhiNDGJ4XxumtnKzQijK8MdBw0lUzVu40"
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-40 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-[#efeee3]/20 to-[#8b0000]/10" />
        </div>

      </section>

      {/* Stats row — sibling to hero, sits cleanly below */}
      {progressOverview && (
        <section className="bg-[#fbfaee] px-6 md:px-8 lg:px-12 py-6 md:py-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div
              className="bg-white p-6 md:p-8 shadow-[0px_20px_40px_rgba(27,28,21,0.06)] border-b-2 border-[#610000]"
              data-testid="stat-enrolled-courses"
            >
              <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-[#610000] mb-3 md:mb-4" />
              <div className="font-['Noto_Serif'] text-2xl md:text-3xl text-[#1b1c15]">
                {progressOverview.totalCourses || 0}
              </div>
              <div className="font-['Work_Sans'] text-[#5a403c] text-[10px] md:text-xs uppercase tracking-widest mt-1">
                Enrolled
              </div>
            </div>
            <div
              className="bg-white p-6 md:p-8 shadow-[0px_20px_40px_rgba(27,28,21,0.06)] border-b-2 border-[#e3beb8]"
              data-testid="stat-completed-courses"
            >
              <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-[#610000] mb-3 md:mb-4" />
              <div className="font-['Noto_Serif'] text-2xl md:text-3xl text-[#1b1c15]">
                {progressOverview.completedCourses || 0}
              </div>
              <div className="font-['Work_Sans'] text-[#5a403c] text-[10px] md:text-xs uppercase tracking-widest mt-1">
                Completed
              </div>
            </div>
            <div
              className="bg-white p-6 md:p-8 shadow-[0px_20px_40px_rgba(27,28,21,0.06)] border-b-2 border-[#e3beb8]"
              data-testid="stat-study-hours"
            >
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-[#610000] mb-3 md:mb-4" />
              <div className="font-['Noto_Serif'] text-2xl md:text-3xl text-[#1b1c15]">
                {progressOverview.totalHours || 0}
              </div>
              <div className="font-['Work_Sans'] text-[#5a403c] text-[10px] md:text-xs uppercase tracking-widest mt-1">
                Study Hours
              </div>
            </div>
            <div className="bg-white p-6 md:p-8 shadow-[0px_20px_40px_rgba(27,28,21,0.06)] border-b-2 border-[#745b22]">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-[#745b22] mb-3 md:mb-4" />
              <div className="font-['Noto_Serif'] text-2xl md:text-3xl text-[#1b1c15]">
                {Math.round(progressOverview?.averageProgress || 0)}%
              </div>
              <div className="font-['Work_Sans'] text-[#5a403c] text-[10px] md:text-xs uppercase tracking-widest mt-1">
                Overall Progress
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Continue Learning */}
      {!enrollmentsLoading && enrollments.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                Continue Learning
              </h2>
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-view-all-courses">
                  View All Courses
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.slice(0, 3).map((enrollment: any) => (
                <Card
                  key={enrollment.id}
                  className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden border-primary/5 hover:border-primary/20 bg-card"
                  data-testid={`card-enrollment-${enrollment.course.id}`}
                >
                  <CardContent className="p-0">
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={
                          enrollment.course.thumbnail_url ||
                          `https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250`
                        }
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="font-bold text-white mb-0.5 line-clamp-1">
                          {enrollment.course.title}
                        </h3>
                        <p className="text-xs text-white/80">
                          {enrollment.course.instructor?.first_name}{" "}
                          {enrollment.course.instructor?.last_name}
                        </p>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span className="text-primary">
                            {enrollment.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        data-testid={`button-continue-${enrollment.course.id}`}
                        className="w-full bg-primary hover:bg-primary/95 group/btn transition-all duration-300"
                        onClick={() => {
                          // Find the first incomplete lesson
                          const modules = enrollment.course.modules || [];
                          let targetLessonId = null;
                          for (const module of modules) {
                            const lessons = module.lessons || [];
                            for (const lesson of lessons) {
                              // If we haven't found a lesson yet, use the first one
                              if (!targetLessonId) {
                                targetLessonId = lesson.id;
                              }
                              // Break when we find an incomplete lesson
                              // For now, just use the first lesson of the first module
                              break;
                            }
                            if (targetLessonId) break;
                          }
                          // Fallback to lesson 1 if no lessons found
                          const lessonId = targetLessonId || "1";
                          window.location.href = `/learn/${enrollment.course.id}/${lessonId}`;
                        }}
                      >
                        Continue Learning
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Courses */}
      <section className="py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                Featured Programs
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl">
                Accelerate your career with our most popular,
                industry-recognized certification tracks.
              </p>
            </div>
            <Link href="/courses">
              <Button
                variant="outline"
                className="border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300"
                data-testid="button-browse-courses"
              >
                Browse All Courses
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {coursesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card
                  key={i}
                  className="animate-pulse"
                  data-testid={`skeleton-course-${i}`}
                >
                  <div className="w-full h-48 bg-muted"></div>
                  <CardContent className="p-6 space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-10 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredCourses.map((course) => {
                const userLevel = (user?.assignedLevel || user?.currentLevel || "NONE").toUpperCase() as "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
                const status: CourseStatus = getCourseStatus(course.level || "ASSOCIATE", userLevel);
                return (
                  <CourseCardStatus 
                    key={course.id} 
                    course={course as any} 
                    userLevel={userLevel}
                    status={status}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action — Academic Ledger vibe */}
      <section className="relative py-24 md:py-32 bg-[#8b0000] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000] to-[#410000] opacity-50" />

        <div className="relative max-w-4xl mx-auto px-6 md:px-8 lg:px-12 text-center">
          <h2 className="font-['Noto_Serif'] text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6">
            Ready to Advance
            <br />
            <span className="italic font-light">Your Professional Career?</span>
          </h2>
          <p className="font-['Inter'] text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-12">
            Join 80,000+ professionals who have elevated their careers with
            CIMA's internationally recognized ADR programs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/course-catalog">
              <button
                data-testid="button-explore-programs"
                className="w-full sm:w-auto bg-white text-[#610000] px-8 md:px-10 py-4 rounded-sm font-['Work_Sans'] font-medium text-sm tracking-widest hover:bg-[#f5f4e8] transition-colors duration-300 shadow-xl inline-flex items-center justify-center gap-2"
              >
                EXPLORE PROGRAMS
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            {/* Join community button commented out */}
            {/* <Link href="/community">
              <button
                data-testid="button-join-community"
                className="w-full sm:w-auto border border-white/20 text-white px-8 py-4 rounded-sm font-['Work_Sans'] font-medium text-sm tracking-widest hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center"
              >
                JOIN COMMUNITY
              </button>
            </Link> */}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

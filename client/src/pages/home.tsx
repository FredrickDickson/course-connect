// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Clock, Trophy, Users, Star, TrendingUp, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Home() {
  const { user } = useAuth();

  const { data: featuredCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, category:categories(*), instructor:users!courses_instructor_id_fkey(first_name, last_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['my-enrollments'],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*, instructor:users!courses_instructor_id_fkey(first_name, last_name))')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  // Calculate progress overview from existing enrollments
  const progressOverview = user ? {
    totalCourses: enrollments.length,
    completedCourses: enrollments.filter(e => Number(e.progress) >= 100).length,
    totalHours: enrollments.reduce((sum, e) => sum + (e.course?.duration_hours || 0), 0),
    averageProgress: enrollments.length > 0 
      ? enrollments.reduce((sum, e) => sum + Number(e.progress), 0) / enrollments.length 
      : 0
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary via-primary/95 to-slate-900 text-primary-foreground min-h-[70vh] flex items-center">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8 animate-in fade-in duration-1000">
            <div className="space-y-4">
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-md text-sm px-5 py-2.5 shadow-xl shadow-white/5 group hover:bg-white/20 transition-all duration-300">
                <Award className="w-4 h-4 mr-2 text-yellow-300 group-hover:scale-110 transition-transform" />
                Professional ADR Certification
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tightest leading-[1.1] drop-shadow-2xl">
                Welcome back,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-500 font-black animate-pulse-subtle">
                  {user?.firstName || 'Learner'}
                </span>!
              </h1>
              <p className="text-xl lg:text-2xl text-primary-foreground/80 max-w-3xl mx-auto font-medium leading-relaxed tracking-wide">
                Master the art of <span className="text-white font-semibold">Alternative Dispute Resolution</span> with CIMA's premium certification programs.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 transform hover:scale-105 transition-all duration-200">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Continue Learning
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/20 hover:scale-105 transition-all duration-200 shadow-sm">
                  {/* <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur"></Button> */}
                  Explore Courses
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          {progressOverview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16 animate-in slide-in-from-bottom-10 duration-700 delay-300">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-white/5 group" data-testid="stat-enrolled-courses">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-4xl font-black text-yellow-300 mb-1">
                    {progressOverview.totalCourses || '0'}
                  </div>
                  <div className="text-primary-foreground/60 text-xs uppercase tracking-widest font-bold">Enrolled</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-white/5 group" data-testid="stat-completed-courses">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Trophy className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-4xl font-black text-yellow-300 mb-1">
                    {progressOverview.completedCourses || '0'}
                  </div>
                  <div className="text-primary-foreground/60 text-xs uppercase tracking-widest font-bold">Completed</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-white/5 group" data-testid="stat-study-hours">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-4xl font-black text-yellow-300 mb-1">
                    {progressOverview.totalHours || '0'}
                  </div>
                  <div className="text-primary-foreground/60 text-xs uppercase tracking-widest font-bold">Study Hours</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 backdrop-blur-md border-white/10 hover:bg-white/10 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-white/5 group">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-4xl font-black text-yellow-300 mb-1">
                    {Math.round(progressOverview?.averageProgress || 0)}%
                  </div>
                  <div className="text-primary-foreground/60 text-xs uppercase tracking-widest font-bold">Avg. Progress</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Continue Learning */}
      {!enrollmentsLoading && enrollments.length > 0 && (
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-foreground">Continue Learning</h2>
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-view-all-courses">
                  View All Courses
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.slice(0, 3).map((enrollment) => (
                <Card key={enrollment.id} className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden border-primary/5 hover:border-primary/20 bg-card" data-testid={`card-enrollment-${enrollment.course.id}`}>
                  <CardContent className="p-0">
                    <div className="relative h-32 overflow-hidden">
                      <img
                        src={enrollment.course.thumbnail_url || `https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250`}
                        alt={enrollment.course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="font-bold text-white mb-0.5 line-clamp-1">{enrollment.course.title}</h3>
                        <p className="text-xs text-white/80">
                          {enrollment.course.instructor?.first_name} {enrollment.course.instructor?.last_name}
                        </p>
                      </div>
                    </div>

                    <div className="p-6">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span className="text-primary">{enrollment.progress}%</span>
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
                        onClick={() => window.location.href = `/learn/${enrollment.course.id}/1`}
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
              <h2 className="text-3xl lg:text-4xl font-black text-foreground tracking-tight">Featured Programs</h2>
              <p className="text-lg text-muted-foreground max-w-xl">Accelerate your career with our most popular, industry-recognized certification tracks.</p>
            </div>
            <Link href="/courses">
              <Button variant="outline" className="border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all duration-300" data-testid="button-browse-courses">
                Browse All Courses
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {coursesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse" data-testid={`skeleton-course-${i}`}>
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
              {featuredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-primary to-slate-900" />
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight lead-tight">
              Ready to Advance <br /><span className="text-yellow-400">Your Professional Career?</span>
            </h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Join 80,000+ professionals who have elevated their careers with CIMA's internationally recognized ADR programs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/programs">
              <Button
                data-testid="button-explore-programs"
                size="lg"
                className="w-full sm:w-auto bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:scale-105 transition-all duration-300 font-bold px-8"
              >
                Explore Programs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/community">
              <Button
                data-testid="button-join-community"
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 hover:scale-105 transition-all duration-300 px-8"
              >
                Join Community
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MembershipDashboard from "@/components/membership-dashboard";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Clock, Trophy, Heart, Play, Star, Award, Brain,
  GraduationCap, Download, FileText, ClipboardCheck, FileDown
} from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/login"), 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  // Fetch enrollments and calculate progress locally
  const { data: enrollmentsData = [], isLoading: enrollmentsLoading } = useQuery<any[]>({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*)')
        .eq('user_id', user!.id)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const enrollments = enrollmentsData;
  const progressOverview = {
    totalCourses: enrollments.length,
    completedCourses: enrollments.filter(e => Number(e.progress) >= 100).length,
    totalHours: enrollments.reduce((sum, e) => sum + (e.course?.duration_hours || 0), 0)
  };

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, course:courses(id, title, thumbnail_url)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', user?.id],
    queryFn: async () => {
      // [/] Refactor server/storage.ts to use Supabase Service Role client
      // [/] Initialize supabaseAdmin client with service_role_key
      // [/] Migrate User operations (getUser, upsertUser, updateUser)
      const { data, error } = await supabase
        .from("certifications")
        .select("*, course:courses(id, title)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  const completedCount = progressOverview?.completedCourses || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            <div className="text-center lg:text-left space-y-4">
              <h1 className="text-3xl lg:text-4xl font-bold">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-xl text-primary-foreground/90">
                Continue your journey to mastering Alternative Dispute Resolution
              </p>
            </div>
            <Link href="/course-catalog">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <BookOpen className="w-5 h-5 mr-2" />
                Browse Courses
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4 text-center">
                <BookOpen className="w-6 h-6 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{enrollments.length}</div>
                <div className="text-xs text-primary-foreground/80">Enrolled</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{completedCount}</div>
                <div className="text-xs text-primary-foreground/80">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4 text-center">
                <Heart className="w-6 h-6 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{favorites.length}</div>
                <div className="text-xs text-primary-foreground/80">Favorites</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-4 text-center">
                <Award className="w-6 h-6 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{certificates.length}</div>
                <div className="text-xs text-primary-foreground/80">Certificates</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">My Courses</h2>
                  <Link href="/course-catalog">
                    <Button variant="outline">Browse Courses</Button>
                  </Link>
                </div>

                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                          <div className="h-2 bg-muted rounded mb-2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : enrollments.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">No courses yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start your ADR journey by enrolling in your first course.
                      </p>
                      <Link href="/course-catalog">
                        <Button>Explore Courses</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map((enrollment: any) => (
                      <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <img
                                src={enrollment.course?.thumbnail_url || "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=250&fit=crop"}
                                alt={enrollment.course?.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {enrollment.course?.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {enrollment.course?.subtitle || ""}
                                </p>
                              </div>
                            </div>
                            <Badge variant={Number(enrollment.progress) === 100 ? 'default' : 'secondary'}>
                              {Number(enrollment.progress || 0).toFixed(0)}% Complete
                            </Badge>
                          </div>

                          <div className="mb-4">
                            <Progress value={Number(enrollment.progress || 0)} className="h-2" />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Enrolled on {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </div>
                            <Link href={`/course/${enrollment.course?.id}`}>
                              <Button size="sm">
                                {Number(enrollment.progress) === 100 ? 'Review' : 'Continue'}
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* CIMA Membership */}
              <MembershipDashboard />

              {/* Learning Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Learning Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Enrolled Courses</span>
                    <span className="font-semibold text-foreground">{enrollments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed Courses</span>
                    <span className="font-semibold text-foreground">{completedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Certificates Earned</span>
                    <span className="font-semibold text-foreground">{certificates.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certificates.length === 0 ? (
                    <div className="text-center py-6">
                      <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No certificates yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Complete courses to earn certificates</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((cert: any) => (
                        <div key={cert.id} className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <GraduationCap className="w-5 h-5 text-accent" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">
                              {cert.course?.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Earned {new Date(cert.issued_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Community */}
              <Card>
                <CardHeader>
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/community">
                    <Button variant="outline" className="w-full" size="sm">
                      Join Discussions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

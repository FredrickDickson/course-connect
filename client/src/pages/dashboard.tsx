import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import MembershipCard from "@/components/dashboard/membership-card";
import ProgressionBanner from "@/components/dashboard/progression-banner";
import EnrolledCoursesGrid from "@/components/dashboard/enrolled-courses-grid";
import RecommendedCourses from "@/components/dashboard/recommended-courses";
import { Link, useLocation } from "wouter";
import { BookOpen, Trophy, Heart, Award, GraduationCap } from "lucide-react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Unauthorized", description: "Sign in to access your dashboard.", variant: "destructive" });
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
      return data || [];
    },
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("id").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const completedCount = enrollments.filter((e: any) => Number(e.progress) >= 100).length;
  const enrolledCourseIds = enrollments.map((e: any) => e.course?.id).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
              <p className="text-primary-foreground/80 mt-1">Continue your ADR journey</p>
            </div>
            <Link href="/course-catalog">
              <Button size="sm" className="bg-white text-primary hover:bg-white/90">
                <BookOpen className="w-4 h-4 mr-2" /> Browse Courses
              </Button>
            </Link>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            {[
              { icon: BookOpen, value: enrollments.length, label: "Enrolled" },
              { icon: Trophy, value: completedCount, label: "Completed" },
              { icon: Heart, value: favorites.length, label: "Saved" },
              { icon: Award, value: certificates.length, label: "Certs" },
            ].map(({ icon: Icon, value, label }) => (
              <Card key={label} className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-3 text-center">
                  <Icon className="w-5 h-5 text-white mx-auto mb-1" />
                  <div className="text-xl font-bold text-yellow-300">{value}</div>
                  <div className="text-[10px] text-primary-foreground/70">{label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left col */}
            <div className="lg:col-span-2 space-y-6">
              <ProgressionBanner />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">My Courses</h2>
                  <Link href="/course-catalog">
                    <Button variant="ghost" size="sm">See all</Button>
                  </Link>
                </div>
                <EnrolledCoursesGrid enrollments={enrollments} isLoading={enrollmentsLoading} />
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">
              <MembershipCard />
              <RecommendedCourses enrolledCourseIds={enrolledCourseIds} />

              {/* Certificates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="w-4 h-4" /> Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certificates.length === 0 ? (
                    <div className="text-center py-4">
                      <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Complete courses to earn certificates</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {certificates.map((cert: any) => (
                        <div key={cert.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
                          <GraduationCap className="w-4 h-4 text-accent flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{cert.course?.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(cert.issued_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

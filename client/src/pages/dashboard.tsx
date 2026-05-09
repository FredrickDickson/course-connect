import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LevelUpgradeCelebration from "@/components/dashboard/level-upgrade-celebration";
import EnrolledCoursesGrid from "@/components/dashboard/enrolled-courses-grid";
import RecommendedCourses from "@/components/dashboard/recommended-courses";
import { TrackCard } from "@/components/dashboard/track-card";
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
      // Source of truth: the unified `enrollments` table.
      const { data: progressEnrollments, error: progressError } = await supabase
        .from("enrollments")
        .select("*, course:courses(*)")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (progressError) throw progressError;

      // Deduplicate by course_id (defensive; should already be unique)
      const uniqueEnrollments = (progressEnrollments || []).reduce((acc: any[], enrollment) => {
        const existing = acc.find(e => e.course_id === enrollment.course_id);
        if (!existing) {
          acc.push(enrollment);
        }
        return acc;
      }, []);

      return uniqueEnrollments;
    },
    enabled: !!user,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Combine multiple dashboard queries in parallel
      const [favoritesResult, certificatesResult, qualificationResult] = await Promise.all([
        supabase.from("favorites").select("id").eq("user_id", user!.id),
        supabase
          .from("certificates")
          .select("*, course_completion_records!inner(course_id, courses(title))")
          .eq("user_id", user!.id)
          .eq("is_revoked", false),
        (async () => {
          const token = (await supabase.auth.getSession()).data.session?.access_token;
          const response = await fetch("/api/qualifications/get-user-state", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) throw new Error("Failed to fetch qualification state");
          return response.json();
        })()
      ]);

      if (favoritesResult.error) throw favoritesResult.error;
      if (certificatesResult.error) throw certificatesResult.error;

      return {
        favorites: favoritesResult.data || [],
        certificates: certificatesResult.data || [],
        qualificationState: qualificationResult
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract individual stats from combined query
  const favorites = userStats?.favorites || [];
  const certificates = userStats?.certificates || [];
  const userQualificationState = userStats?.qualificationState;

  if (authLoading || enrollmentsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState message="Loading your dashboard..." size="lg" />
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
              {/* Track Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                <TrackCard
                  track="ARBITRATION"
                  level={userQualificationState?.tracks?.arbitration?.level || "NONE"}
                  pathway={userQualificationState?.tracks?.arbitration?.pathway || null}
                  certificates={userQualificationState?.tracks?.arbitration?.certificates || []}
                  enrollments={userQualificationState?.tracks?.arbitration?.enrollments || []}
                  color="#1e40af"
                />
                <TrackCard
                  track="MEDIATION"
                  level={userQualificationState?.tracks?.mediation?.level || "NONE"}
                  pathway={userQualificationState?.tracks?.mediation?.pathway || null}
                  certificates={userQualificationState?.tracks?.mediation?.certificates || []}
                  enrollments={userQualificationState?.tracks?.mediation?.enrollments || []}
                  color="#059669"
                />
              </div>

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
              <LevelUpgradeCelebration />
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
                      {certificates.map((cert: any) => {
                        const trackColor = cert.track === "ARBITRATION" ? "#1e40af" : "#059669";
                        const courseTitle = cert.course_completion_records?.[0]?.courses?.title || "Course";
                        return (
                          <div key={cert.id} className="flex items-center gap-3 p-2 rounded-lg bg-accent/10 border border-accent/20">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                              style={{ backgroundColor: trackColor }}
                            >
                              {cert.post_nominal?.[0] || "C"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{courseTitle}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: trackColor }}>
                                  {cert.track}
                                </span>
                                <p className="text-xs font-semibold">{cert.post_nominal}</p>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {cert.level} • {new Date(cert.issued_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
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

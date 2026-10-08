import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-state";
import StudentLayout from "@/components/student-layout";
import { Link, useLocation } from "wouter";
import { Info } from "lucide-react";

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

  // Fetch enrollments
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

  // Check if profile is complete
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data;
    },
  });

  const isProfileIncomplete = !profile?.full_name || !profile?.country;

  if (authLoading || enrollmentsLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <LoadingState message="Loading your dashboard..." size="lg" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-12 py-8">
        {/* Page Title */}
        <div className="border-b border-[#d4c5b0]/20 pb-4">
          <h1 className="text-2xl font-bold text-[#2c2015] uppercase tracking-wide">
            My Learning
          </h1>
        </div>

        {/* Profile Setup Banner */}
        {isProfileIncomplete && (
          <Alert className="bg-[#d9edf7] border-[#bce8f1] text-[#31708f]">
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Set up your learner profile to enrol in courses.</span>
              <Link href="/profile">
                <Button 
                  size="sm" 
                  className="bg-[#5A2633] text-white hover:bg-[#5A2633]/90 ml-4"
                >
                  Set up profile
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Courses Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#2c2015]">Courses</h2>
          <div className="border border-[#d4c5b0]/30 rounded-md bg-white">
            {enrollments.length === 0 ? (
              <div className="p-8 text-center text-[#6b5d4f]">
                <p>
                  You are not enrolled in any course.{" "}
                  <Link href="/course-catalog" className="text-[#337ab7] hover:underline">
                    Browse courses
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#d4c5b0]/20">
                {enrollments.map((enrollment: any) => (
                  <div key={enrollment.id} className="p-6 hover:bg-[#faf9f6] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#2c2015] mb-1">
                          {enrollment.course?.title}
                        </h3>
                        <p className="text-sm text-[#6b5d4f] mb-2">
                          {enrollment.course?.subtitle || "Professional development course"}
                        </p>
                        <div className="text-sm text-[#6b5d4f]">
                          <span>{Math.round(Number(enrollment.progress) || 0)}% complete</span>
                          {" • "}
                          <span className="capitalize">{enrollment.course?.level || "Associate"}</span>
                        </div>
                      </div>
                      <Link href={`/learn/${enrollment.course?.id}`}>
                        <Button 
                          variant="outline" 
                          className="border-[#5A2633] text-[#5A2633] hover:bg-[#5A2633] hover:text-white"
                        >
                          Go to course
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Bookmarks Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#2c2015]">Bookmarks</h2>
          <div className="border border-[#d4c5b0]/30 rounded-md bg-white p-8 text-center text-[#6b5d4f]">
            Bookmark lessons to find them here.
          </div>
        </section>

        {/* Certificates Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#2c2015]">Certificates</h2>
          <div className="border border-[#d4c5b0]/30 rounded-md bg-white p-8 text-center text-[#6b5d4f]">
            Certificates appear here once issued.
          </div>
        </section>

        {/* Assignments Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#2c2015]">Assignments and instructor comments</h2>
          <div className="border border-[#d4c5b0]/30 rounded-md bg-white p-8 text-center text-[#6b5d4f]">
            No submissions yet.
          </div>
        </section>

        {/* Questions Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[#2c2015]">Questions referred to instructors</h2>
          <div className="border border-[#d4c5b0]/30 rounded-md bg-white p-8 text-center text-[#6b5d4f]">
            Questions you refer from the CIMA Tutor appear here with the instructors' reply.
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

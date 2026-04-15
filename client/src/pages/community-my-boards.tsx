import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Eye, Users, ChevronRight, BookOpen } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SkeletonLoader from "@/components/skeleton-loader";

export default function CommunityMyBoards() {
  const { user } = useAuth();

  // Fetch user's enrolled course boards
  const { data: myCourseBoards = [], isLoading, error } = useQuery({
    queryKey: ['my-course-boards', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e: any) => e.course_id);
      const { data: boards, error } = await supabase
        .from('forum_boards')
        .select('*, course:courses(id, title), category:forum_categories(id, name, slug)')
        .in('course_edition_id', courseIds)
        .eq('is_course_board', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return boards || [];
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/community">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">My Course Boards</h1>
          <p className="text-xl text-primary-foreground/80 mt-2">
            Discussion boards for your enrolled courses
          </p>
        </div>
      </div>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <SkeletonLoader count={3} type="card" />
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">Failed to load course boards. Please try again later.</p>
              </CardContent>
            </Card>
          ) : myCourseBoards.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Course Boards Yet"
              description="Enroll in a course to see its discussion board here."
              actionLabel="Browse Courses"
              actionHref="/courses"
            />
          ) : (
            <div className="space-y-4">
              {myCourseBoards.map((board: any) => (
                <Link key={board.id} href={`/community/forums/${board.slug}`}>
                  <Card className="hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                            {board.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>{board.post_count === 1 ? '1 topic' : `${board.post_count || 0} topics`}</span>
                            <span>•</span>
                            <span>{board.course?.title}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

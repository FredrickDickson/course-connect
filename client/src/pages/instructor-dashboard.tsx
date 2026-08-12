import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student-layout";
import { CourseThumbnail } from "@/components/CourseThumbnail";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Users, DollarSign, Star, Plus, Edit, Eye, Settings,
  TrendingUp, BarChart3, Target, MessageSquare, CheckCircle, Shield
} from "lucide-react";
import { useEffect, useRef } from "react";

export default function InstructorDashboard() {
  const { user, isAuthenticated, isLoading: authLoading, isInstructor } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (authLoading || hasRedirected.current) return;

    if (!isAuthenticated) {
      hasRedirected.current = true;
      setLocation("/login");
      return;
    }
    if (!isInstructor()) {
      hasRedirected.current = true;
      setLocation("/dashboard");
    }
  }, [authLoading, isAuthenticated, isInstructor, setLocation]);

  // Fetch instructor's courses from Supabase
  const { data: courses = [], isLoading: coursesLoading } = useQuery<any[]>({
    queryKey: ['instructor_courses'],
    enabled: !!user && isInstructor(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch instructor stats from Supabase
  const { data: instructorStats } = useQuery({
    queryKey: ['instructor_stats'],
    enabled: !!user && isInstructor(),
    queryFn: async () => {
      if (!user) return null;
      const { count: totalCourses } = await supabase.from('courses').select('*', { count: 'exact', head: true }).eq('instructor_id', user.id);
      const { data: cData } = await supabase.from('courses').select('id, enrollment_count, avg_rating').eq('instructor_id', user.id);
      const courseIds = cData?.map(c => c.id) || [];
      const totalStudents = cData?.reduce((acc, c) => acc + Number(c.enrollment_count || 0), 0) || 0;

      // Calculate average rating from courses
      const coursesWithRatings = cData?.filter(c => c.avg_rating !== null && c.avg_rating > 0) || [];
      const averageRating = coursesWithRatings.length > 0
        ? coursesWithRatings.reduce((acc, c) => acc + Number(c.avg_rating), 0) / coursesWithRatings.length
        : 0;

      let totalRevenue = 0;
      if (courseIds.length > 0) {
        // Only count completed orders (not refunded)
        const { data: orders } = await supabase.from('orders').select('amount, status').in('course_id', courseIds);
        totalRevenue = orders?.reduce((s, o) => {
          // Only count completed orders, exclude refunded/failed orders
          if (o.status === 'completed' || o.status === 'paid') {
            return s + Number(o.amount || 0);
          }
          return s;
        }, 0) || 0;
      }

      return { totalCourses: totalCourses || 0, totalStudents, totalRevenue, averageRating };
    }
  });

  // Fetch instructor's board assignments
  const { data: boardAssignments = [] } = useQuery({
    queryKey: ['instructor-board-assignments', user?.id],
    enabled: !!user && isInstructor(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_assignments')
        .select(`
          *,
          board:forum_boards(id, name, slug, description)
        `)
        .eq('user_id', user!.id);

      if (error) throw error;
      return data || [];
    }
  });


  if (authLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </StudentLayout>
    );
  }

  if (!isAuthenticated || !isInstructor()) return null;

  const totalStudents = instructorStats?.totalStudents || 0;
  const totalRevenue = instructorStats?.totalRevenue || 0;
  const avgRating = instructorStats?.averageRating || 0;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <StudentLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2c2015] font-display">Instructor Dashboard</h1>
            <p className="text-[#6b5d4f] mt-2 font-body">Manage your courses and track performance</p>
          </div>
          <Button asChild className="mt-4 sm:mt-0 bg-[#610000] text-white hover:bg-[#7d0000]">
            <Link href="/instructor/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-[#f5f3ed]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Total Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">{courses.length}</div>
                  <p className="text-xs text-[#6b5d4f]">Courses created</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">{totalStudents}</div>
                  <p className="text-xs text-[#6b5d4f]">Students enrolled</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Estimated Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">{formatCurrency(totalRevenue)}</div>
                  <p className="text-xs text-[#6b5d4f]">Lifetime earnings</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">{avgRating.toFixed(1)}</div>
                  <p className="text-xs text-[#6b5d4f]">Course rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Courses */}
            <Card className="bg-white border-[#d4c5b0]/30">
              <CardHeader>
                <CardTitle className="text-[#2c2015] font-display">Recent Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-[#610000] border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-[#8b6f47] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-[#2c2015] mb-2">No courses yet</h3>
                    <p className="text-[#6b5d4f] mb-4">Create your first course to get started</p>
                    <Button asChild className="bg-[#610000] text-white hover:bg-[#7d0000]">
                      <Link href="/instructor/courses/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Course
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {courses.slice(0, 4).map((course: any) => (
                      <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-all border-[#d4c5b0]/30">
                        <div className="aspect-video relative">
                          {course.thumbnail_url ? (
                            <CourseThumbnail src={course.thumbnail_url} alt={course.title} className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#610000]/20 to-[#8b6f47]/5 flex items-center justify-center">
                              <BookOpen className="h-12 w-12 text-[#610000]/40" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={course.is_published ? "default" : "secondary"} className={course.is_published ? "bg-[#610000]" : ""}>
                              {course.is_published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold line-clamp-1 text-[#2c2015]">{course.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-[#6b5d4f] mt-2">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {course.enrollment_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {Number(course.avg_rating || 0).toFixed(1)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-3">
                            <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                              <Link href={`/course/${course.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                              <Link href={`/instructor/courses/${course.id}/edit`}><Settings className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                              <Link href={`/instructor/courses/${course.id}/curriculum`}><Edit className="h-4 w-4" /></Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#2c2015] font-display">All Courses ({courses.length})</h2>
              <Button asChild className="bg-[#610000] text-white hover:bg-[#7d0000]">
                <Link href="/instructor/courses/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </Button>
            </div>

            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-[#8b6f47] mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[#2c2015] mb-2">No courses yet</h3>
                <p className="text-[#6b5d4f] mb-6">Create your first course to start teaching</p>
                <Button asChild size="lg" className="bg-[#610000] text-white hover:bg-[#7d0000]">
                  <Link href="/instructor/courses/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course: any) => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-all bg-white border-[#d4c5b0]/30">
                    <div className="aspect-video relative">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#610000]/20 to-[#8b6f47]/5 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-[#610000]/40" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2" variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold line-clamp-1 text-[#2c2015]">{course.title}</h4>
                      <p className="text-sm text-[#6b5d4f] line-clamp-2 mt-1">{course.subtitle}</p>
                      <div className="flex items-center gap-4 text-sm text-[#6b5d4f] mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.enrollment_count || 0} students
                        </span>
                        <span>{formatCurrency(Number(course.price))}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                          <Link href={`/course/${course.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                          <Link href={`/instructor/courses/${course.id}/edit`}><Settings className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                          <Link href={`/instructor/courses/${course.id}/curriculum`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="community" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Assigned Boards</CardTitle>
                  <Shield className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">{boardAssignments.length}</div>
                  <p className="text-xs text-[#6b5d4f]">Boards you moderate</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Official Answers</CardTitle>
                  <CheckCircle className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">0</div>
                  <p className="text-xs text-[#6b5d4f]">Marked as official</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-[#6b5d4f]">Moderation Actions</CardTitle>
                  <Shield className="h-4 w-4 text-[#8b6f47]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#2c2015]">0</div>
                  <p className="text-xs text-[#6b5d4f]">Actions taken</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-[#d4c5b0]/30">
              <CardHeader>
                <CardTitle className="text-[#2c2015] font-display">Assigned Forum Boards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {boardAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-[#8b6f47] mx-auto mb-4" />
                    <p className="text-[#6b5d4f]">No board assignments yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {boardAssignments.map((assignment: any) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border border-[#d4c5b0]/30 rounded-lg hover:bg-[#f5f3ed] transition-colors">
                        <div>
                          <h4 className="font-medium text-[#2c2015]">{assignment.board?.name || 'Unnamed Board'}</h4>
                          <p className="text-sm text-[#6b5d4f]">
                            {assignment.board?.description || 'No description'}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
                          <Link href={`/community/forums/${assignment.board?.slug}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t border-[#d4c5b0]/30">
                  <h3 className="font-semibold text-[#2c2015] mb-3">Community Management</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button asChild variant="outline" className="h-auto flex-col py-6 border-[#d4c5b0]/50 hover:bg-[#f5f3ed] hover:border-[#610000]">
                      <Link href="/community">
                        <MessageSquare className="h-8 w-8 mb-2 text-[#610000]" />
                        <span className="text-[#2c2015]">View Community</span>
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-auto flex-col py-6 border-[#d4c5b0]/50 hover:bg-[#f5f3ed] hover:border-[#610000]">
                      <Link href="/community/forums/general/new">
                        <Plus className="h-8 w-8 mb-2 text-[#610000]" />
                        <span className="text-[#2c2015]">Post Announcement</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#2c2015] font-display">
                    <BarChart3 className="w-5 h-5 mr-2 text-[#610000]" />
                    Course Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <p className="text-[#6b5d4f] text-center py-8">No courses to analyze yet</p>
                  ) : (
                    <div className="space-y-4">
                      {courses.slice(0, 5).map((course: any) => (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-[#f5f3ed] rounded-lg">
                          <div>
                            <p className="font-medium text-sm line-clamp-1 text-[#2c2015]">{course.title}</p>
                            <p className="text-xs text-[#6b5d4f]">
                              {course.enrollment_count || 0} students • {Number(course.avg_rating || 0).toFixed(1)}★
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(Number(course.enrollment_count || 0) * Number(course.price || 0))}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white border-[#d4c5b0]/30">
                <CardHeader>
                  <CardTitle className="flex items-center text-[#2c2015] font-display">
                    <Target className="w-5 h-5 mr-2 text-[#610000]" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">Total Courses</span>
                    <span className="font-semibold text-[#2c2015]">{courses.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">Published</span>
                    <span className="font-semibold text-[#2c2015]">{courses.filter((c: any) => c.is_published).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">Drafts</span>
                    <span className="font-semibold text-[#2c2015]">{courses.filter((c: any) => !c.is_published).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6b5d4f]">Total Students</span>
                    <span className="font-semibold text-green-600">{totalStudents}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}

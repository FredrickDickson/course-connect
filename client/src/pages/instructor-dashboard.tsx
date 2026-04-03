import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link, useLocation } from "wouter";
import {
  BookOpen, Users, DollarSign, Star, Plus, Edit, Eye,
  TrendingUp, BarChart3, Target
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

  // Fetch instructor's courses from Express backend
  const { data: courses = [], isLoading: coursesLoading } = useQuery<any[]>({
    queryKey: ['/api/instructor/courses'],
    enabled: !!user && isInstructor(),
  });

  // Fetch instructor stats from Express backend
  const { data: instructorStats } = useQuery<{
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
  }>({
    queryKey: ['/api/instructor/stats'],
    enabled: !!user && isInstructor(),
  });


  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || !isInstructor()) return null;

  const totalStudents = instructorStats?.totalStudents || 0;
  const totalRevenue = instructorStats?.totalRevenue || 0;
  const avgRating = instructorStats?.averageRating || 0;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Instructor Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your courses and track performance</p>
          </div>
          <Button asChild className="mt-4 sm:mt-0">
            <Link href="/instructor/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{courses.length}</div>
                  <p className="text-xs text-muted-foreground">Courses created</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground">Students enrolled</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">Course rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : courses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to get started</p>
                    <Button asChild>
                      <Link href="/instructor/courses/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Course
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {courses.slice(0, 4).map((course: any) => (
                      <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-video relative">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <BookOpen className="h-12 w-12 text-primary/40" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            <Badge variant={course.is_published ? "default" : "secondary"}>
                              {course.is_published ? "Published" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h4 className="font-semibold line-clamp-1">{course.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
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
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/course/${course.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
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
              <h2 className="text-xl font-semibold">All Courses ({courses.length})</h2>
              <Button asChild>
                <Link href="/instructor/courses/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Link>
              </Button>
            </div>

            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-6">Create your first course to start teaching</p>
                <Button asChild size="lg">
                  <Link href="/instructor/courses/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Course
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course: any) => (
                  <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2" variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h4 className="font-semibold line-clamp-1">{course.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{course.subtitle}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.enrollment_count || 0} students
                        </span>
                        <span>{formatCurrency(Number(course.price))}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-3">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/course/${course.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/instructor/courses/${course.id}/curriculum`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Course Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No courses to analyze yet</p>
                  ) : (
                    <div className="space-y-4">
                      {courses.slice(0, 5).map((course: any) => (
                        <div key={course.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{course.title}</p>
                            <p className="text-xs text-muted-foreground">
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Courses</span>
                    <span className="font-semibold">{courses.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Published</span>
                    <span className="font-semibold">{courses.filter((c: any) => c.is_published).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Drafts</span>
                    <span className="font-semibold">{courses.filter((c: any) => !c.is_published).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Students</span>
                    <span className="font-semibold text-green-600">{totalStudents}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

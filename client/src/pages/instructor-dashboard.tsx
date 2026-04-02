// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  Star, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  TrendingUp,
  Calendar,
  BarChart3,
  MessageCircle,
  FileText,
  CheckCircle,
  Clock,
  Award,
  Target,
  ThumbsUp,
  AlertCircle,
  Download,
  PieChart,
  Activity
} from "lucide-react";
import { Link } from "wouter";

interface InstructorStats {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
}

interface InstructorCourse {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  currency: string;
  isPublished: boolean;
  isFeatured: boolean;
  enrollmentCount: number;
  avgRating: number;
  ratingCount: number;
  thumbnailUrl: string;
  createdAt: string;
  category: {
    id: string;
    name: string;
  };
}

export default function InstructorDashboard() {
  const { isLoading: authLoading, hasAccess } = useRoleProtection({ 
    requiredRole: 'instructor' 
  });
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats, isLoading: statsLoading } = useQuery<InstructorStats>({
    queryKey: ['/api/instructor/stats'],
    enabled: hasAccess,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery<InstructorCourse[]>({
    queryKey: ['/api/instructor/courses'],
    enabled: hasAccess,
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['/api/instructor/revenue'],
    enabled: hasAccess,
  });

  const { data: pendingSubmissions = [] } = useQuery({
    queryKey: ['/api/instructor/submissions/pending'],
    enabled: hasAccess,
  });

  const { data: studentQuestions = [] } = useQuery({
    queryKey: ['/api/instructor/questions'],
    enabled: hasAccess,
  });

  const { data: courseAnalytics = [] } = useQuery({
    queryKey: ['/api/instructor/analytics'],
    enabled: hasAccess,
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/instructor/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/stats'] });
      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete course: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (!hasAccess) {
    return null; // Role protection will handle redirect
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle: string;
    trend?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {subtitle}
        </p>
        {trend && (
          <div className="flex items-center mt-2 text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const CourseCard = ({ course }: { course: InstructorCourse }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          {course.isFeatured && (
            <Badge variant="default" className="text-xs">Featured</Badge>
          )}
          <Badge variant={course.isPublished ? "default" : "secondary"} className="text-xs">
            {course.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {course.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.enrollmentCount} students
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {Number(course.avgRating || 0).toFixed(1)} ({course.ratingCount})
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {course.category && (
              <Badge variant="outline" className="text-xs">
                {course.category.name}
              </Badge>
            )}
            <span className="text-lg font-semibold">
              {formatCurrency(Number(course.price), course.currency)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/course/${course.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/instructor/courses/${course.id}/curriculum`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => deleteCourse.mutate(course.id)}
              disabled={deleteCourse.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Instructor Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage your courses and track your teaching performance
            </p>
          </div>
          <Button asChild className="mt-4 sm:mt-0">
            <Link href="/instructor/courses/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                icon={BookOpen}
                title="Total Courses"
                value={stats?.totalCourses || 0}
                subtitle="Courses created"
              />
              <StatCard
                icon={Users}
                title="Total Students"
                value={stats?.totalStudents || 0}
                subtitle="Students enrolled"
              />
              <StatCard
                icon={DollarSign}
                title="Total Revenue"
                value={formatCurrency(stats?.totalRevenue || 0)}
                subtitle="Lifetime earnings"
              />
              <StatCard
                icon={Star}
                title="Average Rating"
                value={stats?.averageRating?.toFixed(1) || "0.0"}
                subtitle="Course rating"
              />
            </div>

            {/* Recent Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Recent Courses
                </CardTitle>
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
                    {courses.slice(0, 4).map((course) => (
                      <CourseCard key={course.id} course={course} />
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

            {coursesLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="aspect-video bg-muted animate-pulse" />
                    <CardHeader>
                      <div className="h-6 bg-muted animate-pulse rounded" />
                      <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : courses.length === 0 ? (
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
                {courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="grading" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Pending Submissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Pending Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingSubmissions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">All caught up! No pending submissions.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingSubmissions.slice(0, 5).map((submission) => (
                        <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <FileText className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{submission.assignment.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {submission.student.firstName} {submission.student.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button size="sm">Grade Now</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Grading Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Grading Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Reviews</span>
                    <span className="font-semibold text-orange-600">{pendingSubmissions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Graded This Week</span>
                    <span className="font-semibold text-green-600">24</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Grade</span>
                    <span className="font-semibold">87%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="font-semibold">2.3 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Student Questions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Student Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {studentQuestions.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No new questions from students.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {studentQuestions.slice(0, 5).map((question) => (
                        <div key={question.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {question.student.firstName[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {question.student.firstName} {question.student.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {question.course.title}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {new Date(question.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground mb-3">{question.content}</p>
                          <Button size="sm" variant="outline">Reply</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Communication Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unanswered Questions</span>
                    <span className="font-semibold text-orange-600">{studentQuestions.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Response Time</span>
                    <span className="font-semibold text-green-600">4.2 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Student Satisfaction</span>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">94%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Messages This Week</span>
                    <span className="font-semibold">18</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Revenue Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <span className="font-bold text-lg text-green-600">$2,450</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Month</span>
                      <span className="font-semibold">$1,890</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Growth</span>
                      <div className="flex items-center space-x-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">+29.6%</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Top Earning Course</p>
                      <p className="font-medium">Cross-Border M&A Dispute Resolution</p>
                      <p className="text-sm text-green-600">$890 this month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Course Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Course Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Cross-Border M&A Dispute Resolution</p>
                        <p className="text-xs text-muted-foreground">45 students • 4.8★</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">$890</p>
                        <p className="text-xs text-muted-foreground">82% completion</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">International Arbitration Fundamentals</p>
                        <p className="text-xs text-muted-foreground">38 students • 4.6★</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">$756</p>
                        <p className="text-xs text-muted-foreground">76% completion</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Mediation Mastery</p>
                        <p className="text-xs text-muted-foreground">52 students • 4.7★</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">$1,040</p>
                        <p className="text-xs text-muted-foreground">89% completion</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Student Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Student Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg Completion Rate</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Students</span>
                    <span className="font-semibold text-green-600">156</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Discussion Posts</span>
                    <span className="font-semibold">89</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quiz Attempts</span>
                    <span className="font-semibold">234</span>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="w-5 h-5 mr-2" />
                    Monthly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Revenue Goal</span>
                      <span className="text-sm font-medium">$2,450 / $3,000</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">New Students</span>
                      <span className="text-sm font-medium">42 / 50</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Course Completion</span>
                      <span className="text-sm font-medium">78% / 85%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-orange-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
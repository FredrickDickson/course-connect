// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/header";
import Footer from "@/components/footer";
import CourseCard from "@/components/course-card";
import { Link, useLocation } from "wouter";
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Heart, 
  Play, 
  MoreVertical, 
  Star, 
  Users, 
  Calendar,
  Award,
  TrendingUp,
  Target,
  CheckCircle,
  HeartIcon,
  Download,
  FileText,
  Video,
  MessageSquare,
  Brain,
  GraduationCap,
  PlayCircle,
  PauseCircle,
  FileDown,
  ClipboardCheck,
  Award as Certificate
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You need to sign in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, toast]);

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['/api/enrollments'],
    enabled: !!user,
  });

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['/api/favorites'],
    enabled: !!user,
  });

  const { data: progressOverview } = useQuery({
    queryKey: ['/api/progress/overview'],
    enabled: !!user,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['/api/certificates'],
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/assignments'],
    enabled: !!user,
  });

  const { data: quizzes = [] } = useQuery({
    queryKey: ['/api/quizzes/pending'],
    enabled: !!user,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['/api/recommendations'],
    enabled: !!user,
  });

  const { data: downloadableResources = [] } = useQuery({
    queryKey: ['/api/resources/downloadable'],
    enabled: !!user,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['/api/activity/recent'],
    enabled: !!user,
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const response = await fetch(`/api/favorites/${courseId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: "Removed from Favorites",
        description: "Course removed from your favorites list.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            <div className="text-center lg:text-left space-y-4">
              <h1 className="text-3xl lg:text-4xl font-bold" data-testid="dashboard-title">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-xl text-primary-foreground/90">
                Continue your journey to mastering Alternative Dispute Resolution
              </p>
            </div>
            
            {/* Quick Action */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/courses">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          {progressOverview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {progressOverview.totalCourses || '0'}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Enrolled</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {progressOverview.completedCourses || '0'}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Completed</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {progressOverview.totalHours || '0'}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Hours</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="p-4 text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-300">
                    {certificates.length || '0'}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Certificates</div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Dashboard Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Current Courses */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Current Courses</h2>
                  <Link href="/courses">
                    <Button variant="outline" data-testid="button-browse-courses">Browse Courses</Button>
                  </Link>
                </div>

                {enrollmentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <Card key={i} className="animate-pulse" data-testid={`skeleton-course-${i}`}>
                        <CardContent className="p-6">
                          <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                          <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                          <div className="h-2 bg-muted rounded mb-2"></div>
                          <div className="h-8 bg-muted rounded w-32"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : enrollments.length === 0 ? (
                  <Card data-testid="no-enrollments">
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-graduation-cap text-6xl text-muted-foreground mb-4"></i>
                      <h3 className="text-xl font-semibold text-foreground mb-2">No courses yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start your ADR journey by enrolling in your first course.
                      </p>
                      <Link href="/courses">
                        <Button data-testid="button-explore-courses">Explore Courses</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {enrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="hover:shadow-lg transition-shadow" data-testid={`course-${enrollment.course.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <img 
                                src={enrollment.course.thumbnailUrl || `https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250`}
                                alt={enrollment.course.title}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div>
                                <h3 className="font-semibold text-foreground" data-testid={`course-title-${enrollment.course.id}`}>
                                  {enrollment.course.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  By {enrollment.course.instructor?.firstName} {enrollment.course.instructor?.lastName}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              data-testid={`course-progress-badge-${enrollment.course.id}`}
                              variant={enrollment.progress === '100' ? 'default' : 'secondary'}
                            >
                              {enrollment.progress}% Complete
                            </Badge>
                          </div>

                          <div className="mb-4">
                            <Progress 
                              value={parseFloat(enrollment.progress || '0')} 
                              className="h-2"
                              data-testid={`progress-bar-${enrollment.course.id}`}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Enrolled on {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </div>
                            <Link href={`/learn/${enrollment.course.id}/1`}>
                              <Button 
                                data-testid={`button-continue-${enrollment.course.id}`}
                                size="sm"
                              >
                                {enrollment.progress === '100' ? 'Review' : 'Continue'}
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Quizzes */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Pending Quizzes</h2>
                  <Badge variant="secondary">{quizzes.length} available</Badge>
                </div>
                
                {quizzes.length === 0 ? (
                  <Card data-testid="no-quizzes">
                    <CardContent className="p-8 text-center">
                      <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No pending quizzes</h3>
                      <p className="text-muted-foreground">Complete lessons to unlock quizzes</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {quizzes.slice(0, 3).map((quiz) => (
                      <Card key={quiz.id} className="border-accent/20 bg-accent/5" data-testid={`quiz-${quiz.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center">
                                <ClipboardCheck className="w-6 h-6 text-accent" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                                <p className="text-sm text-muted-foreground">{quiz.course?.title}</p>
                              </div>
                            </div>
                            <Badge variant="outline">{quiz.questionCount} questions</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Time limit: {quiz.timeLimit || 30} minutes
                            </div>
                            <Link href={`/quiz/${quiz.id}`}>
                              <Button size="sm" data-testid={`button-start-quiz-${quiz.id}`}>
                                <Play className="w-4 h-4 mr-2" />
                                Start Quiz
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Submissions */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Assignments</h2>
                  <Badge variant="secondary">{assignments.length} pending</Badge>
                </div>
                
                {assignments.length === 0 ? (
                  <Card data-testid="no-assignments">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No assignments yet</h3>
                      <p className="text-muted-foreground">Assignments will appear as you progress through courses</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {assignments.slice(0, 3).map((assignment) => (
                      <Card key={assignment.id} className="border-destructive/20 bg-destructive/5" data-testid={`assignment-${assignment.id}`}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                                <FileText className="w-6 h-6 text-destructive" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                                <p className="text-sm text-muted-foreground">{assignment.course?.title}</p>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              Due {new Date(assignment.dueDate).toLocaleDateString()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              {assignment.submissionStatus === 'submitted' ? 'Submitted - Awaiting grade' : 'Not submitted'}
                            </div>
                            <Button 
                              size="sm" 
                              variant={assignment.submissionStatus === 'submitted' ? 'outline' : 'default'}
                              data-testid={`button-assignment-${assignment.id}`}
                            >
                              {assignment.submissionStatus === 'submitted' ? 'View Submission' : 'Submit Assignment'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Downloadable Resources */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground">Resources</h2>
                  <Badge variant="secondary">{downloadableResources.length} available</Badge>
                </div>
                
                {downloadableResources.length === 0 ? (
                  <Card data-testid="no-resources">
                    <CardContent className="p-8 text-center">
                      <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No resources yet</h3>
                      <p className="text-muted-foreground">Downloadable materials will appear as you enroll in courses</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {downloadableResources.slice(0, 4).map((resource) => (
                      <Card key={resource.id} className="hover:shadow-md transition-shadow" data-testid={`resource-${resource.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileDown className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">{resource.title}</h4>
                              <p className="text-sm text-muted-foreground">{resource.type.toUpperCase()}</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            data-testid={`button-download-${resource.id}`}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Learning Stats */}
              {progressOverview && (
                <Card data-testid="learning-stats">
                  <CardHeader>
                    <CardTitle>Learning Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Enrolled Courses</span>
                      <span className="font-semibold text-foreground" data-testid="stat-enrolled">
                        {progressOverview.totalCourses}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completed Courses</span>
                      <span className="font-semibold text-foreground" data-testid="stat-completed">
                        {progressOverview.completedCourses}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Study Hours</span>
                      <span className="font-semibold text-foreground" data-testid="stat-hours">
                        {progressOverview.totalHours}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <span className="font-semibold text-accent" data-testid="stat-success-rate">95%</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Learning Recommendations */}
              <Card data-testid="ai-recommendations">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Recommended for You
                  </CardTitle>
                  <CardDescription>AI-powered course suggestions</CardDescription>
                </CardHeader>
                <CardContent>
                  {recommendations.length === 0 ? (
                    <div className="text-center py-6">
                      <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No recommendations yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Complete more courses to get personalized suggestions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recommendations.slice(0, 3).map((course) => (
                        <div key={course.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors" data-testid={`recommendation-${course.id}`}>
                          <div className="flex items-start space-x-3">
                            <img 
                              src={course.thumbnailUrl || `https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=60`}
                              alt={course.title}
                              className="w-12 h-8 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-foreground truncate">{course.title}</h4>
                              <div className="flex items-center mt-1 space-x-2">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-muted-foreground">{course.avgRating}</span>
                                <Badge variant="outline" className="text-xs">{course.matchScore}% match</Badge>
                              </div>
                            </div>
                          </div>
                          <Link href={`/course/${course.id}`}>
                            <Button size="sm" variant="outline" className="w-full mt-2">
                              View Course
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certificates & Achievements */}
              <Card data-testid="certificates">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Certificate className="w-5 h-5 mr-2" />
                    Award as Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certificates.length === 0 ? (
                    <div className="text-center py-6">
                      <Certificate className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No certificates yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Complete courses to earn PDF certificates</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {certificates.map((cert) => (
                        <div 
                          key={cert.id} 
                          className="flex items-center space-x-3 p-3 bg-accent/10 rounded-lg border border-accent/20 hover:shadow-sm transition-shadow"
                          data-testid={`cert-${cert.course.id}`}
                        >
                          <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground text-sm truncate">
                              {cert.course.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Earned {new Date(cert.issuedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" data-testid={`download-cert-${cert.id}`}>
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Community Activity */}
              <Card data-testid="community-activity">
                <CardHeader>
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Forum Posts</span>
                    <span className="font-medium text-foreground">8</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Questions Asked</span>
                    <span className="font-medium text-foreground">3</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Answers Given</span>
                    <span className="font-medium text-foreground">12</span>
                  </div>
                  <Link href="/community">
                    <Button 
                      data-testid="button-join-community"
                      variant="outline" 
                      className="w-full" 
                      size="sm"
                    >
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

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
    queryKey: ['/api/courses/featured'],
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['/api/enrollments'],
  });

  const { data: progressOverview } = useQuery({
    queryKey: ['/api/progress/overview'],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8 animate-in fade-in duration-1000">
            <div className="space-y-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur text-sm px-4 py-2">
                <Award className="w-4 h-4 mr-2" />
                Professional ADR Certification
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                Welcome back,<br />
                <span className="text-yellow-300">{user?.firstName || 'Student'}</span>!
              </h1>
              <p className="text-xl lg:text-2xl text-primary-foreground/90 max-w-3xl mx-auto leading-relaxed">
                Continue your journey to becoming a certified Alternative Dispute Resolution professional
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
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur">
                  Explore Courses
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          {progressOverview && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16">
              <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1" data-testid="stat-enrolled-courses">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-300 mb-2">
                    {progressOverview.totalCourses || '0'}
                  </div>
                  <div className="text-primary-foreground/80 text-sm">Enrolled Courses</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1" data-testid="stat-completed-courses">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-300 mb-2">
                    {progressOverview.completedCourses || '0'}
                  </div>
                  <div className="text-primary-foreground/80 text-sm">Completed Courses</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1" data-testid="stat-study-hours">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-300 mb-2">
                    {progressOverview.totalHours || '0'}
                  </div>
                  <div className="text-primary-foreground/80 text-sm">Study Hours</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-yellow-300 mb-2">
                    {progressOverview?.averageProgress || '0'}%
                  </div>
                  <div className="text-primary-foreground/80 text-sm">Avg. Progress</div>
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
                <Card key={enrollment.id} className="group hover:shadow-lg transition-shadow" data-testid={`card-enrollment-${enrollment.course.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <img 
                        src={enrollment.course.thumbnailUrl || `https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250`}
                        alt={enrollment.course.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">{enrollment.course.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          By {enrollment.course.instructor?.firstName} {enrollment.course.instructor?.lastName}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Progress</span>
                        <span>{enrollment.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>

                    <Button 
                      data-testid={`button-continue-${enrollment.course.id}`}
                      className="w-full" 
                      onClick={() => window.location.href = `/learn/${enrollment.course.id}/1`}
                    >
                      Continue Learning
                    </Button>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Featured Programs</h2>
              <p className="text-muted-foreground">Expand your expertise with our premium offerings</p>
            </div>
            <Link href="/courses">
              <Button variant="outline" data-testid="button-browse-courses">
                Browse All Courses
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
      <section className="py-16 bg-gradient-to-r from-accent to-yellow-600 text-accent-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Advance Your Career?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of professionals who have elevated their careers with CIMA's internationally recognized programs.
          </p>
          <div className="space-x-4">
            <Link href="/programs">
              <Button 
                data-testid="button-explore-programs"
                size="lg" 
                className="bg-white text-primary hover:bg-gray-100"
              >
                Explore Programs
              </Button>
            </Link>
            <Link href="/community">
              <Button 
                data-testid="button-join-community"
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-accent"
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

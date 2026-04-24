import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link, useLocation } from "wouter";
import {
  Star,
  Clock,
  Users,
  BookOpen,
  PlayCircle,
  CheckCircle,
} from "lucide-react";
import type { EligibilityResponse } from "@shared/eligibility-engine";

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: course, isLoading } = useQuery<any>({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "*, modules:modules!modules_course_id_fkey(*, lessons:lessons!lessons_module_id_fkey(*)), category:categories(*), instructor:users!courses_instructor_id_fkey(*)",
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["enrollment-check", id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", id!)
        .eq("user_id", user?.id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, user:users!reviews_user_id_fkey(*)")
        .eq("course_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Get enrollment count for capacity tracking
  const { data: enrollmentCount = 0 } = useQuery({
    queryKey: ["course-enrollment-count", id],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", id!)
        .neq("payment_status", "cancelled");
      if (error) return 0;
      return count || 0;
    },
    enabled: !!id,
  });

  // Parse ticket types from course
  const ticketTypes = (() => {
    try {
      const types = course?.ticket_types;
      if (Array.isArray(types) && types.length > 0) return types;
    } catch {}
    return [
      { name: "Associate", price_ghs: 5500 },
      { name: "Fellow", price_ghs: 8500 },
    ];
  })();

  const handleEnroll = async () => {
    if (!user) {
      setLocation(`/login?redirect=/course/${id}`);
      return;
    }

    // Check eligibility before proceeding
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/enrollments/check-eligibility", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ courseId: id }),
      });

      if (response.status === 401) {
        setLocation(`/login?redirect=/course/${id}`);
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to verify eligibility");
      }

      const eligibility: EligibilityResponse = await response.json();

      if (eligibility.status === "ELIGIBLE") {
        setLocation(`/checkout/${id}`);
        return;
      }

      toast.info(eligibility.ui.title, {
        description: eligibility.ui.message,
      });
      setLocation(`/enroll/${id}/status`);
    } catch (error) {
      toast.error('Failed to check eligibility. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-64 bg-muted rounded mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-96 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Course Not Found</h1>
          <p className="text-muted-foreground mb-8">The course you're looking for doesn't exist.</p>
          <Link href="/courses"><Button>Browse Courses</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const totalLessons = course.modules?.reduce(
    (total: number, module: any) => total + (module.lessons?.length || 0), 0,
  ) || 0;
  const avgRating = course.avg_rating ? parseFloat(course.avg_rating.toString()) : 0;
  const ratingCount = course.rating_count || 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Course Header */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white">{course.level}</Badge>
                {course.category && (
                  <Badge variant="secondary" className="bg-white/20 text-white">{course.category.name}</Badge>
                )}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold mb-4" data-testid="course-title">{course.title}</h1>
              {course.subtitle && (
                <p className="text-lg text-primary-foreground/90 mb-6" data-testid="course-subtitle">{course.subtitle}</p>
              )}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                {course.instructor && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={course.instructor.profile_image_url || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`}
                      alt={`${course.instructor.first_name} ${course.instructor.last_name}`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span>By {course.instructor.first_name} {course.instructor.last_name}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{avgRating.toFixed(1)} ({ratingCount} reviews)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{course.enrollment_count} students</span>
                </div>
              </div>
            </div>

            {/* Enroll Card */}
            <div className="lg:col-span-1">
              {isEnrolled ? (
                <Card className="bg-white shadow-lg">
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-foreground mb-2">You're Enrolled</h3>
                    <Link href={`/learn/${course.id}/1`}>
                      <Button className="w-full" size="lg">
                        <PlayCircle className="w-4 h-4 mr-2" /> Continue Learning
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white shadow-lg">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Course Price</p>
                      <p className="text-3xl font-bold text-primary">{course.currency || 'USD'} {parseFloat(course.price || '0').toFixed(2)}</p>
                    </div>
                    <Button className="w-full" size="lg" onClick={handleEnroll}>
                      Enroll Now
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Secure checkout · Instant access
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="prose prose-slate max-w-none">
                    <h3 className="text-xl font-semibold mb-4">Course Description</h3>
                    <div className="text-muted-foreground leading-relaxed mb-6" data-testid="course-description">
                      {course.description || "No description available."}
                    </div>
                    {course.tags && course.tags.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">What you'll learn</h3>
                        <div className="flex flex-wrap gap-2">
                          {course.tags.map((tag: any, index: number) => (
                            <Badge key={index} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="curriculum" className="mt-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Course Curriculum</h3>
                    {course.modules && course.modules.length > 0 ? (
                      <div className="space-y-4">
                        {course.modules.map((module: any, moduleIndex: number) => (
                          <Card key={module.id}>
                            <CardContent className="p-4">
                              <h4 className="font-semibold mb-2">{module.title}</h4>
                              {module.description && <p className="text-sm text-muted-foreground mb-3">{module.description}</p>}
                              {module.lessons && module.lessons.length > 0 && (
                                <div className="space-y-2 ml-4">
                                  {module.lessons.map((lesson: any, lessonIndex: number) => (
                                    <div key={lesson.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{lessonIndex + 1}</div>
                                        <span className="text-sm">{lesson.title}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Curriculum will be available soon.</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="mt-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold">Student Reviews</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < Math.floor(avgRating) ? "fill-current text-yellow-500" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        <span className="font-medium">{avgRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({ratingCount} reviews)</span>
                      </div>
                    </div>
                    {reviews.length > 0 ? (
                      <div className="space-y-6">
                        {reviews.map((review) => (
                          <Card key={review.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-4">
                                <img
                                  src={review.user.profile_image_url || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100`}
                                  alt={`${review.user.first_name} ${review.user.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-medium">{review.user.first_name} {review.user.last_name}</p>
                                      <div className="flex items-center space-x-1">
                                        {[...Array(5)].map((_, i) => (
                                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current text-yellow-500" : "text-muted-foreground"}`} />
                                        ))}
                                      </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : "N/A"}
                                    </span>
                                  </div>
                                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No reviews yet. Be the first to review this course!</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Instructor Info */}
            <div className="lg:col-span-1">
              {course.instructor && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Instructor</h3>
                    <div className="text-center space-y-4">
                      <img
                        src={course.instructor.profile_image_url || `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200`}
                        alt={`${course.instructor.first_name} ${course.instructor.last_name}`}
                        className="w-20 h-20 rounded-full object-cover mx-auto"
                      />
                      <div>
                        <h4 className="font-semibold text-lg">{course.instructor.first_name} {course.instructor.last_name}</h4>
                        {course.instructor.bio && <p className="text-sm text-muted-foreground mt-2">{course.instructor.bio}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

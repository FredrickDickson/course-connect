import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentLayout from "@/components/student-layout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import { CourseThumbnail } from "@/components/CourseThumbnail";

export default function Programs() {
  // Fetch all published courses from the database
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["all-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          category:categories(*),
          instructor:users!courses_instructor_id_fkey(first_name, last_name)
        `)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Categorize courses by level
  const flagshipPrograms = courses.filter(c => 
    c.level === "FELLOW" || c.is_featured
  );
  const specializedCourses = courses.filter(c => 
    c.level !== "FELLOW" && !c.is_featured
  );

  const renderCourseCard = (course: any) => (
    <Card key={course.id} className="hover:shadow-lg transition-shadow" data-testid={`course-${course.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Badge className={
            course.level === "FELLOW" ? "bg-accent/10 text-accent" :
            course.level === "MEMBER" ? "bg-green-100 text-green-700" :
            "bg-secondary/10 text-secondary"
          }>
            {course.level || "Associate"}
          </Badge>
          {course.avg_rating && course.avg_rating > 0 && (
            <div className="flex items-center space-x-1 text-sm">
              <i className="fas fa-star text-accent"></i>
              <span className="text-muted-foreground">
                {Number(course.avg_rating).toFixed(1)} ({course.rating_count})
              </span>
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{course.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {course.description || course.subtitle}
        </p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {course.duration_hours && (
              <span><i className="fas fa-clock mr-1"></i>{course.duration_hours} hours</span>
            )}
            <span><i className="fas fa-users mr-1"></i>{course.enrollment_count || 0}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-foreground">
            ${Number(course.price).toFixed(0)}
          </div>
          <Link href={`/course-detail/${course.id}`}>
            <Button size="sm">Learn More</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
  return (
    <StudentLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#5A2633] via-[#5A2633] to-[#5A2633] text-white py-12 sm:py-16 md:py-20 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-sf-pro-display mb-4 sm:mb-6" data-testid="programs-title">
            Professional ADR Programs
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-4xl mx-auto mb-6 sm:mb-8 font-sf-pro-text">
            Advance your career with internationally recognized qualifications designed for aspiring and experienced ADR professionals. Join our global community of mediators and arbitrators.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button 
              data-testid="button-compare-programs"
              className="w-full sm:w-auto bg-[#8b6f47] text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-[#6b5d4f] transition-colors"
            >
              Compare Programs
            </Button>
            <Button 
              data-testid="button-speak-advisor"
              variant="outline"
              className="w-full sm:w-auto border-2 border-white bg-white/10 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-semibold hover:bg-white hover:text-[#5A2633] transition-colors backdrop-blur-sm"
            >
              Speak to an Advisor
            </Button>
          </div>
        </div>
      </section>

      {/* Program Categories */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="flagship" className="space-y-6 sm:space-y-8">
            <TabsList className="grid w-full grid-cols-3 h-auto" data-testid="program-tabs">
              <TabsTrigger value="flagship" className="text-xs sm:text-sm py-2 sm:py-2.5">Flagship Programs</TabsTrigger>
              <TabsTrigger value="specialized" className="text-xs sm:text-sm py-2 sm:py-2.5">Specialized Courses</TabsTrigger>
              <TabsTrigger value="certification" className="text-xs sm:text-sm py-2 sm:py-2.5">Certification Paths</TabsTrigger>
            </TabsList>

            {/* Flagship Programs */}
            <TabsContent value="flagship" className="space-y-8" data-testid="tab-flagship">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Flagship Programs</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Our premier qualifications that provide comprehensive training and internationally recognized credentials.
                </p>
              </div>

              {isLoading ? (
                <div className="grid lg:grid-cols-2 gap-8">
                  {[...Array(2)].map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="w-full h-64" />
                      <CardContent className="p-8">
                        <Skeleton className="h-8 w-3/4 mb-4" />
                        <Skeleton className="h-24 w-full mb-6" />
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : flagshipPrograms.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-8">
                  {flagshipPrograms.map((course) => (
                    <Card key={course.id} className="relative overflow-hidden group hover:shadow-xl transition-shadow" data-testid={`program-${course.id}`}>
                      {course.is_featured && (
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                        </div>
                      )}
                      <CourseThumbnail
                        src={course.thumbnail_url}
                        fallbackSrc="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"
                        alt={course.title}
                        className="w-full h-64"
                        imgClassName="group-hover:scale-125 transition-transform duration-300"
                      />
                      <CardContent className="p-8">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-2xl font-bold text-foreground mb-2">{course.title}</h3>
                            {course.subtitle && (
                              <p className="text-lg text-accent font-medium mb-4">{course.subtitle}</p>
                            )}
                            <p className="text-muted-foreground line-clamp-3">
                              {course.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                              {course.duration_hours && (
                                <div className="flex items-center space-x-3">
                                  <i className="fas fa-clock text-primary"></i>
                                  <span className="text-sm text-muted-foreground">{course.duration_hours} hours</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-3">
                                <i className="fas fa-users text-primary"></i>
                                <span className="text-sm text-muted-foreground">{course.enrollment_count || 0} enrolled</span>
                              </div>
                              {course.instructor && (
                                <div className="flex items-center space-x-3">
                                  <i className="fas fa-user text-primary"></i>
                                  <span className="text-sm text-muted-foreground">
                                    {course.instructor.first_name} {course.instructor.last_name}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <i className="fas fa-certificate text-primary"></i>
                                <span className="text-sm text-muted-foreground">{course.level || "Professional"} level</span>
                              </div>
                              {course.avg_rating && course.avg_rating > 0 && (
                                <div className="flex items-center space-x-3">
                                  <i className="fas fa-star text-accent"></i>
                                  <span className="text-sm text-muted-foreground">
                                    {Number(course.avg_rating).toFixed(1)} ({course.rating_count} reviews)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t">
                            <div>
                              <div className="text-3xl font-light text-foreground" data-testid={`price-${course.id}`}>
                                ${Number(course.price).toFixed(0)}
                              </div>
                              <div className="text-sm text-muted-foreground">{course.currency || "USD"}</div>
                            </div>
                            <Link href={`/course-detail/${course.id}`}>
                              <Button 
                                data-testid={`button-enroll-${course.id}`}
                                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
                              >
                                Learn More
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Programs Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We're working on adding flagship programs. Check back soon for updates!
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Specialized Courses */}
            <TabsContent value="specialized" className="space-y-8" data-testid="tab-specialized">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Specialized Courses</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Focus on specific areas of ADR practice with our targeted training programs.
                </p>
              </div>

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-24 mb-4" />
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-16 w-full mb-4" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : specializedCourses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {specializedCourses.slice(0, 6).map(renderCourseCard)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Programs Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We're working on adding specialized courses. Check back soon for updates!
                  </p>
                </div>
              )}

              {specializedCourses.length > 6 && (
                <div className="text-center">
                  <Link href="/courses">
                    <Button variant="outline" size="lg" data-testid="view-all-courses">
                      View All Courses
                      <i className="fas fa-arrow-right ml-2"></i>
                    </Button>
                  </Link>
                </div>
              )}
            </TabsContent>

            {/* Certification Paths */}
            <TabsContent value="certification" className="space-y-6 sm:space-y-8" data-testid="tab-certification">
              <div className="text-center mb-8 sm:mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">Certification Paths</h2>
                <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                  Choose your path to professional certification based on your career goals and experience level.
                </p>
              </div>

              <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Foundation Path */}
                <Card className="border-2 border-secondary/20 hover:border-secondary transition-colors" data-testid="path-foundation">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-play text-secondary text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Foundation Path</h3>
                    <p className="text-muted-foreground mb-6">Perfect for newcomers to ADR practice</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fundamentals of Mediation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Introduction to Arbitration</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>ADR Ethics & Standards</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-light text-foreground mb-2">$1,200</div>
                    <div className="text-sm text-muted-foreground mb-6">Complete package</div>
                    <Button className="w-full">Start Foundation</Button>
                  </CardContent>
                </Card>

                {/* Professional Path */}
                <Card className="border-2 border-primary/50 hover:border-primary transition-colors relative" data-testid="path-professional">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                  </div>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-star text-primary text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Professional Path</h3>
                    <p className="text-muted-foreground mb-6">For practicing professionals seeking advancement</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Global M&A Program</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>International Arbitration</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fellow-level Case Management</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Professional Certification</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-light text-foreground mb-2">$3,500</div>
                    <div className="text-sm text-muted-foreground mb-6">Save $450 vs individual</div>
                    <Button className="w-full bg-primary">Start Professional</Button>
                  </CardContent>
                </Card>

                {/* Fellowship Path */}
                <Card className="border-2 border-accent/20 hover:border-accent transition-colors" data-testid="path-fellowship">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="fas fa-crown text-accent text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-4">Fellowship Path</h3>
                    <p className="text-muted-foreground mb-6">Elite certification for senior practitioners</p>
                    
                    <div className="space-y-3 mb-8">
                      <div className="text-sm text-left space-y-2">
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>FCIMArb Fellowship</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Fellow-level Practice Methods</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Global Network Access</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <i className="fas fa-check text-green-600"></i>
                          <span>Lifetime Membership</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-2xl font-light text-foreground mb-2">$4,750</div>
                    <div className="text-sm text-muted-foreground mb-6">Premium qualification</div>
                    <Button className="w-full bg-accent text-accent-foreground">Apply for Fellowship</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-[#8b6f47] to-[#6b5d4f] text-white -mx-4 sm:-mx-6 lg:-mx-8 mb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-sf-pro-display mb-3 sm:mb-4">Ready to Start Your ADR Journey?</h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 font-sf-pro-text">
            Join thousands of professionals who have elevated their careers with CIMA's internationally recognized programs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button 
              data-testid="button-get-started"
              size="lg" 
              className="w-full sm:w-auto bg-[#5A2633] text-white hover:bg-[#5A2633]"
            >
              Get Started Today
            </Button>
            <Button 
              data-testid="button-schedule-consultation"
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto border-2 border-white bg-white/10 text-white hover:bg-white hover:text-[#8b6f47] backdrop-blur-sm transition-colors"
            >
              Schedule Consultation
            </Button>
          </div>
        </div>
      </section>
    </StudentLayout>
  );
}

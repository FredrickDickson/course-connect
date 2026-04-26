import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CourseCardStatus, { getCourseStatus, type CourseStatus } from "@/components/course-card-status";
import EnrollmentGateModal from "@/components/enrollment-gate-modal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  PATHWAY_TYPES, 
  detectCoursePathway,
  getPathwayConfig,
  type PathwayType 
} from "../../../shared/pathways";

export default function CourseCatalog() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPathway, setSelectedPathway] = useState<PathwayType | "all">("all");
  const [selectedLockedCourse, setSelectedLockedCourse] = useState<any>(null);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Get user's effective level
  const userLevel = (user?.assignedLevel || user?.currentLevel || "NONE").toUpperCase() as "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";

  // Fetch categories from Supabase
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Fetch published courses from Supabase
  const { data: courses = [], isLoading } = useQuery<any[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          `*,\n          category:categories(name),\n          instructor:users!courses_instructor_id_fkey(first_name, last_name)\n        `,
        )
        .eq("is_published", true);

      if (error) throw error;
      return data;
    },
  });

  // Fetch user's existing enrollments
  const { data: userEnrollments = [] } = useQuery({
    queryKey: ["user-enrollments", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, status")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const categories = ["all", ...categoriesData.map((cat: any) => cat.id)];
  const categoryNames = {
    all: "All Courses",
    ...Object.fromEntries(categoriesData.map((cat: any) => [cat.id, cat.name])),
  };

  // Check if user is enrolled in a course
  const isEnrolled = (courseId: string) => {
    return userEnrollments.some(e => e.course_id === courseId && e.status === 'ACTIVE');
  };
  
  // Get next course for progression
  const getNextCourse = (currentLevel: string) => {
    const levelOrder = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];
    const currentIndex = levelOrder.indexOf(currentLevel.toUpperCase());
    const nextLevel = levelOrder[currentIndex + 1];
    
    return courses.find(c => c.level?.toUpperCase() === nextLevel);
  };

  // Filter courses by category and pathway
  const filteredCourses = courses.filter((course) => {
    // Category filter
    const categoryMatch = selectedCategory === "all" || course.category_id === selectedCategory;
    
    // Pathway filter - detect course pathway from title and tags
    const coursePathway = detectCoursePathway({
      title: course.title,
      tags: course.tags || []
    });
    const pathwayMatch = selectedPathway === "all" || coursePathway === selectedPathway;
    
    return categoryMatch && pathwayMatch;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1
              className="text-4xl font-bold text-foreground"
              data-testid="title"
            >
              Course Catalog
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional ADR training courses designed to build competency and
              expertise in international mediation and arbitration.
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedCategory(category)}
                data-testid={`filter-${typeof category === "string" ? category.toLowerCase() : category}`}
              >
                {categoryNames[category] || category}
              </Button>
            ))}
          </div>

          {/* Filter Pathways */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedPathway === "all" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedPathway("all")}
            >
              All Pathways
            </Button>
            <Button
              variant={selectedPathway === PATHWAY_TYPES.ARBITRATION ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedPathway(PATHWAY_TYPES.ARBITRATION)}
            >
              Arbitration (ACIMArb)
            </Button>
            <Button
              variant={selectedPathway === PATHWAY_TYPES.MEDIATION ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedPathway(PATHWAY_TYPES.MEDIATION)}
            >
              Mediation (ACIMed)
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading courses...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredCourses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">
                No courses available yet.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back soon for new courses!
              </p>
            </div>
          )}

          {/* Course Grid */}
          {!isLoading && filteredCourses.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const status: CourseStatus = isEnrolled(course.id) 
                  ? "ENROLLED" 
                  : getCourseStatus(course.level, userLevel);
                
                return (
                  <CourseCardStatus 
                    key={course.id} 
                    course={course} 
                    userLevel={userLevel}
                    status={status}
                    onLockedClick={() => {
                      setSelectedLockedCourse(course);
                      setIsGateModalOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      
      {/* Enrollment Gate Modal */}
      <EnrollmentGateModal
        isOpen={isGateModalOpen}
        onClose={() => {
          setIsGateModalOpen(false);
          setSelectedLockedCourse(null);
        }}
        courseLevel={(selectedLockedCourse?.level || "ASSOCIATE").toUpperCase()}
        userLevel={userLevel}
        courseId={selectedLockedCourse?.id}
        courseTitle={selectedLockedCourse?.title}
        nextCourse={getNextCourse(userLevel) ? {
          id: getNextCourse(userLevel)!.id,
          title: getNextCourse(userLevel)!.title,
          level: getNextCourse(userLevel)!.level
        } : undefined}
      />
    </div>
  );
}

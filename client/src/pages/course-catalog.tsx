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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PATHWAY_TYPES, 
  detectCoursePathway,
  getPathwayConfig,
  type PathwayType 
} from "../../../shared/pathways";

export default function CourseCatalog() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPathway, setSelectedPathway] = useState<PathwayType | "all">("all");
  const [trackFilter, setTrackFilter] = useState<"all" | "ARBITRATION" | "MEDIATION">("all");
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [selectedLockedCourse, setSelectedLockedCourse] = useState<any>(null);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);
  const { user } = useAuth();
  
  // Get user's effective level
  const userLevel = (user?.assignedLevel || user?.currentLevel || "NONE").toUpperCase() as "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";

  // Fetch user's track progress
  const { data: trackProgress = {} } = useQuery({
    queryKey: ["track-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return {};
      const { data, error } = await (supabase as any)
        .from("track_progress")
        .select("track, level")
        .eq("user_id", user.id);
      if (error) throw error;
      const progress: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        progress[row.track] = row.level || "NONE";
      });
      return progress;
    },
    enabled: !!user?.id,
  });

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
    queryKey: ["courses", selectedCategory, selectedPathway, trackFilter, showEligibleOnly],
    queryFn: async () => {
      let query = supabase
        .from("courses")
        .select(
          `*,
          category:categories(name),
          instructor:users!courses_instructor_id_fkey(first_name, last_name)
        `,
        )
        .eq("is_published", true);

      // Track filter
      if (trackFilter !== "all") {
        query = query.eq("track", trackFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filteredData = data || [];
      
      // Filter by eligibility if toggle is on
      if (showEligibleOnly && user?.id) {
        filteredData = filteredData.filter(course => {
          const eligibility = checkCourseEligibility(course);
          return eligibility.status === "eligible";
        });
      }
      
      // Sort by eligibility: eligible first, then upgrade-required, then enrolled
      if (user?.id) {
        filteredData.sort((a: any, b: any) => {
          const aElig = checkCourseEligibility(a);
          const bElig = checkCourseEligibility(b);
          
          const priority = { eligible: 0, "upgrade-required": 1, enrolled: 2, unknown: 3 };
          return priority[aElig.status as keyof typeof priority] - priority[bElig.status as keyof typeof priority];
        });
      }
      
      return filteredData;
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
  
  // Eligibility checking helper
  const checkCourseEligibility = (course: any): { status: "eligible" | "upgrade-required" | "enrolled" | "unknown"; label: string } => {
    if (!user?.id) return { status: "unknown", label: "Sign in to check" };
    
    const courseTrack = course.track || "ARBITRATION";
    const userTrackLevel = trackProgress[courseTrack] || "NONE";
    const courseLevel = (course.level || "associate").toUpperCase();
    
    const LEVEL_ORDER = { NONE: 0, ASSOCIATE: 1, MEMBER: 2, FELLOW: 3 };
    const userIndex = LEVEL_ORDER[userTrackLevel as keyof typeof LEVEL_ORDER] || 0;
    const courseIndex = LEVEL_ORDER[courseLevel as keyof typeof LEVEL_ORDER] || 1;
    
    // Check if enrolled
    const isEnrolledCourse = userEnrollments.some(
      (e: any) => e.course_id === course.id && e.status === "ACTIVE"
    );
    if (isEnrolledCourse) return { status: "enrolled", label: "Enrolled" };
    
    // Anyone can take Associate
    if (courseLevel === "ASSOCIATE") {
      return { status: "eligible", label: "Eligible" };
    }
    
    // Must have completed previous level
    if (userIndex >= courseIndex - 1) {
      return { status: "eligible", label: "Eligible" };
    }
    
    // Show what level is needed
    const requiredLevel = courseIndex === 2 ? "Associate" : "Member";
    return { status: "upgrade-required", label: `Requires ${requiredLevel}` };
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

          {/* Track and Eligibility Filters */}
          <div className="flex flex-wrap justify-center gap-3 items-center">
            <Select value={trackFilter} onValueChange={(value: any) => setTrackFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Track" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                <SelectItem value="ARBITRATION">Arbitration</SelectItem>
                <SelectItem value="MEDIATION">Mediation</SelectItem>
              </SelectContent>
            </Select>
            {user && (
              <Button
                variant={showEligibleOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowEligibleOnly(!showEligibleOnly)}
              >
                {showEligibleOnly ? "All Courses" : "Eligible Only"}
              </Button>
            )}
          </div>

          {/* Progress Header for Logged-in Users */}
          {user && Object.keys(trackProgress).length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-foreground">Your Progress</h3>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  {Object.entries(trackProgress).map(([track, level]) => (
                    <Badge key={track} variant="secondary">
                      {track}: {level}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                const eligibility = checkCourseEligibility(course);
                const status: CourseStatus = eligibility.status === "enrolled" 
                  ? "ENROLLED" 
                  : eligibility.status === "eligible"
                  ? "AVAILABLE"
                  : "LOCKED";
                
                return (
                  <CourseCardStatus 
                    key={course.id} 
                    course={course} 
                    userLevel={userLevel}
                    status={status}
                    eligibility={eligibility}
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
        courseTrack={selectedLockedCourse?.track as "ARBITRATION" | "MEDIATION"}
        nextCourse={getNextCourse(userLevel) ? {
          id: getNextCourse(userLevel)!.id,
          title: getNextCourse(userLevel)!.title,
          level: getNextCourse(userLevel)!.level,
          track: getNextCourse(userLevel)!.track
        } : undefined}
      />
    </div>
  );
}

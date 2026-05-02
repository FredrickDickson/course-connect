import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Star, Users, Clock, Crown, ShoppingCart, Lock, CheckCircle, ArrowRight, Monitor, MapPin } from "lucide-react";
import { 
  detectCoursePathway, 
  getPathwayConfig,
  type PathwayType 
} from "../../../shared/pathways";

export type CourseStatus = "AVAILABLE" | "NEXT_STEP" | "LOCKED" | "ENROLLED";

interface CourseCardStatusProps {
  course: {
    id: string;
    title: string;
    subtitle?: string;
    description?: string;
    price: string;
    currency: string;
    thumbnail_url?: string;
    level: string;
    avg_rating: string;
    rating_count: number;
    enrollment_count: number;
    duration_hours?: number;
    instructor?: {
      first_name?: string;
      last_name?: string;
    };
    category?: {
      name: string;
    };
    is_featured?: boolean;
    tags?: string[];
    total_capacity?: number;
    course_type?: "ONLINE" | "PHYSICAL";
    start_date?: string;
    end_date?: string;
    venue?: string;
    city?: string;
  };
  userLevel?: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  status: CourseStatus;
  onLockedClick?: () => void;
}

const LEVEL_ORDER = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];

export function getCourseStatus(
  courseLevel: string,
  userLevel: string = "NONE"
): CourseStatus {
  const normalizedCourseLevel = courseLevel?.toUpperCase() || "ASSOCIATE";
  const normalizedUserLevel = userLevel?.toUpperCase() || "NONE";

  const userIndex = LEVEL_ORDER.indexOf(normalizedUserLevel);
  const courseIndex = LEVEL_ORDER.indexOf(normalizedCourseLevel);

  // User can access courses at or below their current level
  if (userIndex >= courseIndex) return "AVAILABLE";
  // Next level course - user should complete prerequisite first
  if (userIndex === courseIndex - 1) return "NEXT_STEP";
  // Higher level courses are locked until prerequisites are met
  return "LOCKED";
}

export default function CourseCardStatus({ 
  course, 
  userLevel = "NONE",
  status,
  onLockedClick 
}: CourseCardStatusProps) {
  const coursePathway = detectCoursePathway({
    title: course.title,
    tags: course.tags || []
  });
  const pathwayConfig = getPathwayConfig(coursePathway);

  const defaultThumbnail = course.level === 'fellow'
    ? "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300"
    : course.category?.name?.toLowerCase().includes('mediation')
      ? "https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300"
      : "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=300";

  const levelColors = {
    associate: "bg-secondary/10 text-secondary",
    member: "bg-green-100 text-green-700",
    fellow: "bg-accent/10 text-accent"
  };

  const pathwayColors = {
    arbitration: "bg-blue-100 text-blue-700",
    mediation: "bg-green-100 text-green-700"
  };

  const courseTypeConfig = {
    ONLINE: { icon: Monitor, class: "bg-indigo-100 text-indigo-700", label: "Online" },
    PHYSICAL: { icon: MapPin, class: "bg-amber-100 text-amber-700", label: "In-Person" }
  };

  const statusConfig = {
    AVAILABLE: {
      badge: null,
      buttonVariant: "default" as const,
      buttonText: "Enroll Now",
      buttonIcon: ShoppingCart,
      buttonClass: "bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-105",
      overlay: null
    },
    NEXT_STEP: {
      badge: { text: "Next Step", class: "bg-blue-100 text-blue-700 border-blue-200" },
      buttonVariant: "default" as const,
      buttonText: "Start This Level",
      buttonIcon: ArrowRight,
      buttonClass: "bg-blue-600 text-white hover:bg-blue-700 hover:scale-105",
      overlay: null
    },
    LOCKED: {
      badge: { text: "Locked", class: "bg-gray-100 text-gray-600 border-gray-200" },
      buttonVariant: "outline" as const,
      buttonText: "Locked",
      buttonIcon: Lock,
      buttonClass: "border-gray-300 text-gray-400 cursor-not-allowed",
      overlay: "bg-gray-900/5"
    },
    ENROLLED: {
      badge: { text: "Enrolled", class: "bg-green-100 text-green-700 border-green-200" },
      buttonVariant: "outline" as const,
      buttonText: "Continue",
      buttonIcon: CheckCircle,
      buttonClass: "border-green-500 text-green-700 hover:bg-green-50",
      overlay: null
    }
  };

  const config = statusConfig[status];

  return (
    <Card
      className={`group hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 ease-in-out overflow-hidden border-primary/5 hover:border-primary/20 relative ${
        status === "LOCKED" ? "opacity-75" : ""
      }`}
      data-testid={`course-card-${course.id}`}
    >
      {/* Locked overlay */}
      {config.overlay && (
        <div className={`absolute inset-0 z-10 pointer-events-none ${config.overlay}`} />
      )}

      <div className="relative">
        <img
          src={course.thumbnail_url || defaultThumbnail}
          alt={course.title}
          className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
          data-testid="course-thumbnail"
        />
        {course.is_featured && (
          <Badge
            className="absolute top-4 left-4 bg-primary text-primary-foreground shadow-lg backdrop-blur-sm"
            data-testid="featured-badge"
          >
            <Crown className="w-3.5 h-3.5 mr-1.5" />
            Featured
          </Badge>
        )}
        <Badge
          className={`absolute top-4 right-4 shadow-lg backdrop-blur-sm ${levelColors[course.level as keyof typeof levelColors] || levelColors.associate}`}
          data-testid="level-badge"
        >
          {course.level}
        </Badge>
        
        {/* Status badge */}
        {config.badge && (
          <Badge
            className={`absolute bottom-4 left-4 shadow-lg backdrop-blur-sm border ${config.badge.class}`}
            data-testid="status-badge"
          >
            {config.badge.text}
          </Badge>
        )}
      </div>

      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          {/* Review count commented out until substantial user base */}
          {/* <div className="flex items-center space-x-1.5 group/rating">
            <Star className="w-4 h-4 text-yellow-400 fill-current group-hover/rating:scale-125 transition-transform" />
            <span className="text-sm font-medium text-foreground" data-testid="course-rating">
              {Number(course.avg_rating || 0).toFixed(1)} <span className="text-muted-foreground font-normal">({course.rating_count || 0})</span>
            </span>
          </div> */}
          <div className="flex items-center space-x-2">
            <Badge 
              className={`text-[10px] uppercase tracking-wider font-bold ${pathwayColors[coursePathway]}`}
              data-testid="pathway-badge"
            >
              {pathwayConfig.name}
            </Badge>
            {course.category && (
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold bg-secondary/20" data-testid="category-badge">
                {course.category.name}
              </Badge>
            )}
            {/* Course Type Badge */}
            {course.course_type && (
              <Badge 
                className={`text-[10px] uppercase tracking-wider font-bold ${courseTypeConfig[course.course_type].class}`}
                data-testid="course-type-badge"
              >
                {(() => {
                  const TypeIcon = courseTypeConfig[course.course_type].icon;
                  return <TypeIcon className="w-3 h-3 mr-1" />;
                })()}
                {courseTypeConfig[course.course_type].label}
              </Badge>
            )}
          </div>
        </div>

        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1" data-testid="course-title">
          {course.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-6 line-clamp-2 leading-relaxed" data-testid="course-description">
          {course.subtitle || course.description || "Master industry-standard ADR skills with our specialized certification track."}
        </p>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-5 text-sm text-muted-foreground">
            {course.duration_hours && (
              <span className="flex items-center space-x-1.5" data-testid="course-duration">
                <Clock className="w-3.5 h-3.5 text-primary/60" />
                <span>{course.duration_hours}h</span>
              </span>
            )}
            <span className="flex items-center space-x-1.5" data-testid="course-students">
              <Users className="w-3.5 h-3.5 text-primary/60" />
              <span>{course.enrollment_count || 0} learners</span>
            </span>
          </div>
        </div>

        {/* Capacity indicator removed - courses are online only */}

        {/* Physical course details */}
        {course.course_type === 'PHYSICAL' && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <MapPin className="w-4 h-4" />
              <span className="font-medium">
                {course.city || course.venue || 'In-Person Event'}
              </span>
            </div>
            {(course.start_date || course.end_date) && (
              <p className="text-xs text-amber-700 mt-1 ml-6">
                {course.start_date && new Date(course.start_date).toLocaleDateString('en-US', { 
                  month: 'short', day: 'numeric', year: 'numeric' 
                })}
                {course.end_date && course.end_date !== course.start_date && 
                  ` - ${new Date(course.end_date).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', year: 'numeric' 
                  })}`
                }
              </p>
            )}
          </div>
        )}

        {course.instructor && (
          <div className="text-xs font-medium text-muted-foreground mb-6 flex items-center" data-testid="instructor-info">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center mr-2 text-primary">
              {course.instructor.first_name?.[0]}
            </div>
            By {course.instructor.first_name} {course.instructor.last_name}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div>
            <div className="text-2xl font-black text-primary" data-testid="course-price">
              {parseFloat(course.price) > 0 ? `$${course.price}` : 'Free'}
            </div>
            {parseFloat(course.price) > 0 && (
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{course.currency}</div>
            )}
          </div>
          
          {status === "LOCKED" ? (
            <Button
              variant={config.buttonVariant}
              className={config.buttonClass}
              onClick={onLockedClick}
              data-testid="locked-course-button"
            >
              <config.buttonIcon className="w-4 h-4 mr-2" />
              {config.buttonText}
            </Button>
          ) : status === "ENROLLED" ? (
            <Link href={`/learn/${course.id}`}>
              <Button
                variant={config.buttonVariant}
                className={config.buttonClass}
                data-testid="continue-course-button"
              >
                <config.buttonIcon className="w-4 h-4 mr-2" />
                {config.buttonText}
              </Button>
            </Link>
          ) : (
            <Link href={`/course/${course.id}`}>
              <Button
                variant={config.buttonVariant}
                className={config.buttonClass}
                data-testid="view-course-button"
              >
                <config.buttonIcon className="w-4 h-4 mr-2" />
                {config.buttonText}
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

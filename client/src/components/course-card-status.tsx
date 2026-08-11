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
    programme_type?: "PROFESSIONAL_PROGRAMME" | "ADJUNCT_COURSE";
    track?: string;
  };
  userLevel?: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  status: CourseStatus;
  eligibility?: {
    status: "eligible" | "upgrade-required" | "enrolled" | "unknown";
    label: string;
  };
  onLockedClick?: () => void;
}

const LEVEL_ORDER = ["NONE", "STUDENT", "ASSOCIATE", "MEMBER", "FELLOW"];

export function getCourseStatus(
  courseLevel: string | null | undefined,
  userLevel: string = "NONE"
): CourseStatus {
  // Adjunct Courses have no qualification level - they're never locked
  // against the Associate/Member/Fellow ladder.
  if (courseLevel == null) return "AVAILABLE";

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
  eligibility,
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
    associate: "bg-[#610000]/10 text-[#610000] border-[#610000]/20",
    member: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20",
    fellow: "bg-[#d4c5b0]/30 text-[#4a3828] border-[#8b6f47]/20"
  };

  const pathwayColors = {
    arbitration: "bg-[#610000]/10 text-[#610000] border-[#610000]/20",
    mediation: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20"
  };

  const statusConfig = {
    AVAILABLE: {
      badge: null,
      buttonVariant: "default" as const,
      buttonText: "Enroll Now",
      buttonIcon: ShoppingCart,
      buttonClass: "bg-[#610000] text-white hover:bg-[#7d0000] shadow-md hover:shadow-lg transition-all",
      overlay: null
    },
    NEXT_STEP: {
      badge: { text: "Next Step", class: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20" },
      buttonVariant: "default" as const,
      buttonText: "Start Level",
      buttonIcon: ArrowRight,
      buttonClass: "bg-[#8b6f47] text-white hover:bg-[#6d5838] shadow-md hover:shadow-lg transition-all",
      overlay: null
    },
    LOCKED: {
      badge: { text: "Locked", class: "bg-gray-100 text-gray-600 border-gray-200" },
      buttonVariant: "outline" as const,
      buttonText: "View",
      buttonIcon: Lock,
      buttonClass: "border-[#d4c5b0] text-[#4a3828] hover:bg-[#faf9f6] hover:border-[#8b6f47]",
      overlay: "bg-gray-900/5"
    },
    ENROLLED: {
      badge: { text: "Enrolled", class: "bg-[#8b6f47]/10 text-[#8b6f47] border-[#8b6f47]/20" },
      buttonVariant: "outline" as const,
      buttonText: "Continue",
      buttonIcon: CheckCircle,
      buttonClass: "border-[#8b6f47] text-[#8b6f47] hover:bg-[#8b6f47]/10",
      overlay: null
    }
  };

  const config = statusConfig[status];

  return (
    <Card
      className={`group h-full flex flex-col hover:shadow-xl hover:shadow-[#610000]/10 hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden border border-[#d4c5b0]/40 hover:border-[#610000]/30 relative bg-white ${
        status === "LOCKED" ? "opacity-80 cursor-pointer" : ""
      }`}
      data-testid={`course-card-${course.id}`}
      onClick={status === "LOCKED" ? () => window.location.href = `/course/${course.id}` : undefined}
    >
      {/* Locked overlay */}
      {config.overlay && (
        <div className={`absolute inset-0 z-10 pointer-events-none ${config.overlay}`} />
      )}

      {/* Thumbnail Section - Fixed Height */}
      <div className="relative h-36 sm:h-44 md:h-48 flex-shrink-0 overflow-hidden bg-[#faf9f6]">
        <img
          src={course.thumbnail_url || defaultThumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          data-testid="course-thumbnail"
        />
        
        {/* Gradient overlay for better badge visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        
        {/* Top badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex items-start justify-between gap-2">
          {course.is_featured && (
            <Badge
              className="bg-gradient-to-r from-[#610000] to-[#8b0000] text-white border-0 shadow-lg text-[10px] sm:text-xs"
              data-testid="featured-badge"
            >
              <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" />
              Featured
            </Badge>
          )}
          
          <div className="ml-auto flex flex-col gap-1.5 sm:gap-2">
            {course.programme_type === "ADJUNCT_COURSE" ? (
              <Badge
                className="bg-white/95 text-[#4a3828] border border-[#d4c5b0] shadow-md backdrop-blur-sm text-[10px] sm:text-xs"
                data-testid="adjunct-course-badge"
              >
                Adjunct Course
              </Badge>
            ) : (
              <Badge
                className={`border shadow-md backdrop-blur-sm bg-white/95 text-[10px] sm:text-xs ${levelColors[course.level as keyof typeof levelColors] || levelColors.associate}`}
                data-testid="level-badge"
              >
                {course.level}
              </Badge>
            )}
          </div>
        </div>

        {/* Status badge - Bottom Left */}
        {config.badge && (
          <Badge
            className={`absolute bottom-2 sm:bottom-3 left-2 sm:left-3 border shadow-md backdrop-blur-sm text-[10px] sm:text-xs ${config.badge.class}`}
            data-testid="status-badge"
          >
            {config.badge.text}
          </Badge>
        )}
      </div>

      {/* Content Section - Flexible Height */}
      <CardContent className="p-3 sm:p-4 md:p-5 flex flex-col flex-grow">
        {/* Badges Row */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
          {course.programme_type !== "ADJUNCT_COURSE" && (
            <Badge
              className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold border ${pathwayColors[coursePathway]}`}
              data-testid="pathway-badge"
            >
              {pathwayConfig.name}
            </Badge>
          )}
          {course.category && (
            <Badge className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold border-[#d4c5b0] text-[#4a3828] bg-[#faf9f6]" data-testid="category-badge">
              {course.category.name}
            </Badge>
          )}
        </div>

        {/* Title - Fixed 2 lines */}
        <h3 className="text-base sm:text-lg font-bold text-[#2c2015] mb-1.5 sm:mb-2 group-hover:text-[#610000] transition-colors line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3.5rem]" data-testid="course-title">
          {course.title}
        </h3>

        {/* Eligibility Badge */}
        {eligibility && eligibility.status !== "unknown" && (
          <div className="mb-3">
            <Badge
              variant={
                eligibility.status === "eligible"
                  ? "default"
                  : eligibility.status === "enrolled"
                  ? "secondary"
                  : "outline"
              }
              className={
                eligibility.status === "eligible"
                  ? "bg-green-500 text-white"
                  : eligibility.status === "enrolled"
                  ? "bg-blue-500 text-white"
                  : ""
              }
            >
              {eligibility.label}
            </Badge>
            {eligibility.status === "upgrade-required" && course.track && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Complete {eligibility.label.replace(/^Requires\s+/i, "")} in {course.track} to unlock
              </p>
            )}
          </div>
        )}

        {/* Description - Fixed 2 lines */}
        <p className="text-xs sm:text-sm text-[#6b5d4f] mb-3 sm:mb-4 line-clamp-2 leading-relaxed min-h-[2rem] sm:min-h-[2.5rem]" data-testid="course-description">
          {course.subtitle || course.description || "Master industry-standard ADR skills with our specialized certification track."}
        </p>

        {/* Meta Info Row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm text-[#6b5d4f]">
          {course.duration_hours && (
            <span className="flex items-center gap-1 sm:gap-1.5" data-testid="course-duration">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8b6f47]" />
              <span className="font-medium">{course.duration_hours}h</span>
            </span>
          )}
          <span className="flex items-center gap-1 sm:gap-1.5" data-testid="course-students">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8b6f47]" />
            <span className="font-medium">{course.enrollment_count || 0}</span>
          </span>
        </div>

        {/* Physical Course Details */}
        {course.course_type === 'PHYSICAL' && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-sm text-amber-900 font-medium">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {course.city || course.venue || 'In-Person Event'}
              </span>
            </div>
            {(course.start_date || course.end_date) && (
              <p className="text-xs text-amber-800 mt-1.5 ml-6">
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

        {/* Instructor */}
        {course.instructor && (
          <div className="text-xs text-[#6b5d4f] mb-4 flex items-center" data-testid="instructor-info">
            <div className="w-7 h-7 rounded-full bg-[#610000]/10 flex items-center justify-center mr-2.5 text-[#610000] font-semibold text-xs">
              {course.instructor.first_name?.[0]}
            </div>
            <span className="font-medium">
              {course.instructor.first_name} {course.instructor.last_name}
            </span>
          </div>
        )}

        {/* Spacer to push footer to bottom */}
        <div className="flex-grow" />

        {/* Footer - Price & CTA */}
        <div className="flex items-center justify-between pt-4 mt-auto border-t border-[#d4c5b0]/30">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[#610000]" data-testid="course-price">
              {parseFloat(course.price) > 0 ? `$${parseFloat(course.price).toFixed(2)}` : 'Free'}
            </span>
            {parseFloat(course.price) > 0 && (
              <span className="text-[10px] uppercase tracking-wider text-[#8b6f47] font-semibold">{course.currency}</span>
            )}
          </div>
          
          {status === "LOCKED" ? (
            <Button
              size="sm"
              variant={config.buttonVariant}
              className={`${config.buttonClass} transition-all duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                if (onLockedClick) {
                  onLockedClick();
                } else {
                  window.location.href = `/course/${course.id}`;
                }
              }}
              data-testid="locked-course-button"
            >
              <config.buttonIcon className="w-4 h-4 mr-1.5" />
              View
            </Button>
          ) : status === "ENROLLED" ? (
            <Link href={`/learn/${course.id}`}>
              <Button
                size="sm"
                variant={config.buttonVariant}
                className={`${config.buttonClass} transition-all duration-200`}
                data-testid="continue-course-button"
              >
                <config.buttonIcon className="w-4 h-4 mr-1.5" />
                Continue
              </Button>
            </Link>
          ) : (
            <Link href={`/course/${course.id}`}>
              <Button
                size="sm"
                variant={config.buttonVariant}
                className={`${config.buttonClass} transition-all duration-200`}
                data-testid="view-course-button"
              >
                <config.buttonIcon className="w-4 h-4 mr-1.5" />
                Enroll Now
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

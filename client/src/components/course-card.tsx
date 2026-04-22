import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Star, Users, Clock, Crown, ShoppingCart } from "lucide-react";

interface CourseCardProps {
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
  };
}

export default function CourseCard({ course }: CourseCardProps) {
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

  return (
    <Card
      className="group hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 ease-in-out overflow-hidden border-primary/5 hover:border-primary/20"
      data-testid={`course-card-${course.id}`}
    >
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
      </div>

      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1.5 group/rating">
            <Star className="w-4 h-4 text-yellow-400 fill-current group-hover/rating:scale-125 transition-transform" />
            <span className="text-sm font-medium text-foreground" data-testid="course-rating">
              {Number(course.avg_rating || 0).toFixed(1)} <span className="text-muted-foreground font-normal">({course.rating_count || 0})</span>
            </span>
          </div>
          {course.category && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold bg-secondary/20" data-testid="category-badge">
              {course.category.name}
            </Badge>
          )}
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

        {/* Capacity indicator */}
        {(course as any).total_capacity && (
          <div className="mb-3">
            {((course as any).total_capacity - (course.enrollment_count || 0)) <= 0 ? (
              <Badge variant="destructive" className="text-xs">Sold Out — Join Waitlist</Badge>
            ) : ((course as any).total_capacity - (course.enrollment_count || 0)) <= 10 ? (
              <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
                Only {(course as any).total_capacity - (course.enrollment_count || 0)} spots left!
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {(course as any).total_capacity - (course.enrollment_count || 0)} spots remaining
              </span>
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
          <Link href={`/course/${course.id}`}>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-105 transition-all duration-300 shadow-md hover:shadow-primary/20"
              data-testid="view-course-button"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Enroll Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

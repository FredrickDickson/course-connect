import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Users, Star } from "lucide-react";
import type { Course } from "@/lib/courses";

const levelColors: Record<string, string> = {
  Beginner: "bg-emerald-100 text-emerald-800",
  Intermediate: "bg-amber-100 text-amber-800",
  Advanced: "bg-rose-100 text-rose-800",
};

const categoryImages: Record<string, string> = {
  Design: "🎨",
  Development: "💻",
  "Data Science": "📊",
  Marketing: "📈",
  Writing: "✍️",
};

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link to={`/course/${course.id}`} className="block group">
      <div className="card-elevated rounded-lg overflow-hidden bg-card border border-border">
        <div className="h-48 bg-primary/5 flex items-center justify-center text-6xl">
          {categoryImages[course.category] || "📚"}
        </div>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {course.category}
            </Badge>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.level]}`}>
              {course.level}
            </span>
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-accent transition-colors">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</span>
            <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{course.lessons} lessons</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.students.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-semibold">{course.rating}</span>
            </div>
            <span className="text-lg font-bold text-foreground">${course.price}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

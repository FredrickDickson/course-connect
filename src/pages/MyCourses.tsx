import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { courses, getEnrolledCourses } from "@/lib/courses";
import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MyCourses = () => {
  const enrolledIds = getEnrolledCourses();
  const enrolledCourses = courses.filter((c) => enrolledIds.includes(c.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16">
        <h1 className="text-3xl font-display font-bold mb-10">My Courses</h1>

        {enrolledCourses.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground text-lg">You haven't enrolled in any courses yet.</p>
            <Link to="/">
              <Button>Browse Courses</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;

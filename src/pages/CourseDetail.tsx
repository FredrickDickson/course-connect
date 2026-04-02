import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { courses, isEnrolled, enrollInCourse, unenrollFromCourse } from "@/lib/courses";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, BookOpen, Users, Star, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find((c) => c.id === id);
  const [enrolled, setEnrolled] = useState(() => course ? isEnrolled(course.id) : false);

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-display font-bold">Course not found</h1>
          <Link to="/" className="text-accent underline mt-4 inline-block">Back to courses</Link>
        </div>
      </div>
    );
  }

  const handleEnroll = () => {
    if (enrolled) {
      unenrollFromCourse(course.id);
      setEnrolled(false);
      toast.info("Unenrolled from " + course.title);
    } else {
      enrollInCourse(course.id);
      setEnrolled(true);
      toast.success("Successfully enrolled in " + course.title + "!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to courses
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{course.category}</Badge>
                <Badge variant="outline">{course.level}</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{course.title}</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">{course.description}</p>
            </div>

            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" />{course.duration}</span>
              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" />{course.lessons} lessons</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4" />{course.students.toLocaleString()} students</span>
              <span className="flex items-center gap-2"><Star className="w-4 h-4 fill-accent text-accent" />{course.rating} rating</span>
            </div>

            {/* Syllabus */}
            <div className="space-y-4">
              <h2 className="text-2xl font-display font-semibold">Syllabus</h2>
              <div className="space-y-3">
                {course.syllabus.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-foreground font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-6 card-elevated">
              <div className="text-center space-y-2">
                <span className="text-4xl font-bold text-foreground">${course.price}</span>
                <p className="text-sm text-muted-foreground">One-time payment · Lifetime access</p>
              </div>

              <Button
                onClick={handleEnroll}
                className="w-full h-12 text-base"
                variant={enrolled ? "outline" : "default"}
              >
                {enrolled ? (
                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Enrolled</>
                ) : (
                  "Enroll Now"
                )}
              </Button>

              <div className="space-y-3 pt-4 border-t border-border text-sm">
                <p className="text-muted-foreground">Instructor</p>
                <p className="font-semibold text-foreground">{course.instructor}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;

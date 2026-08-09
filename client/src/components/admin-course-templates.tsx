/**
 * Admin Course Creation
 * Allows admins to create courses on behalf of instructors
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";

export default function AdminCourseTemplates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#2c2015] font-sf-pro-display">Create Course</h2>
          <p className="text-sm text-[#6b5d4f] font-sf-pro-text">
            Create courses on behalf of instructors. All courses created here will appear in the instructor's dashboard.
          </p>
        </div>
      </div>

      <Card className="bg-white border-[#d4c5b0]/30">
        <CardContent className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-[#8b6f47] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#2c2015] mb-2 font-sf-pro-display">Ready to create a new course?</h3>
          <p className="text-[#6b5d4f] mb-6 font-sf-pro-text">Click the button below to create a course on behalf of an instructor.</p>
          <Button asChild className="bg-[#610000] text-white hover:bg-[#7d0000]">
            <a href="/admin/courses/new">
              <Plus className="h-4 w-4 mr-2" /> Create Course
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

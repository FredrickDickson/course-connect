import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, FileText, Download, Eye, BookOpen, Video, FileArchive, FolderOpen, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import StudentLayout from "@/components/student-layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EnrolledCourse {
  id: string;
  title: string;
  thumbnail_url: string | null;
  resource_count: number;
  video_count: number;
  document_count: number;
}

interface CourseResource {
  id: string;
  name: string;
  resource_type: string;
  file_url: string;
  file_size_mb: number | null;
  lesson_title: string;
  lesson_id: string;
  created_at: string;
}

export default function Library() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch enrolled courses with resource counts
  const { data: courses = [], isLoading: coursesLoading } = useQuery<EnrolledCourse[]>({
    queryKey: ["library-courses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's enrolled courses with details
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          course_id,
          courses!inner(
            id,
            title,
            thumbnail_url
          )
        `)
        .eq("user_id", user.id);
      
      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      // For each course, count resources
      const coursePromises = enrollments.map(async (enrollment: any) => {
        const courseId = enrollment.course_id;
        const course = enrollment.courses;

        // Get modules for this course
        const { data: modules } = await supabase
          .from("modules")
          .select("id")
          .eq("course_id", courseId);

        if (!modules || modules.length === 0) {
          return {
            id: courseId,
            title: course.title,
            thumbnail_url: course.thumbnail_url,
            resource_count: 0,
            video_count: 0,
            document_count: 0,
          };
        }

        const moduleIds = modules.map(m => m.id);

        // Get lessons for these modules
        const { data: lessons } = await supabase
          .from("lessons")
          .select("id")
          .in("module_id", moduleIds);

        if (!lessons || lessons.length === 0) {
          return {
            id: courseId,
            title: course.title,
            thumbnail_url: course.thumbnail_url,
            resource_count: 0,
            video_count: 0,
            document_count: 0,
          };
        }

        const lessonIds = lessons.map(l => l.id);

        // Get resource counts
        const { data: resources } = await supabase
          .from("lesson_resources")
          .select("resource_type")
          .in("lesson_id", lessonIds);

        const videoTypes = ['video'];
        const documentTypes = ['pdf', 'doc', 'ppt', 'xls'];

        return {
          id: courseId,
          title: course.title,
          thumbnail_url: course.thumbnail_url,
          resource_count: resources?.length || 0,
          video_count: resources?.filter(r => videoTypes.includes(r.resource_type)).length || 0,
          document_count: resources?.filter(r => documentTypes.includes(r.resource_type)).length || 0,
        };
      });

      return Promise.all(coursePromises);
    },
    enabled: !!user?.id,
  });

  // Fetch resources for selected course
  const { data: courseResources = [], isLoading: resourcesLoading } = useQuery<CourseResource[]>({
    queryKey: ["course-resources", selectedCourse, typeFilter, searchQuery],
    queryFn: async () => {
      if (!selectedCourse) return [];

      // Get modules for this course
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", selectedCourse);

      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map(m => m.id);

      // Get lessons
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id, title")
        .in("module_id", moduleIds);

      if (!lessons || lessons.length === 0) return [];

      const lessonIds = lessons.map(l => l.id);

      // Get resources
      let query = supabase
        .from("lesson_resources")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: false });

      if (typeFilter !== "all") {
        query = query.eq("resource_type", typeFilter);
      }

      const { data: resources } = await query;

      if (!resources) return [];

      // Map with lesson info
      const enriched = resources.map((resource: any) => {
        const lesson = lessons.find(l => l.id === resource.lesson_id);
        return {
          id: resource.id,
          name: resource.name,
          resource_type: resource.resource_type,
          file_url: resource.file_url,
          file_size_mb: resource.file_size_mb,
          lesson_title: lesson?.title || "Unknown Lesson",
          lesson_id: resource.lesson_id,
          created_at: resource.created_at,
        };
      });

      // Apply search filter
      if (searchQuery.trim()) {
        return enriched.filter(r =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.lesson_title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return enriched;
    },
    enabled: !!selectedCourse,
  });

  const getFileIcon = (resourceType: string) => {
    const type = resourceType?.toLowerCase() || '';
    if (type === 'video') return Video;
    if (type === 'pdf' || type === 'doc') return FileText;
    if (type === 'zip' || type === 'rar') return FileArchive;
    return FileText;
  };

  const getFileTypeBadge = (resourceType: string): string => {
    const type = resourceType?.toLowerCase() || '';
    if (type === 'pdf') return 'PDF';
    if (type === 'doc' || type === 'docx') return 'DOC';
    if (type === 'ppt' || type === 'pptx') return 'PPT';
    if (type === 'xls' || type === 'xlsx') return 'XLS';
    if (type === 'video') return 'VIDEO';
    if (type === 'audio') return 'AUDIO';
    if (type === 'image') return 'IMAGE';
    if (type === 'link') return 'LINK';
    if (type === 'zip' || type === 'rar') return 'ZIP';
    return 'FILE';
  };

  const formatFileSize = (sizeMb: number | null): string => {
    if (!sizeMb) return '';
    if (sizeMb < 1) return `${(sizeMb * 1024).toFixed(0)} KB`;
    return `${sizeMb.toFixed(1)} MB`;
  };

  const handleDownload = async (resource: CourseResource) => {
    if (!resource.file_url) return;

    try {
      if (resource.file_url.startsWith('http')) {
        window.open(resource.file_url, '_blank');
      } else {
        const { data, error } = await supabase.storage
          .from('lesson-resources')
          .createSignedUrl(resource.file_url, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          const link = document.createElement('a');
          link.href = data.signedUrl;
          link.download = resource.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handlePreview = async (resource: CourseResource) => {
    if (!resource.file_url) return;

    try {
      if (resource.file_url.startsWith('http')) {
        window.open(resource.file_url, '_blank');
      } else {
        const { data, error } = await supabase.storage
          .from('lesson-resources')
          .createSignedUrl(resource.file_url, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  return (
    <StudentLayout>
      {/* Header Section */}
      <div className="bg-[#5A2633] text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#B49A67] uppercase tracking-wider mb-2">
              RESOURCE LIBRARY
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Your Course Materials
            </h1>
            <p className="text-base text-white/90 max-w-3xl">
              Access all resources, documents, and videos from your enrolled courses in one place
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-[#F5F1E8] min-h-screen py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {coursesLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#B49A67] border-r-transparent"></div>
              <p className="mt-4 text-[#4A4A4A]">Loading your courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-[#E8E4DC] shadow-sm">
              <BookOpen className="h-16 w-16 mx-auto text-[#D1CEC7] mb-4" />
              <h3 className="text-lg font-semibold text-[#252525] mb-2">No Courses Yet</h3>
              <p className="text-[#4A4A4A] mb-6">
                Enroll in courses to access their resources and materials
              </p>
              <Link href="/course-catalog">
                <Button className="bg-[#5A2633] hover:bg-[#3D1A22] text-white">
                  Browse Courses
                </Button>
              </Link>
            </div>
          ) : !selectedCourse ? (
            /* Course Selection View */
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[#252525] mb-4">Select a Course</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <Card
                    key={course.id}
                    className="cursor-pointer hover:shadow-lg hover:border-[#B49A67] transition-all group"
                    onClick={() => setSelectedCourse(course.id)}
                  >
                    <CardContent className="p-6">
                      {course.thumbnail_url && (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-40 object-cover rounded-lg mb-4"
                        />
                      )}
                      <h3 className="text-lg font-semibold text-[#252525] mb-3 group-hover:text-[#5A2633] transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-[#6B6761]">
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-[#B49A67]" />
                          <span>{course.document_count} docs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4 text-[#B49A67]" />
                          <span>{course.video_count} videos</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#E8E4DC]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#4A4A4A] font-medium">
                            {course.resource_count} total resources
                          </span>
                          <ChevronRight className="h-5 w-5 text-[#B49A67] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Resources View for Selected Course */
            <div className="space-y-6">
              {/* Back Button and Course Info */}
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedCourse(null)}
                  className="border-[#D1CEC7] text-[#5A2633] hover:bg-[#F5F1E8]"
                >
                  ← Back to Courses
                </Button>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-[#252525]">
                    {courses.find(c => c.id === selectedCourse)?.title}
                  </h2>
                  <p className="text-sm text-[#6B6761]">
                    {courseResources.length} resources available
                  </p>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg border border-[#E8E4DC] shadow-sm">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6761]" />
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761]"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-white border-[#D1CEC7] text-[#252525]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="pdf">PDF Documents</SelectItem>
                    <SelectItem value="doc">Word Documents</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="link">External Links</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resources List */}
              {resourcesLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#B49A67] border-r-transparent"></div>
                  <p className="mt-4 text-[#4A4A4A]">Loading resources...</p>
                </div>
              ) : courseResources.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-[#E8E4DC] shadow-sm">
                  <FolderOpen className="h-12 w-12 mx-auto text-[#D1CEC7] mb-4" />
                  <p className="text-[#4A4A4A]">
                    {searchQuery || typeFilter !== "all"
                      ? "No resources found matching your filters"
                      : "No resources available for this course yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {courseResources.map((resource) => {
                    const FileIcon = getFileIcon(resource.resource_type);
                    return (
                      <div
                        key={resource.id}
                        className="bg-white border border-[#E8E4DC] rounded-lg p-5 hover:border-[#B49A67] hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#F5F1E8] flex items-center justify-center group-hover:bg-[#5A2633] transition-colors">
                            <FileIcon className="h-6 w-6 text-[#5A2633] group-hover:text-white transition-colors" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <h3 className="text-[#252525] font-semibold text-base mb-1 group-hover:text-[#5A2633] transition-colors">
                                  {resource.name}
                                </h3>
                                <p className="text-[#6B6761] text-sm">
                                  From: {resource.lesson_title}
                                </p>
                              </div>
                              <Badge className="bg-[#5A2633] text-white border-0 text-xs font-semibold hover:bg-[#3D1A22]">
                                {getFileTypeBadge(resource.resource_type)}
                              </Badge>
                            </div>
                            {resource.file_size_mb && (
                              <p className="text-xs text-[#6B6761]">
                                File size: {formatFileSize(resource.file_size_mb)}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {(resource.resource_type === 'pdf' || resource.resource_type === 'link' || resource.resource_type === 'video') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(resource)}
                                className="text-[#5A2633] hover:text-white hover:bg-[#5A2633] border-[#D1CEC7]"
                              >
                                <Eye className="h-4 w-4 mr-1.5" />
                                Preview
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleDownload(resource)}
                              className="bg-[#B49A67] text-white hover:bg-[#9A8356] border-0 shadow-sm"
                            >
                              <Download className="h-4 w-4 mr-1.5" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

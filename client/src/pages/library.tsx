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
import { Search, FileText, Download, Eye } from "lucide-react";
import StudentLayout from "@/components/student-layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LibraryResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  file_type: string;
  source: string;
  course_title?: string;
  file_url?: string;
  created_at: string;
}

export default function Library() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");

  // Fetch all library resources from enrolled courses
  const { data: resources = [], isLoading } = useQuery<LibraryResource[]>({
    queryKey: ["library-resources", user?.id, searchQuery, typeFilter, courseFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);
      
      if (enrollError) throw enrollError;
      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map(e => e.course_id);

      // Get all modules from enrolled courses
      const { data: modules, error: modulesError } = await supabase
        .from("modules")
        .select("id, course_id, courses!inner(title)")
        .in("course_id", courseIds);
      
      if (modulesError) throw modulesError;
      if (!modules || modules.length === 0) return [];

      const moduleIds = modules.map(m => m.id);

      // Get all lessons from these modules
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, title, module_id")
        .in("module_id", moduleIds);
      
      if (lessonsError) throw lessonsError;
      if (!lessons || lessons.length === 0) return [];

      const lessonIds = lessons.map(l => l.id);

      // Get all lesson resources
      let query = supabase
        .from("lesson_resources")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("created_at", { ascending: false });

      // Apply type filter
      if (typeFilter !== "all") {
        query = query.eq("resource_type", typeFilter);
      }

      const { data: lessonResources, error: resourcesError } = await query;
      
      if (resourcesError) throw resourcesError;

      // Map resources with course info
      const enrichedResources: LibraryResource[] = (lessonResources || []).map((resource: any) => {
        const lesson = lessons.find(l => l.id === resource.lesson_id);
        const module = modules.find(m => m.id === lesson?.module_id);
        
        return {
          id: resource.id,
          title: resource.name || resource.title,
          description: `From: ${lesson?.title || 'Unknown Lesson'}`,
          resource_type: resource.resource_type || 'other',
          file_type: getFileType(resource.resource_type),
          source: `Source: ${(module?.courses as any)?.title || 'Unknown Course'}`,
          course_title: (module?.courses as any)?.title,
          file_url: resource.file_url,
          created_at: resource.created_at,
        };
      });

      // Apply search filter
      if (searchQuery.trim()) {
        return enrichedResources.filter(r =>
          r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.source.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply course filter
      if (courseFilter !== "all") {
        return enrichedResources.filter(r => r.course_title === courseFilter);
      }

      return enrichedResources;
    },
    enabled: !!user?.id,
  });

  // Get unique courses for filter dropdown
  const uniqueCourses = Array.from(new Set(resources.map(r => r.course_title).filter(Boolean)));

  const getFileType = (resourceType: string): string => {
    const type = resourceType?.toLowerCase() || '';
    if (type === 'pdf') return 'PDF';
    if (type === 'doc' || type === 'docx') return 'DOC';
    if (type === 'ppt' || type === 'pptx') return 'PPT';
    if (type === 'xls' || type === 'xlsx') return 'XLS';
    if (type === 'video') return 'VID';
    if (type === 'audio') return 'AUD';
    if (type === 'image') return 'IMG';
    if (type === 'link') return 'LINK';
    return 'FILE';
  };

  const handleDownload = async (resource: LibraryResource) => {
    if (!resource.file_url) return;

    try {
      if (resource.file_url.startsWith('http')) {
        // External URL - open in new tab
        window.open(resource.file_url, '_blank');
      } else {
        // Supabase storage - create signed URL
        const { data, error } = await supabase.storage
          .from('lesson-resources')
          .createSignedUrl(resource.file_url, 3600);
        
        if (error) throw error;
        if (data?.signedUrl) {
          const link = document.createElement('a');
          link.href = data.signedUrl;
          link.download = resource.title;
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

  const handlePreview = async (resource: LibraryResource) => {
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
      {/* Header Section - Official CIMA Light Colors */}
      <div className="bg-[#5A2633] text-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#B49A67] uppercase tracking-wider mb-2">
              RESOURCE LIBRARY
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Readings, recordings and tools
            </h1>
            <p className="text-base text-white/90 max-w-3xl">
              Search every resource across CIMA Learn courses. Resources in courses you are not
              enrolled in show their details, open them from within the course.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6761]" />
              <Input
                placeholder="Search titles, sources and courses"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#D1CEC7] text-[#252525] placeholder:text-[#6B6761] focus:border-[#B49A67] focus:ring-[#B49A67] h-11"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-[#D1CEC7] text-[#252525] h-11">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D1CEC7] text-[#252525]">
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="doc">Documents</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="link">Links</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white border-[#D1CEC7] text-[#252525] h-11">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#D1CEC7] text-[#252525]">
                <SelectItem value="all">All courses</SelectItem>
                {uniqueCourses.map((course) => (
                  <SelectItem key={course} value={course!}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Resources List - Official CIMA Light Colors */}
      <div className="bg-[#F5F1E8] min-h-screen py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#B49A67] border-r-transparent"></div>
              <p className="mt-4 text-[#4A4A4A]">Loading resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-[#E8E4DC] shadow-sm">
              <FileText className="h-12 w-12 mx-auto text-[#D1CEC7] mb-4" />
              <p className="text-[#4A4A4A]">
                {searchQuery || typeFilter !== "all" || courseFilter !== "all"
                  ? "No resources found matching your filters"
                  : "No resources available yet"}
              </p>
            </div>
          ) : (
            resources.map((resource) => (
              <div
                key={resource.id}
                className="bg-white border border-[#E8E4DC] rounded-lg p-5 hover:border-[#B49A67] hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* File Type Badge */}
                  <div className="flex-shrink-0">
                    <Badge className="bg-[#5A2633] text-white border-0 text-xs font-semibold px-2.5 py-1 hover:bg-[#3D1A22]">
                      {resource.file_type}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[#252525] font-semibold text-base mb-1 group-hover:text-[#5A2633] transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-[#4A4A4A] text-sm mb-2">{resource.description}</p>
                    <p className="text-[#6B6761] text-xs">{resource.source}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {(resource.resource_type === 'pdf' || resource.resource_type === 'link') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(resource)}
                        className="text-[#5A2633] hover:text-white hover:bg-[#5A2633] border-[#D1CEC7] h-9 transition-all"
                      >
                        <Eye className="h-4 w-4 mr-1.5" />
                        Preview
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleDownload(resource)}
                      className="bg-[#B49A67] text-white hover:bg-[#9A8356] border-0 h-9 shadow-sm hover:shadow transition-all"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StudentLayout>
  );
}

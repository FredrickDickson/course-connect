import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentLayout from "@/components/student-layout";
import { LectureContentEditor } from "@/components/LectureContentEditor";
import { LecturePreview } from "@/components/LecturePreview";
import { PublishCourseDialog } from "@/components/PublishCourseDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Video,
  FileText,
  ClipboardList,
  Upload,
  File,
  ChevronDown,
  ChevronRight,
  Play,
  Eye,
  Rocket,
  Presentation,
} from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  contentType: "video" | "text" | "quiz" | "assignment" | "presentation";
  videoUrl?: string;
  videoPlatform?: "youtube" | "vimeo";
  videoId?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxStatus?: string;
  content?: string;
  duration?: number;
  order: number;
  resources: Resource[];
}

interface Resource {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
}

// Sortable Module Component
function SortableModule({ module, moduleIndex, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

// Sortable Lesson Component
function SortableLesson({ lesson, lessonIndex, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}

const QUERY_KEY = "curriculum-modules";

export default function CourseCurriculum() {
  const [, instructorParams] = useRoute("/instructor/courses/:courseId/curriculum");
  const [, adminParams] = useRoute("/admin/courses/:courseId/curriculum");
  const courseId = instructorParams?.courseId || adminParams?.courseId;
  const isAdminRoute = window.location.pathname.startsWith("/admin");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDesc, setNewModuleDesc] = useState("");

  const [lectureEditorOpen, setLectureEditorOpen] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  // Fetch course curriculum directly from Supabase
  const { data: modules = [], isLoading } = useQuery<Module[]>({
    queryKey: [QUERY_KEY, courseId],
    queryFn: async () => {
      const { data: modulesData, error: modErr } = await supabase
        .from("modules")
        .select('id, title, description, "order"')
        .eq("course_id", courseId!)
        .order("order");
      if (modErr) throw modErr;

      // Only fetch lessons if there are modules
      let lessonsData: any[] = [];
      if (modulesData && modulesData.length > 0) {
        const { data: lessons, error: lesErr } = await supabase
          .from("lessons")
          .select(
            'id, title, description, content_type, content, video_url, video_platform, video_id, mux_asset_id, mux_playback_id, mux_status, duration_seconds, "order", module_id',
          )
          .in(
            "module_id",
            modulesData.map((m) => m.id),
          )
          .order("order");
        if (lesErr) throw lesErr;
        lessonsData = lessons || [];
      }

      return (modulesData || []).map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description || "",
        order: m.order,
        lessons: (lessonsData || [])
          .filter((l) => l.module_id === m.id)
          .map((l) => ({
            id: l.id,
            title: l.title,
            description: l.description || "",
            contentType: (l.content_type || "video") as any,
            videoUrl: l.video_url || undefined,
            videoPlatform: (l.video_platform || undefined) as any,
            videoId: l.video_id || undefined,
            muxAssetId: l.mux_asset_id || undefined,
            muxPlaybackId: l.mux_playback_id || undefined,
            muxStatus: l.mux_status || undefined,
            content: l.content || undefined,
            duration: l.duration_seconds || undefined,
            order: l.order,
            resources: [],
          })),
      }));
    },
    enabled: !!courseId,
  });

  // Fetch course details
  const { data: courseDetails } = useQuery<{
    isPublished: boolean;
    title: string;
  }>({
    queryKey: ["course-details", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("is_published, title")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return { isPublished: data.is_published || false, title: data.title };
    },
    enabled: !!courseId,
  });

  const totalDuration = modules.reduce((total, module) => {
    const moduleDuration =
      module.lessons?.reduce(
        (sum, lesson) => sum + (lesson.duration || 0),
        0,
      ) || 0;
    return total + moduleDuration;
  }, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Add module
  const addModuleMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const { error } = await (supabase as any).rpc("create_module", {
        _course_id: courseId!,
        _title: data.title,
        _description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
      toast({ title: "Section added successfully!" });
      setIsAddingModule(false);
      setNewModuleTitle("");
      setNewModuleDesc("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add section",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete module
  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      // Delete module first - database CASCADE will handle lessons
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
      toast({ title: "Section deleted" });
    },
  });

  // Delete lesson
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
      toast({ title: "Lecture deleted" });
    },
  });

  // Reorder modules
  const reorderModulesMutation = useMutation({
    mutationFn: async (moduleOrder: string[]) => {
      const updates = moduleOrder.map((id, index) =>
        supabase
          .from("modules")
          .update({ order: index + 1 })
          .eq("id", id),
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
      toast({ title: "Failed to reorder sections", variant: "destructive" });
    },
  });

  // Reorder lessons
  const reorderLessonsMutation = useMutation({
    mutationFn: async ({
      moduleId,
      lessonOrder,
    }: {
      moduleId: string;
      lessonOrder: string[];
    }) => {
      const updates = lessonOrder.map((id, index) =>
        supabase
          .from("lessons")
          .update({ order: index + 1 })
          .eq("id", id),
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
      toast({ title: "Failed to reorder lectures", variant: "destructive" });
    },
  });

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      const newModules = arrayMove(modules, oldIndex, newIndex);
      const previousModules = [...modules];
      queryClient.setQueryData([QUERY_KEY, courseId], newModules);
      reorderModulesMutation.mutate(newModules.map((m) => m.id), {
        onError: () => {
          queryClient.setQueryData([QUERY_KEY, courseId], previousModules);
        },
      });
    }
  };

  const handleLessonDragEnd = (moduleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const module = modules.find((m) => m.id === moduleId);
      if (!module || !module.lessons) return;
      const oldIndex = module.lessons.findIndex((l) => l.id === active.id);
      const newIndex = module.lessons.findIndex((l) => l.id === over.id);
      const newLessons = arrayMove(module.lessons, oldIndex, newIndex);
      const newModules = modules.map((m) =>
        m.id === moduleId ? { ...m, lessons: newLessons } : m,
      );
      const previousModules = [...modules];
      queryClient.setQueryData([QUERY_KEY, courseId], newModules);
      reorderLessonsMutation.mutate({
        moduleId,
        lessonOrder: newLessons.map((l) => l.id),
      }, {
        onError: () => {
          queryClient.setQueryData([QUERY_KEY, courseId], previousModules);
        },
      });
    }
  };

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleAddModule = () => {
    if (!newModuleTitle.trim()) {
      toast({ title: "Section title is required", variant: "destructive" });
      return;
    }
    addModuleMutation.mutate({
      title: newModuleTitle,
      description: newModuleDesc,
    });
  };

  const handleAddLecture = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setEditingLesson(null);
    setLectureEditorOpen(true);
  };

  const handleEditLecture = (lesson: Lesson, moduleId: string) => {
    setCurrentModuleId(moduleId);
    setEditingLesson(lesson);
    setLectureEditorOpen(true);
  };

  const handlePreviewLecture = (lesson: Lesson) => {
    setPreviewLesson(lesson);
    setPreviewOpen(true);
  };

  const handleLectureSaved = () => {
    setLectureEditorOpen(false);
    setEditingLesson(null);
    setCurrentModuleId(null);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY, courseId] });
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-[#5A2633] border-t-transparent rounded-full" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#2c2015] font-display">Curriculum Builder</h1>
              <p className="text-[#6b5d4f] font-body mt-2">
                Build your course content with sections and lectures
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm font-medium text-[#2c2015]">
                  {modules.length} Section{modules.length !== 1 ? "s" : ""}
                </span>
                <span className="text-[#8b6f47]">•</span>
                <span className="text-sm font-medium text-[#2c2015]">
                  {modules.reduce(
                    (total, m) => total + (m.lessons?.length || 0),
                    0,
                  )}{" "}
                  Lecture
                  {modules.reduce(
                    (total, m) => total + (m.lessons?.length || 0),
                    0,
                  ) !== 1
                    ? "s"
                    : ""}
                </span>
                {totalDuration > 0 && (
                  <>
                    <span className="text-[#8b6f47]">•</span>
                    <span className="text-sm font-medium text-[#2c2015]">
                      {formatDuration(totalDuration)} total duration
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={courseDetails?.isPublished ? "outline" : "default"}
                onClick={() => setPublishDialogOpen(true)}
                data-testid="button-publish-course"
                className={courseDetails?.isPublished ? "border-[#5A2633] text-[#5A2633] hover:bg-[#5A2633] hover:text-white" : "bg-[#5A2633] text-white hover:bg-[#5A2633]"}
              >
                <Rocket className="w-4 h-4 mr-2" />
                {courseDetails?.isPublished
                  ? "Unpublish Course"
                  : "Publish Course"}
              </Button>
              <Link href={isAdminRoute ? "/admin" : "/instructor"}>
                <Button variant="outline" className="border-[#d4c5b0]/50 text-[#5A2633] hover:bg-[#f5f3ed] hover:border-[#5A2633]">← Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-[#5A2633]/5 border-[#5A2633]/20">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="bg-[#5A2633] rounded-full p-2">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-[#2c2015] font-display">
                  How to structure your course
                </h3>
                <p className="text-sm text-[#6b5d4f] font-body">
                  Organize your course into <strong>sections</strong> (modules)
                  and <strong>lectures</strong>. Each lecture can be a video,
                  article, quiz, or assignment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Curriculum Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleModuleDragEnd}
        >
          <SortableContext
            items={modules.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {modules.map((module, moduleIndex) => (
                <SortableModule
                  key={module.id}
                  module={module}
                  moduleIndex={moduleIndex}
                >
                  {({ attributes, listeners }: any) => (
                    <Card className="border-l-4 border-l-[#5A2633] bg-white border-[#d4c5b0]/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div
                              {...attributes}
                              {...listeners}
                              className="cursor-move"
                            >
                              <GripVertical className="h-5 w-5 text-[#8b6f47]" />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleModule(module.id)}
                              className="p-0 h-auto hover:bg-[#f5f3ed]"
                            >
                              {expandedModules.has(module.id) ? (
                                <ChevronDown className="h-5 w-5 text-[#5A2633]" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-[#5A2633]" />
                              )}
                            </Button>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-sm text-[#8b6f47] font-body">
                                  Section {moduleIndex + 1}:
                                </span>
                                <h3 className="font-bold text-[#2c2015] font-display">{module.title}</h3>
                              </div>
                              {module.description && (
                                <p className="text-sm text-[#6b5d4f] mt-1 font-body">
                                  {module.description}
                                </p>
                              )}
                              <p className="text-xs text-[#8b6f47] mt-1">
                                {module.lessons?.length || 0} lectures
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteModuleMutation.mutate(module.id)
                              }
                              className="text-[#5A2633] hover:text-[#5A2633] hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {expandedModules.has(module.id) && (
                        <CardContent className="pt-0">
                          <div className="ml-8 space-y-2">
                            {module.lessons && module.lessons.length > 0 ? (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleLessonDragEnd(module.id)}
                              >
                                <SortableContext
                                  items={module.lessons.map((l) => l.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {module.lessons.map((lesson, lessonIndex) => (
                                    <SortableLesson
                                      key={lesson.id}
                                      lesson={lesson}
                                      lessonIndex={lessonIndex}
                                    >
                                      {({ attributes, listeners }: any) => (
                                        <div className="flex items-center justify-between p-3 bg-[#f5f3ed] rounded-lg hover:bg-[#d4c5b0]/20 transition-colors border border-[#d4c5b0]/30">
                                          <div className="flex items-center space-x-3 flex-1">
                                            <div
                                              {...attributes}
                                              {...listeners}
                                              className="cursor-move"
                                            >
                                              <GripVertical className="h-4 w-4 text-[#8b6f47]" />
                                            </div>
                                            {lesson.contentType === "video" && (
                                              <Play className="h-4 w-4 text-[#5A2633]" />
                                            )}
                                            {lesson.contentType === "text" && (
                                              <FileText className="h-4 w-4 text-[#5A2633]" />
                                            )}
                                            {lesson.contentType === "quiz" && (
                                              <ClipboardList className="h-4 w-4 text-[#5A2633]" />
                                            )}
                                            {lesson.contentType ===
                                              "assignment" && (
                                              <FileText className="h-4 w-4 text-[#5A2633]" />
                                            )}
                                            {lesson.contentType ===
                                              "presentation" && (
                                              <Presentation className="h-4 w-4 text-[#5A2633]" />
                                            )}
                                            <div className="flex-1">
                                              <p className="font-medium text-sm text-[#2c2015]">
                                                Lecture {lessonIndex + 1}:{" "}
                                                {lesson.title}
                                              </p>
                                              {lesson.duration && (
                                                <p className="text-xs text-[#8b6f47]">
                                                  {Math.floor(
                                                    lesson.duration / 60,
                                                  )}
                                                  :
                                                  {String(
                                                    lesson.duration % 60,
                                                  ).padStart(2, "0")}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handlePreviewLecture(lesson)
                                              }
                                              className="text-[#5A2633] hover:text-[#5A2633] hover:bg-[#f5f3ed]"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleEditLecture(
                                                  lesson,
                                                  module.id,
                                                )
                                              }
                                              className="text-[#5A2633] hover:text-[#5A2633] hover:bg-[#f5f3ed]"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                deleteLessonMutation.mutate(
                                                  lesson.id,
                                                )
                                              }
                                              className="text-[#5A2633] hover:text-[#5A2633] hover:bg-red-50"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </SortableLesson>
                                  ))}
                                </SortableContext>
                              </DndContext>
                            ) : (
                              <p className="text-sm text-[#8b6f47] italic py-4">
                                No lectures yet. Add your first lecture below.
                              </p>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 border-[#d4c5b0]/50 text-[#5A2633] hover:bg-[#f5f3ed] hover:border-[#5A2633]"
                              onClick={() => handleAddLecture(module.id)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Lecture
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </SortableModule>
              ))}

              {isAddingModule ? (
                <Card className="border-dashed border-2 border-[#d4c5b0] bg-white">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="module-title" className="text-[#2c2015]">Section Title *</Label>
                        <Input
                          id="module-title"
                          placeholder="e.g., Introduction to Mediation"
                          value={newModuleTitle}
                          onChange={(e) => setNewModuleTitle(e.target.value)}
                          className="border-[#d4c5b0]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="module-desc" className="text-[#2c2015]">
                          Section Description (optional)
                        </Label>
                        <Textarea
                          id="module-desc"
                          placeholder="What will students learn in this section?"
                          rows={3}
                          value={newModuleDesc}
                          onChange={(e) => setNewModuleDesc(e.target.value)}
                          className="border-[#d4c5b0]"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAddModule}
                          disabled={addModuleMutation.isPending}
                          className="bg-[#5A2633] text-white hover:bg-[#5A2633]"
                        >
                          {addModuleMutation.isPending
                            ? "Adding..."
                            : "Add Section"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddingModule(false)}
                          className="border-[#d4c5b0]/50 text-[#5A2633] hover:bg-[#f5f3ed] hover:border-[#5A2633]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-dashed border-2 border-[#d4c5b0] text-[#5A2633] hover:bg-[#f5f3ed] hover:border-[#5A2633]"
                  onClick={() => setIsAddingModule(true)}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Section
                </Button>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {courseId && currentModuleId && (
        <LectureContentEditor
          open={lectureEditorOpen}
          onOpenChange={setLectureEditorOpen}
          courseId={courseId}
          moduleId={currentModuleId}
          lesson={editingLesson || undefined}
          onSave={handleLectureSaved}
        />
      )}

      {previewLesson && (
        <LecturePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          lessonId={previewLesson.id}
          lessonTitle={previewLesson.title}
          lessonType={previewLesson.contentType}
        />
      )}

      {courseId && (
        <PublishCourseDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
          courseId={courseId}
          isPublished={courseDetails?.isPublished || false}
        />
      )}
    </StudentLayout>
  );
}

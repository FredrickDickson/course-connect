import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import StudentLayout from "@/components/student-layout";
import { ArrowLeft, Save, BookOpen, Plus, Shield, Trash2, Lock } from "lucide-react";
import { Link } from "wouter";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";

const CUSTOM_CATEGORY_VALUE = "__custom__";

// Instructor schema for admin course creation
const instructorSchema = z.object({
  // Set when this entry represents an instructor already linked to the
  // course being edited (existing account OR a previously-created
  // admin-managed one) — tells the server whether to sync bio/photo or
  // leave a real self-managed instructor's profile untouched.
  userId: z.string().optional(),
  name: z.string().min(1, "Instructor name is required"),
  title: z.string().optional(),
  bio: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  profileImageUrl: z.string().url().optional().or(z.literal("")),
  expertise: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

const courseSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    subtitle: z.string().min(1, "Subtitle is required").max(200),
    description: z.string().min(10, "Description must be at least 10 characters"),
    categoryId: z.string().min(1, "Category is required"),
    programmeType: z.enum(["PROFESSIONAL_PROGRAMME", "ADJUNCT_COURSE"]),
    level: z.enum(["associate", "member", "fellow"]).optional(),
    track: z.enum(["ARBITRATION", "MEDIATION"]).optional(),
    price: z.number().min(0, "Price must be non-negative"),
    currency: z.string().default("USD"),
    thumbnailUrl: z.string().url().optional().or(z.literal("")),
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    // For admin: instructor details (optional array, but if provided must have items)
    instructors: z.array(instructorSchema).optional(),
  })
  .superRefine((data, ctx) => {
    // Level/track only apply to the Professional Programme (Associate/Member/
    // Fellow ladder). Adjunct Courses are standalone - no level, no track.
    if (data.programmeType === "PROFESSIONAL_PROGRAMME") {
      if (!data.level) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Difficulty level is required for Professional Programme courses",
          path: ["level"],
        });
      }
      if (!data.track) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Qualification track is required for Professional Programme courses",
          path: ["track"],
        });
      }
    }
  });

type CourseFormData = z.infer<typeof courseSchema>;
// isAdminManaged is a client-only UI flag (stripped before submit) marking
// whether an already-linked instructor is safe to edit bio/photo for here.
type InstructorFormData = z.infer<typeof instructorSchema> & { isAdminManaged?: boolean };

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreateCourse() {
  const { isLoading: authLoading, hasAccess } = useRoleProtection({
    requiredRole: "instructor",
  });
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Admin context: instructor details for direct input
  const [instructors, setInstructors] = useState<InstructorFormData[]>([
    { name: "", title: "", bio: "", email: "", profileImageUrl: "", expertise: [], linkedinUrl: "", websiteUrl: "" }
  ]);
  const isAdmin = user?.role === "admin";
  const [isRouteAdmin, setIsRouteAdmin] = useState(false);

  // Edit mode detection for instructor and admin routes
  const [, instructorEditParams] = useRoute("/instructor/courses/:courseId/edit");
  const [, adminEditParams] = useRoute("/admin/courses/:courseId/edit");
  const courseId = instructorEditParams?.courseId || adminEditParams?.courseId;
  const isEditMode = !!courseId;

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: hasAccess,
  });

  // Fetch course data in edit mode
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode && !!courseId,
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      description: "",
      categoryId: "",
      programmeType: "PROFESSIONAL_PROGRAMME",
      level: "associate",
      track: "ARBITRATION",
      price: 0,
      currency: "USD",
      thumbnailUrl: "",
      isPublished: false,
      isFeatured: false,
      instructors: [],
    },
  });

  useEffect(() => {
    const path = window.location.pathname;
    setIsRouteAdmin(path.startsWith("/admin"));
  }, []);

  useEffect(() => {
    if (courseData) {
      form.reset({
        title: courseData.title || "",
        subtitle: courseData.subtitle || "",
        description: courseData.description || "",
        categoryId: courseData.category_id || "",
        level: (courseData.level as "associate" | "member" | "fellow") || "associate",
        track: (courseData.track as "ARBITRATION" | "MEDIATION") || "ARBITRATION",
        price: Number(courseData.price) || 0,
        currency: courseData.currency || "USD",
        thumbnailUrl: courseData.thumbnail_url || "",
        isPublished: courseData.is_published || false,
        isFeatured: courseData.is_featured || false,
      });
    }
  }, [courseData, form]);

  // Edit mode: load the course's credited instructors (course_instructors,
  // falling back to the single legacy instructor_id join for courses saved
  // before multi-instructor support existed) so the admin form doesn't open
  // blank and re-saving doesn't wipe out title/expertise/links.
  const { data: existingCourseInstructors } = useQuery({
    queryKey: ["course-instructors", courseId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_instructors")
        .select("user_id, sort_order, instructor:users!course_instructors_user_id_fkey(id, first_name, last_name, email, bio, profile_image_url, created_by_admin_id)")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isAdmin && isEditMode && !!courseId,
  });

  const instructorIds = (existingCourseInstructors || []).map((r) => r.user_id);
  const { data: instructorProfilesById } = useQuery({
    queryKey: ["instructor-profiles-for-course", courseId, instructorIds.join(",")],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("instructor_profiles")
        .select("*")
        .in("user_id", instructorIds);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: isAdmin && isEditMode && instructorIds.length > 0,
  });

  // Legacy fallback for courses saved before course_instructors existed.
  const { data: legacyInstructorUser } = useQuery({
    queryKey: ["legacy-course-instructor", courseData?.instructor_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("users")
        .select("id, first_name, last_name, email, bio, profile_image_url, created_by_admin_id")
        .eq("id", courseData!.instructor_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled:
      isAdmin && isEditMode && !!courseData?.instructor_id &&
      (existingCourseInstructors?.length ?? 0) === 0,
  });

  useEffect(() => {
    if (!isAdmin || !isEditMode) return;
    const rows = existingCourseInstructors && existingCourseInstructors.length > 0
      ? existingCourseInstructors
      : legacyInstructorUser
        ? [{ user_id: legacyInstructorUser.id, instructor: legacyInstructorUser }]
        : null;
    if (!rows) return;

    setInstructors(rows.map((row: any) => {
      const p = (instructorProfilesById || []).find((ip: any) => ip.user_id === row.user_id);
      return {
        userId: row.instructor.id,
        name: `${row.instructor.first_name || ""} ${row.instructor.last_name || ""}`.trim(),
        title: p?.title || "",
        bio: row.instructor.bio || "",
        email: row.instructor.email || "",
        profileImageUrl: row.instructor.profile_image_url || "",
        expertise: p?.expertise || [],
        linkedinUrl: p?.linkedin_url || "",
        websiteUrl: p?.website_url || "",
        isAdminManaged: !!row.instructor.created_by_admin_id,
      };
    }));
  }, [existingCourseInstructors, legacyInstructorUser, instructorProfilesById, isAdmin, isEditMode]);

  const saveCourse = useMutation({
    mutationFn: async (data: CourseFormData) => {
      if (!user) throw new Error("Not authenticated");

      let categoryId = data.categoryId;

      // If custom category, create it first via backend
      if (categoryId === CUSTOM_CATEGORY_VALUE && customCategory.trim()) {
        const slug = customCategory
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        const catRes = await apiRequest("POST", "/api/categories", {
          name: customCategory.trim(),
          slug,
          description: null,
        });
        const newCat = await catRes.json();
        categoryId = newCat.id;
      }

      const payload = {
        title: data.title,
        subtitle: data.subtitle,
        description: data.description,
        categoryId: categoryId,
        programmeType: data.programmeType,
        level: data.programmeType === "ADJUNCT_COURSE" ? null : data.level,
        track: data.programmeType === "ADJUNCT_COURSE" ? null : data.track,
        // Server's courseSchema requires price as a string ("Decimal as
        // string for precision" — shared/schema.ts) — the form tracks it as
        // a number for numeric input handling/validation.
        price: data.price.toString(),
        currency: data.currency,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: data.isPublished,
        isFeatured: data.isFeatured,
        // Include instructors for admin (drop the client-only isAdminManaged
        // UI flag before sending — the server derives that itself)
        ...(isAdmin && instructors && instructors.filter(i => i.name.trim()).length > 0
          ? { instructors: instructors.filter(i => i.name.trim()).map(({ isAdminManaged, ...rest }) => rest) }
          : {}),
      };

      const courseUrl = isEditMode
        ? `/api/instructor/courses/${courseId}`
        : "/api/instructor/courses";

      const courseRes = await apiRequest(
        isEditMode ? "PUT" : "POST",
        courseUrl,
        payload,
      );
      return await courseRes.json();
    },
    onSuccess: (course) => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructor/courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: isEditMode ? "Course updated successfully!" : "Course created successfully. Now add your curriculum!",
      });
      const nextPath = isRouteAdmin
        ? `/admin/courses/${course.id}/curriculum`
        : `/instructor/courses/${course.id}/curriculum`;
      setLocation(nextPath);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} course: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CourseFormData) => {
    if (isAdmin && instructors.filter(i => i.name.trim()).length === 0) {
      toast({
        title: "Instructor required",
        description: "Please add at least one instructor with their details.",
        variant: "destructive",
      });
      return;
    }

    if (data.categoryId === CUSTOM_CATEGORY_VALUE && !customCategory.trim()) {
      toast({
        title: "Error",
        description: "Please enter a custom category name",
        variant: "destructive",
      });
      return;
    }
    saveCourse.mutate(data);
  };

  const addInstructor = () => {
    setInstructors([...instructors, { 
      name: "", 
      title: "", 
      bio: "", 
      email: "", 
      profileImageUrl: "", 
      expertise: [], 
      linkedinUrl: "", 
      websiteUrl: "" 
    }]);
  };

  const removeInstructor = (index: number) => {
    if (instructors.length > 1) {
      setInstructors(instructors.filter((_, i) => i !== index));
    }
  };

  const updateInstructor = (index: number, field: keyof InstructorFormData, value: any) => {
    const updated = [...instructors];
    updated[index] = { ...updated[index], [field]: value };
    setInstructors(updated);
  };

  const handleCategoryChange = (
    value: string,
    fieldOnChange: (v: string) => void,
  ) => {
    fieldOnChange(value);
    setShowCustomInput(value === CUSTOM_CATEGORY_VALUE);
    if (value !== CUSTOM_CATEGORY_VALUE) setCustomCategory("");
  };

  if (authLoading || (isEditMode && courseLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <StudentLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-[#610000] hover:text-[#7d0000] hover:bg-[#f5f3ed]">
            <Link href={isRouteAdmin ? "/admin" : "/instructor"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-[#2c2015] font-display">
              {isEditMode ? "Edit Course" : "Create New Course"}
            </h1>
            <p className="text-[#6b5d4f] mt-2 font-body">
              {isEditMode ? "Update your course details" : "Fill in the details to create your new course"}
            </p>
          </div>
        </div>

        <Card className="bg-white border-[#d4c5b0]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2c2015] font-display">
              <BookOpen className="h-5 w-5 text-[#610000]" />
              Course Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {isAdmin && (
                  <div className="space-y-6 rounded-xl border-2 border-[#610000]/20 bg-gradient-to-br from-[#faf9f6] to-[#f5f3ed] p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-[#610000] font-display flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Admin Mode: Instructor Details
                        </h2>
                        <p className="text-sm text-[#6b5d4f] mt-1 font-body">
                          Add instructor information for this course. You can add multiple instructors.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={addInstructor}
                        className="bg-[#610000] text-white hover:bg-[#7d0000]"
                        size="sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Instructor
                      </Button>
                    </div>

                    {instructors.map((instructor, index) => (
                      <Card key={index} className="bg-white border-[#d4c5b0]/30">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-display text-[#2c2015]">
                              Instructor {index + 1}
                            </CardTitle>
                            {instructors.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInstructor(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {!!instructor.userId && instructor.isAdminManaged === false && (
                            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                              <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <p>
                                This is an existing instructor account. Their bio and photo are
                                managed by them and won't change here — you can still credit them
                                on this course.
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`instructor-name-${index}`}>Full Name *</Label>
                              <Input
                                id={`instructor-name-${index}`}
                                value={instructor.name}
                                onChange={(e) => updateInstructor(index, 'name', e.target.value)}
                                placeholder="e.g., Dr. John Smith"
                                className="border-[#d4c5b0]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`instructor-title-${index}`}>Title/Designation</Label>
                              <Input
                                id={`instructor-title-${index}`}
                                value={instructor.title || ''}
                                onChange={(e) => updateInstructor(index, 'title', e.target.value)}
                                placeholder="e.g., Professor of Law"
                                className="border-[#d4c5b0]"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`instructor-email-${index}`}>Email</Label>
                            <Input
                              id={`instructor-email-${index}`}
                              type="email"
                              value={instructor.email || ''}
                              onChange={(e) => updateInstructor(index, 'email', e.target.value)}
                              placeholder="instructor@example.com"
                              className="border-[#d4c5b0]"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`instructor-image-${index}`}>Profile Photo</Label>
                            {instructor.isAdminManaged === false && instructor.userId ? (
                              instructor.profileImageUrl ? (
                                <img
                                  src={instructor.profileImageUrl}
                                  alt={instructor.name}
                                  className="w-24 h-24 rounded-full object-cover border-2 border-[#d4c5b0]"
                                />
                              ) : (
                                <p className="text-sm text-[#8b6f47]">No photo set by this instructor yet.</p>
                              )
                            ) : (
                              <ImageUploader
                                bucket="instructor-avatars"
                                currentImageUrl={instructor.profileImageUrl}
                                onUploadComplete={(url) => updateInstructor(index, 'profileImageUrl', url)}
                              />
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`instructor-bio-${index}`}>Bio</Label>
                            <Textarea
                              id={`instructor-bio-${index}`}
                              value={instructor.bio || ''}
                              onChange={(e) => updateInstructor(index, 'bio', e.target.value)}
                              placeholder="Brief biography and credentials..."
                              rows={4}
                              className="border-[#d4c5b0]"
                              disabled={instructor.isAdminManaged === false && !!instructor.userId}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`instructor-linkedin-${index}`}>LinkedIn URL</Label>
                              <Input
                                id={`instructor-linkedin-${index}`}
                                type="url"
                                value={instructor.linkedinUrl || ''}
                                onChange={(e) => updateInstructor(index, 'linkedinUrl', e.target.value)}
                                placeholder="https://linkedin.com/in/username"
                                className="border-[#d4c5b0]"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`instructor-website-${index}`}>Website URL</Label>
                              <Input
                                id={`instructor-website-${index}`}
                                type="url"
                                value={instructor.websiteUrl || ''}
                                onChange={(e) => updateInstructor(index, 'websiteUrl', e.target.value)}
                                placeholder="https://example.com"
                                className="border-[#d4c5b0]"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`instructor-expertise-${index}`}>Areas of Expertise</Label>
                            <Input
                              id={`instructor-expertise-${index}`}
                              value={(instructor.expertise || []).join(', ')}
                              onChange={(e) => updateInstructor(index, 'expertise', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="Arbitration, Mediation, Commercial Law (comma separated)"
                              className="border-[#d4c5b0]"
                            />
                            <p className="text-xs text-[#8b6f47]">Separate multiple areas with commas</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Title *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter course title"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Subtitle *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter course subtitle"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              handleCategoryChange(v, field.onChange)
                            }
                            defaultValue={field.value}
                            disabled={categoriesLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                              <SelectItem value={CUSTOM_CATEGORY_VALUE}>
                                ✏️ Write a custom category...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {showCustomInput && (
                            <Input
                              className="mt-2"
                              placeholder="Enter your custom category name"
                              value={customCategory}
                              onChange={(e) =>
                                setCustomCategory(e.target.value)
                              }
                            />
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="programmeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Type *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select course type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PROFESSIONAL_PROGRAMME">
                                Professional Programme (Associate → Member → Fellow ladder)
                              </SelectItem>
                              <SelectItem value="ADJUNCT_COURSE">
                                Adjunct Course (standalone, no prerequisites)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("programmeType") === "PROFESSIONAL_PROGRAMME" && (
                      <>
                        <FormField
                          control={form.control}
                          name="level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty Level *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="associate">Part I (Associate)</SelectItem>
                                  <SelectItem value="member">Part II (Member)</SelectItem>
                                  <SelectItem value="fellow">Part III (Fellow)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="track"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qualification Track *</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select qualification track" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ARBITRATION">Arbitration (ACIMArb/MCIMArb/FCIMArb)</SelectItem>
                                  <SelectItem value="MEDIATION">Mediation (ACIMed/MCIMed/FCIMed)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="GHS">GHS</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="thumbnailUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Thumbnail</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              <ImageUploader
                                currentImageUrl={field.value}
                                onUploadComplete={(url) => field.onChange(url)}
                              />
                              <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                  <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                  <span className="bg-background px-2 text-muted-foreground">
                                    Or enter URL
                                  </span>
                                </div>
                              </div>
                              <Input
                                type="url"
                                placeholder="https://example.com/image.jpg"
                                value={field.value || ""}
                                onChange={field.onChange}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="isPublished"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Publish Course
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Make this course available to students
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Featured Course
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Display this course prominently on the homepage
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what students will learn in this course..."
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-[#d4c5b0]/30">
                  <Button type="button" variant="outline" asChild className="border-[#d4c5b0]/50 text-[#610000] hover:bg-[#f5f3ed] hover:border-[#610000]">
                    <Link href={isRouteAdmin ? "/admin" : "/instructor"}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saveCourse.isPending} className="bg-[#610000] text-white hover:bg-[#7d0000]">
                        {saveCourse.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            {isEditMode ? "Updating..." : "Creating..."}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {isEditMode ? "Update Course" : "Create Course"}
                          </>
                        )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}

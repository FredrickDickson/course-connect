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
import Header from "@/components/header";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { ImageUploader } from "@/components/ImageUploader";
import { useAuth } from "@/contexts/AuthContext";
import InstructorSelector from "@/components/admin/instructor-selector";
import AdminContextBadge from "@/components/admin/admin-context-badge";

const CUSTOM_CATEGORY_VALUE = "__custom__";

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
  
  // Admin context: creating on behalf of instructor
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
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
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const instructorId = params.get("instructorId");
    if (instructorId) {
      setSelectedInstructorId(instructorId);
    }

    const path = window.location.pathname;
    setIsRouteAdmin(path.startsWith("/admin"));
  }, []);

  useEffect(() => {
    if (!selectedInstructorId || !isAdmin) return;

    const fetchInstructor = async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/instructors/${selectedInstructorId}`);
        const instructor = await res.json();
        setSelectedInstructor(instructor);
      } catch (error) {
        console.error("Failed to load selected instructor:", error);
      }
    };

    fetchInstructor();
  }, [selectedInstructorId, isAdmin]);

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

      if (isAdmin && courseData.instructor_id && !selectedInstructorId) {
        setSelectedInstructorId(courseData.instructor_id);
      }
    }
  }, [courseData, form, isAdmin, selectedInstructorId]);

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
      };

      const courseUrl = isEditMode
        ? `/api/instructor/courses/${courseId}`
        : "/api/instructor/courses";

      const requestUrl = isAdmin && selectedInstructorId
        ? `${courseUrl}${courseUrl.includes("?") ? "&" : "?"}onBehalfOf=${encodeURIComponent(selectedInstructorId)}`
        : courseUrl;

      const courseRes = await apiRequest(
        isEditMode ? "PUT" : "POST",
        requestUrl,
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
    if (isAdmin && !selectedInstructorId) {
      toast({
        title: "Instructor required",
        description: "Choose an instructor before creating the course on their behalf.",
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

  const handleInstructorSelection = (instructorId: string, instructor?: any) => {
    setSelectedInstructorId(instructorId);
    setSelectedInstructor(instructor || null);
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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={isRouteAdmin ? "/admin" : "/instructor"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditMode ? "Edit Course" : "Create New Course"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditMode ? "Update your course details" : "Fill in the details to create your new course"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
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
                  <div className="space-y-4 rounded-xl border border-[#d4c5b0]/40 bg-[#faf9f6] p-4">
                    <div className="flex flex-col gap-2">
                      <h2 className="text-lg font-semibold text-[#2c2015]">Admin mode</h2>
                      <p className="text-sm text-[#6b5d4f]">
                        You can create and manage the course on behalf of an instructor, including curriculum and announcements.
                      </p>
                    </div>
                    <AdminContextBadge
                      instructorId={selectedInstructorId}
                      instructorName={selectedInstructor ? `${selectedInstructor.first_name} ${selectedInstructor.last_name}` : "Select an instructor"}
                      instructorImage={selectedInstructor?.profile_image_url}
                      showClearButton={!!selectedInstructorId}
                      onClearContext={() => {
                        setSelectedInstructorId("");
                        setSelectedInstructor(null);
                      }}
                    />
                    <InstructorSelector
                      value={selectedInstructorId}
                      onChange={handleInstructorSelection}
                      label="Instructor to manage" 
                      placeholder="Choose instructor to act for"
                    />
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

                <div className="flex items-center justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href={isRouteAdmin ? "/admin" : "/instructor"}>Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={saveCourse.isPending}>
                        {saveCourse.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
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
    </div>
  );
}

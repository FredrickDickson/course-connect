/**
 * Storage module: Courses
 * Uses Supabase client (service role) for all database operations.
 * All results are transformed to camelCase before returning.
 */

import type {
  Course,
  InsertCourse,
  Category,
  InsertCategory,
  Module,
  InsertModule,
  Lesson,
  InsertLesson,
  CourseResource,
  InsertCourseResource,
} from "@shared/schema";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Category operations
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function createCategory(
  category: InsertCategory,
): Promise<Category> {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert(category)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Course operations
export async function getCourses(filters?: {
  category?: string;
  search?: string;
  level?: string;
  featured?: boolean;
}): Promise<any[]> {
  let query = supabaseAdmin
    .from("courses")
    .select(
      "*, category:categories(id, name, slug), instructor:users(first_name, last_name, profile_image_url)",
    )
    .eq("is_published", true);

  if (filters?.category && filters.category !== "all") {
    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", filters.category);

    if (categories && categories.length > 0) {
      query = query.eq("category_id", categories[0].id);
    } else {
      if (filters.category.length === 36) {
        query = query.eq("category_id", filters.category);
      }
    }
  }

  if (filters?.level && filters.level !== "all") {
    query = query.eq("level", filters.level);
  }

  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  if (filters?.featured !== undefined) {
    query = query.eq("is_featured", filters.featured);
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) throw error;
  return data || [];
}

export async function getCourseById(id: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select(
      "*, category:categories(*), instructor:users!courses_instructor_id_fkey(*)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function createCourse(course: InsertCourse): Promise<Course> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .insert(course)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateCourse(
  id: string,
  updates: Partial<InsertCourse>,
): Promise<Course> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);

  if (error) throw error;
}

export async function getFeaturedCourses(): Promise<any[]> {
  return await getCourses({ featured: true });
}

export async function getInstructorCourses(
  instructorId: string,
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("courses")
    .select("*, category:categories(id, name, slug)")
    .eq("instructor_id", instructorId);

  if (error) throw error;
  return data || [];
}

export async function getInstructorStats(instructorId: string): Promise<{
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
}> {
  const { data: instructorCourses, error: coursesError } = await supabaseAdmin
    .from("courses")
    .select("id, price, avg_rating")
    .eq("instructor_id", instructorId);

  if (coursesError) throw coursesError;
  const courseIds = (instructorCourses || []).map((c) => c.id);
  const totalCourses = (instructorCourses || []).length;

  let totalStudents = 0;
  if (courseIds.length > 0) {
    const { data: studentCount, error: studentError } = await supabaseAdmin
      .from("enrollments")
      .select("user_id", { count: "exact" })
      .in("course_id", courseIds);

    if (studentError) throw studentError;
    totalStudents = studentCount?.length || 0;
  }

  let totalRevenue = 0;
  if (courseIds.length > 0) {
    const { data: instructorOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("amount")
      .in("course_id", courseIds)
      .eq("status", "completed");

    if (ordersError) throw ordersError;
    totalRevenue = (instructorOrders || []).reduce(
      (sum, order) => sum + (Number(order.amount) || 0),
      0,
    );
  }

  let averageRating = 0;
  if (instructorCourses && instructorCourses.length > 0) {
    const validRatings = instructorCourses
      .map((c) => Number(c.avg_rating))
      .filter((r) => !isNaN(r) && r > 0);

    if (validRatings.length > 0) {
      averageRating =
        validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
    }
  }

  return {
    totalCourses,
    totalStudents,
    totalRevenue,
    averageRating,
  };
}

export async function getCoursesForAdmin(filters?: {
  page?: number;
  limit?: number;
  status?: string;
  instructor?: string;
}): Promise<Course[]> {
  let query = supabaseAdmin.from("courses").select("*");
  if (filters?.instructor) {
    query = query.eq("instructor_id", filters.instructor);
  }
  query = query.order("created_at", { ascending: false });
  if (filters?.page && filters?.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Curriculum operations
export async function getCourseModules(courseId: string): Promise<any[]> {
  const { data: modulesData, error: modulesError } = await supabaseAdmin
    .from("modules")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("order", { ascending: true });
  if (modulesError) throw modulesError;
  return (modulesData || []).map((m) => ({
    ...m,
    lessons: (m.lessons || []).sort((a: any, b: any) => a.order - b.order),
  }));
}

export async function createModule(module: InsertModule): Promise<Module> {
  const courseId = module.courseId;
  if (!courseId) throw new Error("Course ID is required for a module");
  const { data: maxOrderData } = await supabaseAdmin
    .from("modules")
    .select("order")
    .eq("course_id", courseId)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;
  const insertPayload = {
    course_id: courseId,
    title: module.title,
    description: module.description,
    order: nextOrder,
  };
  const { data, error } = await supabaseAdmin
    .from("modules")
    .insert(insertPayload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateModule(
  id: string,
  updates: Partial<InsertModule>,
): Promise<Module> {
  const { data, error } = await supabaseAdmin
    .from("modules")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteModule(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("modules").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderModules(
  courseId: string,
  moduleOrder: string[],
): Promise<void> {
  for (let i = 0; i < moduleOrder.length; i++) {
    await supabaseAdmin
      .from("modules")
      .update({ order: i })
      .eq("id", moduleOrder[i]);
  }
}

export async function createLesson(lesson: InsertLesson): Promise<Lesson> {
  const moduleId = lesson.moduleId;
  if (!moduleId) throw new Error("Module ID is required for a lesson");
  const { data: maxOrderData } = await supabaseAdmin
    .from("lessons")
    .select("order")
    .eq("module_id", moduleId)
    .order("order", { ascending: false })
    .limit(1);
  const nextOrder = (maxOrderData?.[0]?.order ?? -1) + 1;
  const insertPayload = {
    module_id: moduleId,
    title: lesson.title,
    description: lesson.description,
    content_type: lesson.contentType,
    video_url: lesson.videoUrl,
    duration: lesson.duration,
    content: lesson.content,
    order: nextOrder,
    is_free: lesson.isFree,
  };
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .insert(insertPayload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLesson(
  id: string,
  updates: Partial<InsertLesson>,
): Promise<Lesson> {
  const { data, error } = await supabaseAdmin
    .from("lessons")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("lessons").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderLessons(
  moduleId: string,
  lessonOrder: string[],
): Promise<void> {
  for (let i = 0; i < lessonOrder.length; i++) {
    await supabaseAdmin
      .from("lessons")
      .update({ order: i })
      .eq("id", lessonOrder[i]);
  }
}

export async function getLessonById(lessonId: string): Promise<any> {
  const { data: lesson, error } = await supabaseAdmin
    .from("lessons")
    .select("id, title, module_id, module:modules!inner(course_id)")
    .eq("id", lessonId)
    .maybeSingle();

  if (error) throw error;
  if (!lesson) return null;

  const moduleData = Array.isArray(lesson.module)
    ? lesson.module[0]
    : lesson.module;

  return {
    id: lesson.id,
    title: lesson.title,
    moduleId: lesson.module_id,
    courseId: moduleData?.course_id,
  };
}

export async function getCourseLessons(courseId: string): Promise<any[]> {
  const { data: courseModules, error: moduleError } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  if (moduleError) throw moduleError;
  const moduleIds = (courseModules || []).map((m) => m.id);
  if (moduleIds.length === 0) return [];

  const { data: allLessons, error } = await supabaseAdmin
    .from("lessons")
    .select("id, title, module_id")
    .in("module_id", moduleIds);

  if (error) throw error;
  return (allLessons || []).map((l) => ({
    id: l.id,
    title: l.title,
    moduleId: l.module_id,
  }));
}

// Course resources operations
export async function createCourseResource(
  resource: InsertCourseResource,
): Promise<CourseResource> {
  const insertPayload = {
    lesson_id: resource.lessonId,
    course_id: resource.courseId,
    title: resource.title,
    description: resource.description,
    file_url: resource.fileUrl,
    file_name: resource.fileName,
    file_type: resource.fileType,
    file_size: resource.fileSize,
    download_count: resource.downloadCount,
  };

  const { data, error } = await supabaseAdmin
    .from("course_resources")
    .insert(insertPayload)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLessonResources(
  lessonId: string,
): Promise<CourseResource[]> {
  const { data, error } = await supabaseAdmin
    .from("course_resources")
    .select("*")
    .eq("lesson_id", lessonId);
  if (error) throw error;
  return data || [];
}

export async function getCourseResources(
  courseId: string,
): Promise<CourseResource[]> {
  const { data, error } = await supabaseAdmin
    .from("course_resources")
    .select("*")
    .eq("course_id", courseId);
  if (error) throw error;
  return data || [];
}

export async function deleteCourseResource(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("course_resources")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Course publishing operations
export async function validateCourseForPublishing(courseId: string): Promise<{
  isValid: boolean;
  checks: Record<string, boolean>;
  errors: string[];
}> {
  const { data: course, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    throw new Error("Course not found");
  }

  const { data: courseModules } = await supabaseAdmin
    .from("modules")
    .select("id")
    .eq("course_id", courseId);

  const { data: totalLessons } = await supabaseAdmin
    .from("lessons")
    .select("*, module:modules!inner(course_id)")
    .eq("module.course_id", courseId);

  const videoLessons = (totalLessons || []).filter(
    (lesson) => lesson.content_type === "video",
  );

  const checks = {
    hasTitle: !!course.title && course.title.trim().length > 0,
    hasDescription:
      !!course.description && course.description.trim().length > 0,
    hasPrice: course.price !== null && course.price !== undefined,
    hasCategory: !!course.category_id,
    hasThumbnail: !!course.thumbnail_url,
    hasModules: (courseModules || []).length > 0,
    hasLectures: (totalLessons || []).length > 0,
    hasVideoContent: videoLessons.length > 0,
  };

  const errors: string[] = [];
  if (!checks.hasTitle) errors.push("Course must have a title");
  if (!checks.hasDescription) errors.push("Course must have a description");
  if (!checks.hasPrice) errors.push("Course must have a price set");
  if (!checks.hasCategory) errors.push("Course must be assigned to a category");
  if (!checks.hasThumbnail) errors.push("Course must have a thumbnail image");
  if (!checks.hasModules) errors.push("Course must have at least one section");
  if (!checks.hasLectures) errors.push("Course must have at least one lecture");
  if (!checks.hasVideoContent)
    errors.push("Course must have at least one video lecture");

  return {
    isValid: errors.length === 0,
    checks,
    errors,
  };
}

export async function publishCourse(courseId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq("id", courseId);
  if (error) throw error;
}

export async function unpublishCourse(courseId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("courses")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("id", courseId);
  if (error) throw error;
}

// Real data methods
export async function getRealPlatformStats(): Promise<{
  totalCourses: number;
  totalStudents: number;
  averageRating: number;
  totalHours: number;
}> {
  const { count: totalCourses } = await supabaseAdmin
    .from("courses")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true);

  const { count: totalStudents } = await supabaseAdmin
    .from("enrollments")
    .select("*", { count: "exact", head: true });

  const { data: reviews } = await supabaseAdmin
    .from("reviews")
    .select("rating");
  const avgRating = reviews?.length
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  const { data: coursesData } = await supabaseAdmin
    .from("courses")
    .select("duration_hours")
    .eq("is_published", true);
  const totalHours =
    coursesData?.reduce((sum, c) => sum + (c.duration_hours || 0), 0) || 0;

  return {
    totalCourses: totalCourses || 0,
    totalStudents: totalStudents || 0,
    averageRating: Math.round(avgRating * 10) / 10,
    totalHours,
  };
}

export async function getInstructorMonthlyRevenue(
  instructorId: string,
): Promise<{ month: string; amount: number }[]> {
  const { data: coursesData, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("instructor_id", instructorId);

  if (courseError) throw courseError;
  const courseIds = coursesData?.map((c) => c.id) || [];
  if (courseIds.length === 0) return [];

  const { data: ordersData, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("amount, created_at")
    .eq("status", "completed")
    .in("course_id", courseIds);

  if (orderError) throw orderError;

  const monthData: Record<string, number> = {};
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  ordersData?.forEach((order) => {
    if (order.created_at) {
      const date = new Date(order.created_at);
      const monthKey = months[date.getMonth()];
      monthData[monthKey] =
        (monthData[monthKey] || 0) + (Number(order.amount) || 0);
    }
  });

  return Object.entries(monthData).map(([month, amount]) => ({
    month,
    amount,
  }));
}

export async function getInstructorAnalytics(
  instructorId: string,
): Promise<any[]> {
  const { data: coursesData, error } = await supabaseAdmin
    .from("courses")
    .select(
      `
        id,
        title,
        price,
        avg_rating,
        rating_count,
        enrollment_count,
        orders (amount, status)
      `,
    )
    .eq("instructor_id", instructorId);

  if (error) throw error;

  return (coursesData || []).map((course) => {
    const completedOrders = (course.orders || []).filter(
      (o: any) => o.status === "completed",
    );
    const revenue = completedOrders.reduce(
      (sum: number, o: any) => sum + (Number(o.amount) || 0),
      0,
    );

    return {
      id: course.id,
      title: course.title,
      price: Number(course.price),
      revenue,
      students: course.enrollment_count || 0,
      rating: Number(course.avg_rating) || 0,
      ratingCount: course.rating_count || 0,
    };
  });
}

export async function getInstructorPendingSubmissions(
  instructorId: string,
): Promise<any[]> {
  const { data: coursesData, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("instructor_id", instructorId);

  if (courseError) throw courseError;
  const courseIds = (coursesData || []).map((c) => c.id);
  if (courseIds.length === 0) return [];

  const { data: submissions, error } = await supabaseAdmin
    .from("assignment_submissions")
    .select(
      `
        *,
        assignment:assignments!inner(
          id,
          title,
          lesson:lessons!inner(
            id,
            title,
            module:modules!inner(
              id,
              title,
              course_id
            )
          )
        ),
        user:users(id, first_name, last_name, profile_image_url)
      `,
    )
    .is("graded_at", null)
    .in("assignment.lesson.module.course_id", courseIds)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (submissions || []).map((s) => {
    const assignment = Array.isArray(s.assignment)
      ? s.assignment[0]
      : s.assignment;
    const user = Array.isArray(s.user) ? s.user[0] : s.user;
    return {
      id: s.id,
      assignment: { title: assignment?.title },
      student: { firstName: user?.first_name, lastName: user?.last_name },
      submittedAt: s.submitted_at,
    };
  });
}

export async function getInstructorStudentQuestions(
  instructorId: string,
): Promise<any[]> {
  const { data: coursesData, error: courseError } = await supabaseAdmin
    .from("courses")
    .select("id, title")
    .eq("instructor_id", instructorId);

  if (courseError) throw courseError;
  const courseIds = (coursesData || []).map((c) => c.id);
  if (courseIds.length === 0) return [];

  const { data: discussions, error } = await supabaseAdmin
    .from("discussions")
    .select(
      `
        *,
        user:users(id, first_name, last_name, profile_image_url)
      `,
    )
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (discussions || []).map((d) => {
    const user = Array.isArray(d.user) ? d.user[0] : d.user;
    return {
      id: d.id,
      content: d.content,
      student: { firstName: user?.first_name, lastName: user?.last_name },
      course: {
        title:
          coursesData.find((c) => c.id === d.course_id)?.title ||
          "Unknown Course",
      },
      createdAt: d.created_at,
    };
  });
}

export async function getCourseRecommendations(userId: string): Promise<any[]> {
  const { data: enrolled, error: enrollError } = await supabaseAdmin
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId);

  if (enrollError) throw enrollError;
  const enrolledIds = (enrolled || [])
    .map((e) => e.course_id)
    .filter(Boolean) as string[];

  let categoryIds: string[] = [];
  if (enrolledIds.length > 0) {
    const { data: courseCats } = await supabaseAdmin
      .from("courses")
      .select("category_id")
      .in("id", enrolledIds);
    categoryIds = Array.from(
      new Set(
        (courseCats || [])
          .map((c) => c.category_id)
          .filter(Boolean) as string[],
      ),
    );
  }

  let query = supabaseAdmin
    .from("courses")
    .select("*")
    .eq("is_published", true);
  if (enrolledIds.length > 0) {
    query = query.not("id", "in", `(${enrolledIds.join(",")})`);
  }

  if (categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  const { data: recommended, error } = await query
    .order("avg_rating", { ascending: false })
    .order("enrollment_count", { ascending: false })
    .limit(6);

  if (error) throw error;
  return (recommended || []).map((c) => ({
    id: c.id,
    title: c.title,
    thumbnailUrl: c.thumbnail_url,
    avgRating: c.avg_rating,
    enrollmentCount: c.enrollment_count,
  }));
}

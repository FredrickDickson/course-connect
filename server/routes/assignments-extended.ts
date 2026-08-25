// Course/session-anchored assignments & quizzes: draft/post workflow, groups,
// group meetings, and grading. The existing lesson-anchored assignment/quiz
// routes (server/routes.ts, ~3383-3481 and nearby) and their storage helpers are
// untouched -- this is a separate, additive router for the two new anchors
// (course_id / live_session_id) added in the 20260825* migrations.
//
// Ownership checks here are re-implemented against supabaseAdmin (the service
// role client bypasses RLS, so the database-level RLS added in the migrations
// is defense-in-depth for direct client reads, not what protects these routes --
// these routes must check ownership themselves, mirroring the same
// instructor_id/is_admin logic as the user_owns_course/user_owns_live_session
// SQL helper functions).

import { Router } from "express";
import type { Request, Response } from "express";
import { requireSupabaseAuth } from "../supabaseAuth";
import { requireInstructor } from "../middleware/roleProtection";
import { asyncHandler } from "../middleware/security";
import { supabaseAdmin, storage } from "../storage";
import { getZoomService } from "../services/zoom";
import { sanitizeRichText } from "../utils/sanitizeHtml";
import { z } from "zod";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
    claims: { sub: string };
  };
}

const router = Router();

// ============================================================================
// OWNERSHIP HELPERS
// ============================================================================

async function courseInstructorId(courseId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("courses").select("instructor_id").eq("id", courseId).single();
  return data?.instructor_id ?? null;
}

async function sessionInstructorId(sessionId: string): Promise<{ instructorId: string | null; courseId: string | null }> {
  const { data } = await supabaseAdmin.from("live_sessions").select("instructor_id, course_id").eq("id", sessionId).single();
  return { instructorId: data?.instructor_id ?? null, courseId: data?.course_id ?? null };
}

async function canManageCourse(courseId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const instructorId = await courseInstructorId(courseId);
  return instructorId === userId;
}

async function canManageSession(sessionId: string, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  const { instructorId } = await sessionInstructorId(sessionId);
  return instructorId === userId;
}

async function canManageAssignment(assignment: any, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  if (assignment.course_id) return canManageCourse(assignment.course_id, userId, role);
  if (assignment.live_session_id) return canManageSession(assignment.live_session_id, userId, role);
  return false;
}

async function canManageQuiz(quiz: any, userId: string, role: string): Promise<boolean> {
  if (role === "admin") return true;
  if (quiz.course_id) return canManageCourse(quiz.course_id, userId, role);
  if (quiz.live_session_id) return canManageSession(quiz.live_session_id, userId, role);
  return false;
}

async function loadAssignment(id: string) {
  const { data } = await supabaseAdmin.from("assignments").select("*").eq("id", id).single();
  return data;
}

async function loadQuiz(id: string) {
  const { data } = await supabaseAdmin.from("quizzes").select("*").eq("id", id).single();
  return data;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const assignmentBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1),
  instructions: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  maxScore: z.number().int().positive().optional(),
  allowLateSubmission: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  groupMode: z.enum(["individual", "group"]).optional(),
  allowGroupMeetings: z.boolean().optional(),
});

const quizBodySchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  timeLimitMinutes: z.number().int().positive().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  maxAttempts: z.number().int().positive().optional(),
  questions: z.array(z.any()).default([]),
});

function assignmentInsertPayload(body: z.infer<typeof assignmentBodySchema>) {
  return {
    title: body.title,
    description: body.description,
    instructions: body.instructions ? sanitizeRichText(body.instructions) : null,
    due_date: body.dueDate ?? null,
    max_score: body.maxScore ?? 100,
    allow_late_submission: body.allowLateSubmission ?? true,
    is_required: body.isRequired ?? false,
    group_mode: body.groupMode ?? "individual",
    allow_group_meetings: body.allowGroupMeetings ?? false,
  };
}

// ============================================================================
// ASSIGNMENTS: create / update / post
// ============================================================================

router.post(
  "/courses/:courseId/assignments",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user.claims.sub;
    if (!(await canManageCourse(courseId, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = assignmentBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert({ course_id: courseId, ...assignmentInsertPayload(parsed.data) })
      .select()
      .single();
    if (error) return res.status(500).json({ message: "Failed to create assignment", error: error.message });
    res.status(201).json(data);
  }),
);

router.post(
  "/sessions/:sessionId/assignments",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user.claims.sub;
    if (!(await canManageSession(sessionId, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = assignmentBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });

    const { data, error } = await supabaseAdmin
      .from("assignments")
      .insert({ live_session_id: sessionId, ...assignmentInsertPayload(parsed.data) })
      .select()
      .single();
    if (error) return res.status(500).json({ message: "Failed to create assignment", error: error.message });
    res.status(201).json(data);
  }),
);

router.patch(
  "/assignments/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = assignmentBodySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });

    const payload: Record<string, any> = {};
    const p = parsed.data;
    if (p.title !== undefined) payload.title = p.title;
    if (p.description !== undefined) payload.description = p.description;
    if (p.instructions !== undefined) payload.instructions = p.instructions ? sanitizeRichText(p.instructions) : null;
    if (p.dueDate !== undefined) payload.due_date = p.dueDate;
    if (p.maxScore !== undefined) payload.max_score = p.maxScore;
    if (p.allowLateSubmission !== undefined) payload.allow_late_submission = p.allowLateSubmission;
    if (p.isRequired !== undefined) payload.is_required = p.isRequired;
    if (p.groupMode !== undefined) payload.group_mode = p.groupMode;
    if (p.allowGroupMeetings !== undefined) payload.allow_group_meetings = p.allowGroupMeetings;

    const { data, error } = await supabaseAdmin.from("assignments").update(payload).eq("id", id).select().single();
    if (error) return res.status(500).json({ message: "Failed to update assignment", error: error.message });
    res.json(data);
  }),
);

router.delete(
  "/assignments/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { error } = await supabaseAdmin.from("assignments").delete().eq("id", id);
    if (error) return res.status(500).json({ message: "Failed to delete assignment" });
    res.json({ success: true });
  }),
);

async function postAssignmentAudience(assignment: any): Promise<string[]> {
  if (assignment.live_session_id) {
    const { data: participants } = await supabaseAdmin
      .from("session_participants")
      .select("user_id")
      .eq("session_id", assignment.live_session_id);
    if (participants && participants.length > 0) return participants.map((p) => p.user_id);

    const { courseId } = await sessionInstructorId(assignment.live_session_id);
    if (courseId) {
      const { data: enrollments } = await supabaseAdmin.from("enrollments").select("user_id").eq("course_id", courseId);
      return (enrollments || []).map((e) => e.user_id);
    }
    return [];
  }
  if (assignment.course_id) {
    const { data: enrollments } = await supabaseAdmin.from("enrollments").select("user_id").eq("course_id", assignment.course_id);
    return (enrollments || []).map((e) => e.user_id);
  }
  return [];
}

router.post(
  "/assignments/:id/post",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    // The UPDATE itself is what makes the item visible to students (RLS gates on
    // posted_at IS NOT NULL) and, because Supabase Realtime respects RLS, is what
    // triggers the live "posted" banner for anyone already subscribed -- no
    // separate broadcast call needed.
    const { data: updated, error } = await supabaseAdmin
      .from("assignments")
      .update({ posted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: "Failed to post assignment", error: error.message });

    const audience = await postAssignmentAudience(updated);
    if (audience.length > 0) {
      const actionUrl = assignment.live_session_id ? `/sessions/${assignment.live_session_id}` : `/courses/${assignment.course_id}`;
      const rows = audience.map((uid) => ({
        user_id: uid,
        type: "academic",
        title: `New assignment: ${updated.title}`,
        message: updated.due_date
          ? `Due ${new Date(updated.due_date).toLocaleString()}`
          : "Posted by your instructor",
        action_url: actionUrl,
        action_text: "View assignment",
        priority: "normal",
        data: { assignment_id: id, anchor_type: assignment.live_session_id ? "session" : "course" },
      }));
      const { error: notifyError } = await supabaseAdmin.from("notifications").insert(rows);
      if (notifyError) console.error("Failed to fan out assignment notifications:", notifyError);
    }

    res.json({ ...updated, notified_count: audience.length });
  }),
);

// ============================================================================
// QUIZZES: create / update / post
// ============================================================================

router.post(
  "/courses/:courseId/quizzes",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user.claims.sub;
    if (!(await canManageCourse(courseId, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = quizBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });
    const b = parsed.data;

    const { data: quizId, error } = await supabaseAdmin.rpc("create_anchored_quiz", {
      _anchor_type: "course",
      _anchor_id: courseId,
      _title: b.title,
      _description: b.description ?? null,
      _time_limit_minutes: b.timeLimitMinutes ?? null,
      _passing_score: b.passingScore ?? 80,
      _max_attempts: b.maxAttempts ?? 3,
      _questions: b.questions,
    });
    if (error) return res.status(500).json({ message: "Failed to create quiz", error: error.message });
    res.status(201).json({ id: quizId });
  }),
);

router.post(
  "/sessions/:sessionId/quizzes",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user.claims.sub;
    if (!(await canManageSession(sessionId, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = quizBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });
    const b = parsed.data;

    const { data: quizId, error } = await supabaseAdmin.rpc("create_anchored_quiz", {
      _anchor_type: "session",
      _anchor_id: sessionId,
      _title: b.title,
      _description: b.description ?? null,
      _time_limit_minutes: b.timeLimitMinutes ?? null,
      _passing_score: b.passingScore ?? 80,
      _max_attempts: b.maxAttempts ?? 3,
      _questions: b.questions,
    });
    if (error) return res.status(500).json({ message: "Failed to create quiz", error: error.message });
    res.status(201).json({ id: quizId });
  }),
);

router.patch(
  "/quizzes/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const quiz = await loadQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canManageQuiz(quiz, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const parsed = quizBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });
    const b = parsed.data;

    const { error } = await supabaseAdmin.rpc("update_anchored_quiz", {
      _quiz_id: id,
      _title: b.title,
      _description: b.description ?? null,
      _time_limit_minutes: b.timeLimitMinutes ?? null,
      _passing_score: b.passingScore ?? 80,
      _max_attempts: b.maxAttempts ?? 3,
      _questions: b.questions,
    });
    if (error) return res.status(500).json({ message: "Failed to update quiz", error: error.message });
    res.json({ id });
  }),
);

router.post(
  "/quizzes/:id/post",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const quiz = await loadQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canManageQuiz(quiz, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { data: updated, error } = await supabaseAdmin
      .from("quizzes")
      .update({ posted_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ message: "Failed to post quiz", error: error.message });

    const audience = await postAssignmentAudience(updated);
    if (audience.length > 0) {
      const actionUrl = quiz.live_session_id ? `/sessions/${quiz.live_session_id}` : `/courses/${quiz.course_id}`;
      const rows = audience.map((uid) => ({
        user_id: uid,
        type: "academic",
        title: `New quiz: ${updated.title}`,
        message: "Posted by your instructor",
        action_url: actionUrl,
        action_text: "Take quiz",
        priority: "normal",
        data: { quiz_id: id, anchor_type: quiz.live_session_id ? "session" : "course" },
      }));
      const { error: notifyError } = await supabaseAdmin.from("notifications").insert(rows);
      if (notifyError) console.error("Failed to fan out quiz notifications:", notifyError);
    }

    res.json({ ...updated, notified_count: audience.length });
  }),
);

router.delete(
  "/quizzes/:id",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const quiz = await loadQuiz(id);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (!(await canManageQuiz(quiz, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { error } = await supabaseAdmin.from("quizzes").delete().eq("id", id);
    if (error) return res.status(500).json({ message: "Failed to delete quiz" });
    res.json({ success: true });
  }),
);

// ============================================================================
// LISTING (course / session) -- shared with students, filtered to posted-only
// unless the requester manages the course
// ============================================================================

router.get(
  "/courses/:courseId/assignments-and-quizzes",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user.claims.sub;
    const manages = await canManageCourse(courseId, userId, req.user.role);

    let aQuery = supabaseAdmin.from("assignments").select("*").eq("course_id", courseId);
    let qQuery = supabaseAdmin.from("quizzes").select("*").eq("course_id", courseId);
    if (!manages) {
      aQuery = aQuery.not("posted_at", "is", null);
      qQuery = qQuery.not("posted_at", "is", null);
    }
    const [{ data: assignments, error: aErr }, { data: quizzes, error: qErr }] = await Promise.all([aQuery, qQuery]);
    if (aErr || qErr) return res.status(500).json({ message: "Failed to load coursework" });
    res.json({ assignments: assignments || [], quizzes: quizzes || [] });
  }),
);

router.get(
  "/sessions/:sessionId/assignments-and-quizzes",
  requireSupabaseAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user.claims.sub;
    const manages = await canManageSession(sessionId, userId, req.user.role);

    let aQuery = supabaseAdmin.from("assignments").select("*").eq("live_session_id", sessionId);
    let qQuery = supabaseAdmin.from("quizzes").select("*").eq("live_session_id", sessionId);
    if (!manages) {
      aQuery = aQuery.not("posted_at", "is", null);
      qQuery = qQuery.not("posted_at", "is", null);
    }
    const [{ data: assignments, error: aErr }, { data: quizzes, error: qErr }] = await Promise.all([aQuery, qQuery]);
    if (aErr || qErr) return res.status(500).json({ message: "Failed to load coursework" });
    res.json({ assignments: assignments || [], quizzes: quizzes || [] });
  }),
);

// ============================================================================
// ROSTER (for the Manage Groups panel) -- server-side PII read, not broad RLS
// ============================================================================

router.get(
  "/assignments/:id/roster",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    let courseId: string | null = assignment.course_id;
    if (!courseId && assignment.live_session_id) {
      const { courseId: sessionCourseId } = await sessionInstructorId(assignment.live_session_id);
      courseId = sessionCourseId;
    }
    if (!courseId) return res.json([]);

    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from("enrollments")
      .select("user_id, user:users(id, first_name, last_name, email)")
      .eq("course_id", courseId);
    if (enrollError) return res.status(500).json({ message: "Failed to load roster" });

    const userIds = (enrollments || []).map((e: any) => e.user_id);
    const [{ data: profiles }, { data: memberships }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from("profiles").select("user_id, phone, whatsapp").in("user_id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin
        .from("assignment_group_members")
        .select("user_id, group_id, group:assignment_groups(id, name)")
        .eq("assignment_id", id),
    ]);

    const profileByUser = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const membershipByUser = new Map((memberships || []).map((m: any) => [m.user_id, m]));

    const roster = (enrollments || []).map((e: any) => {
      const profile = profileByUser.get(e.user_id);
      const membership = membershipByUser.get(e.user_id);
      return {
        userId: e.user_id,
        firstName: e.user?.first_name ?? null,
        lastName: e.user?.last_name ?? null,
        email: e.user?.email ?? null,
        phone: profile?.phone ?? null,
        whatsapp: profile?.whatsapp ?? null,
        groupId: membership?.group_id ?? null,
        groupName: membership?.group?.name ?? null,
      };
    });
    res.json(roster);
  }),
);

// ============================================================================
// GROUPS: auto-split
// ============================================================================

router.post(
  "/assignments/:id/groups/auto-split",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (assignment.group_mode !== "group") {
      return res.status(400).json({ message: "Assignment is not in group mode" });
    }

    const bodySchema = z.object({ groupCount: z.number().int().positive().max(1000) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "groupCount is required" });
    const { groupCount } = parsed.data;

    let courseId: string | null = assignment.course_id;
    if (!courseId && assignment.live_session_id) {
      const { courseId: sessionCourseId } = await sessionInstructorId(assignment.live_session_id);
      courseId = sessionCourseId;
    }
    const { data: enrollments } = courseId
      ? await supabaseAdmin.from("enrollments").select("user_id").eq("course_id", courseId)
      : { data: [] as any[] };
    const studentIds = (enrollments || []).map((e: any) => e.user_id);
    if (studentIds.length === 0) return res.status(400).json({ message: "No enrolled students to split into groups" });

    // Regenerating discards the previous split -- this is a destructive
    // "regenerate groups" action, not an incremental adjustment.
    await supabaseAdmin.from("assignment_groups").delete().eq("assignment_id", id);

    const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
    const groups: { id: string; name: string }[] = [];
    for (let i = 0; i < groupCount; i++) {
      const { data: group, error } = await supabaseAdmin
        .from("assignment_groups")
        .insert({ assignment_id: id, name: `Group ${i + 1}` })
        .select()
        .single();
      if (error) return res.status(500).json({ message: "Failed to create groups", error: error.message });
      groups.push(group);
    }

    const memberRows = shuffled.map((uid, idx) => ({
      group_id: groups[idx % groupCount].id,
      assignment_id: id,
      user_id: uid,
    }));
    const { error: memberError } = await supabaseAdmin.from("assignment_group_members").insert(memberRows);
    if (memberError) return res.status(500).json({ message: "Failed to assign students to groups", error: memberError.message });

    res.status(201).json({ groups, memberCount: memberRows.length });
  }),
);

// ============================================================================
// GROUP MEETINGS (Zoom)
// ============================================================================

router.post(
  "/assignments/:id/groups/:groupId/meeting",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, groupId } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (assignment.group_mode !== "group" || !assignment.allow_group_meetings) {
      return res.status(400).json({ message: "Group meetings are not enabled for this assignment" });
    }

    const bodySchema = z.object({ scheduledStart: z.string().datetime(), scheduledEnd: z.string().datetime() });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });
    const { scheduledStart, scheduledEnd } = parsed.data;

    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    if (end <= start) return res.status(400).json({ message: "End time must be after start time" });

    const { data: group } = await supabaseAdmin.from("assignment_groups").select("*").eq("id", groupId).single();
    if (!group || group.assignment_id !== id) return res.status(404).json({ message: "Group not found" });

    const zoomService = getZoomService();
    if (!zoomService) return res.status(503).json({ message: "Live meetings feature is not configured." });

    const { data: instructor } = await supabaseAdmin.from("users").select("email").eq("id", userId).single();
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });

    try {
      const durationMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
      const zoomMeeting = await zoomService.createMeeting(instructor.email, {
        topic: `${assignment.title} — ${group.name}`,
        type: 2,
        start_time: start.toISOString().slice(0, 19),
        duration: durationMinutes,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
        },
      });

      const { data: meeting, error } = await supabaseAdmin
        .from("assignment_group_meetings")
        .insert({
          assignment_id: id,
          group_id: groupId,
          instructor_id: userId,
          zoom_meeting_id: zoomMeeting.id,
          zoom_join_url: zoomMeeting.join_url,
          zoom_start_url: zoomMeeting.start_url,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
        })
        .select()
        .single();

      if (error) {
        await zoomService.deleteMeeting(zoomMeeting.id, false);
        return res.status(500).json({ message: "Failed to save meeting", error: error.message });
      }
      res.status(201).json(meeting);
    } catch (err: any) {
      console.error("Error creating group meeting:", err);
      res.status(500).json({ message: "Failed to create Zoom meeting", error: err.message });
    }
  }),
);

router.delete(
  "/assignments/:id/groups/:groupId/meeting/:meetingId",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, meetingId } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { data: meeting } = await supabaseAdmin.from("assignment_group_meetings").select("*").eq("id", meetingId).single();
    if (!meeting || meeting.assignment_id !== id) return res.status(404).json({ message: "Meeting not found" });

    const zoomService = getZoomService();
    if (zoomService && meeting.zoom_meeting_id) {
      try {
        await zoomService.deleteMeeting(meeting.zoom_meeting_id, true);
      } catch (err) {
        console.error("Failed to delete Zoom meeting:", err);
      }
    }

    const { error } = await supabaseAdmin.from("assignment_group_meetings").update({ status: "cancelled" }).eq("id", meetingId);
    if (error) return res.status(500).json({ message: "Failed to cancel meeting" });
    res.json({ message: "Meeting cancelled" });
  }),
);

// ============================================================================
// GRADING
// ============================================================================

router.post(
  "/assignment-submissions/:submissionId/grade",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { submissionId } = req.params;
    const userId = req.user.claims.sub;

    const { data: submission } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("id", submissionId)
      .single();
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    if (!(await canManageAssignment(submission.assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const bodySchema = z.object({
      score: z.number().min(0).max(submission.assignment.max_score ?? 100),
      feedback: z.string().max(5000).optional().default(""),
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", details: parsed.error.errors });

    const graded = await storage.gradeAssignment(submissionId, parsed.data.score, parsed.data.feedback, userId);
    res.json(graded);
  }),
);

router.get(
  "/assignments/:id/submissions",
  requireSupabaseAuth,
  requireInstructor(),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user.claims.sub;
    const assignment = await loadAssignment(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    if (!(await canManageAssignment(assignment, userId, req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { data: submissions, error } = await supabaseAdmin
      .from("assignment_submissions")
      .select("*, user:users(id, first_name, last_name), group:assignment_groups(id, name)")
      .eq("assignment_id", id);
    if (error) return res.status(500).json({ message: "Failed to load submissions" });

    if (assignment.group_mode === "group") {
      const groupIds = (submissions || []).map((s: any) => s.group_id).filter(Boolean);
      const { data: members } = groupIds.length
        ? await supabaseAdmin
            .from("assignment_group_members")
            .select("group_id, user:users(id, first_name, last_name)")
            .in("group_id", groupIds)
        : { data: [] as any[] };
      const membersByGroup = new Map<string, any[]>();
      for (const m of members || []) {
        const list = membersByGroup.get(m.group_id) || [];
        list.push(m.user);
        membersByGroup.set(m.group_id, list);
      }
      const enriched = (submissions || []).map((s: any) => ({ ...s, groupMembers: membersByGroup.get(s.group_id) || [] }));
      return res.json(enriched);
    }

    res.json(submissions || []);
  }),
);

export default router;

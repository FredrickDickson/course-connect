## Goal

Rebuild `/learn/:courseId/:lessonId` as a Udemy-style course player matching the spec, reusing existing tables (`courses`, `modules`, `lessons`, `enrollments`, `progress`) and the new Udemy-style `VideoPlayer` component already in place.

Map of spec → existing schema:

```text
course_sections   → modules
course_lessons    → lessons (lesson_type = content_type)
lesson_progress   → progress  (already has user_id, lesson_id, watch_time_seconds, completed, last_watched_at)
```

## Database migration (additive only)

New tables (RLS enabled on all):

- `lesson_notes` (id, user_id, lesson_id FK lessons, content text, video_timestamp_seconds int null) — owner-only RLS (`auth.uid() = user_id`)
- `lesson_questions` (id, lesson_id, author_id, title, body, is_answered bool default false) — SELECT for course instructor + admin + enrolled users (use existing `user_can_view_lesson` helper); INSERT/UPDATE by author
- `lesson_question_replies` (id, question_id FK, author_id, body, is_instructor_reply bool) — same SELECT scope; INSERT by author; UPDATE/DELETE by author
- `lesson_resources` (id, lesson_id, name, file_url, file_size_mb numeric, resource_type text) — SELECT same as lesson visibility; INSERT/UPDATE/DELETE by course owner via `user_owns_lesson`
- `course_announcements` (id, course_id, author_id, title, body) — SELECT for enrolled + instructor + admin; INSERT/UPDATE/DELETE by course instructor + admin
- `announcement_reads` (user_id, announcement_id, read_at) PK(user_id, announcement_id) — owner-only

Add columns:
- `lessons.is_preview boolean default false`

Storage:
- Reuse existing `course-videos` (private) and add new `lesson-resources` bucket (private) for PDF/slide attachments. RLS: enrolled users can read; instructors can write to their own course paths.

## Frontend (`client/src/pages/video-player.tsx` rewrite)

Strip current `<Header />` + 3-col grid layout. New full-viewport shell:

```text
<div h-screen flex flex-col bg-white>
  <CourseTopBar />                              ← h-14 #1C1D1F
  <div flex-1 flex overflow-hidden>
    <main flex-1 flex flex-col overflow-y-auto>
      <VideoStage />                            ← black, aspect-video
      <LessonHeader />                          ← Section · Lesson title
      <LessonNav />                             ← Prev / Next
      <ContentTabs />                           ← 5 tabs
    </main>
    <CourseSidebar />                           ← w-[380px] dark, sticky on lg+
  </div>
</div>
```

### New components in `client/src/components/learn/`

1. `course-top-bar.tsx` — back arrow → `/dashboard`, truncated title (max 50 chars + "..."), level badge (course.level → ACIMArb/MCIMArb/FCIMArb), centered progress bar with "X / Y lessons completed", Your Progress dropdown (DropdownMenu), Share button (clipboard), more-options menu (Download resources / Report issue / Contact instructor → mailto for now)

2. `course-sidebar.tsx` — header "Course content" + collapse X button (lifts a `sidebarOpen` state in parent). Course progress summary block. Accordion of sections; each section shows "X / Y · totalMin", "Complete" green badge if all done. Lesson rows: checkbox + lesson type icon (Video/PDF/Quiz/Assignment), number + title, duration. Active lesson: 3px crimson left border + bg `#2D2F31` + bold. Completed: green check. Clicking checkbox calls `markComplete(lesson.id, !done)` independently of video.

3. `lesson-video.tsx` — wraps `<VideoPlayer>` (already Udemy-style). Passes `onPrev`/`onNext` so the player's side arrows navigate lessons. On `onTimeUpdate` debounced every 10s, upserts `progress` (existing logic preserved). On `currentTime ≥ 0.9 * duration` → marks complete once. On `onEnded` → show "Up next in 5s" overlay (5-sec countdown, Play now / Cancel buttons) — implemented as an absolute overlay inside the video stage.

4. `lesson-nav.tsx` — Prev / Next buttons with titles, disabled at boundaries.

5. `content-tabs.tsx` — Tabs (Overview / Q&A / Notes / Announcements / Resources):
   - Overview: course description + what-you'll-learn (course.objectives) + instructor card + requirements
   - Q&A: list `lesson_questions` for current lesson, "+ Ask a Question" dialog, replies inline with "Instructor ★" badge; search + filter (All / Mine / Unanswered)
   - Notes: textarea (no rich text yet — out of scope), "+ Note at MM:SS" button captures current player time, list ordered by `video_timestamp_seconds`, "Download all notes as PDF" via existing `jsPDF`
   - Announcements: list `course_announcements`; mark read via `announcement_reads` upsert on view; unread red dot
   - Resources: list `lesson_resources` + course-level announcement attachments; download via signed URLs

6. `course-complete-modal.tsx` — Dialog shown when completed-count === total-lessons (only first time): 🎉 + course name, Download Certificate (link to existing certificate generator), Share on LinkedIn (URL share), Browse next-level link

### State / data hooks

- Reuse existing `course` + `enrollment` + `progress` queries
- New queries: `lesson_notes` (filtered by user + lesson), `lesson_questions` + replies (lesson scope), `lesson_resources` (lesson scope), `course_announcements` + `announcement_reads` (course scope)
- New mutations: `markComplete`, `addNote`, `deleteNote`, `askQuestion`, `replyQuestion`, `markAnnouncementRead`

### Mobile (`<lg`)

- Sidebar hides; Tabs gain a 6th leading tab "Course content" that renders `<CourseSidebar />` inline
- Bottom tab bar uses existing shadcn `TabsList` (sticky bottom on mobile only)
- Min 44px tap targets (already set in player); swipe between lessons uses simple `onTouchStart/End` delta on the video stage → calls prev/next

## Out of scope (call out to user)

- Drag-and-drop curriculum reorder in admin (kept as separate task — `/admin/courses/[id]/content` already exists via `course-curriculum.tsx`; we'll just add the `is_preview` toggle and resources/announcements forms there)
- Rich text editor for notes (plain textarea now)
- Real-time announcements (poll on tab open)
- Auto-detect video duration from URL (admin enters manually)
- Ticket system for "Report an issue" (uses mailto)

## Files to create / edit

Create:
- `supabase/migrations/<timestamp>_learn_interface.sql`
- `client/src/components/learn/course-top-bar.tsx`
- `client/src/components/learn/course-sidebar.tsx`
- `client/src/components/learn/lesson-video.tsx`
- `client/src/components/learn/lesson-nav.tsx`
- `client/src/components/learn/content-tabs.tsx`
- `client/src/components/learn/course-complete-modal.tsx`
- `client/src/components/learn/up-next-overlay.tsx`

Edit:
- `client/src/pages/video-player.tsx` (rewritten, much smaller — composes new components)
- `client/src/pages/course-curriculum.tsx` (add `is_preview` toggle + resources/announcements panels — minimal)

## Acceptance

After build, in preview at desktop / tablet / mobile:
1. Topbar shows course title, level badge, live progress, Your Progress dropdown
2. Sidebar accordion shows section completion badges, active lesson has crimson left border, checkbox toggles completion and updates topbar progress instantly
3. Video player (already Udemy-style) plays Supabase-hosted MP4 / YouTube / Vimeo; 90% watched marks lesson complete; "Up next" overlay appears on `ended`
4. All 5 tabs render with real data; Q&A post + reply works; Notes save with timestamp; Announcements marked read; Resources downloadable
5. Mobile collapses sidebar into a tab; controls remain tappable
6. Course-complete modal appears once when 100% reached

Approve and I'll run the migration and build the components in one pass.

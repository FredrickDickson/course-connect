/**
 * Admin Assignments Management Page
 * Central hub for managing all assignments across all courses
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Search,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Filter,
  TrendingUp,
  BookOpen,
  Edit,
  Loader2,
} from "lucide-react";
import { format, isPast, isToday, isFuture } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  max_score: number | null;
  is_required: boolean | null;
  allow_late_submission: boolean | null;
  created_at: string | null;
  lesson: {
    id: string;
    title: string;
    module: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
      };
    };
  } | null;
  submission_stats?: {
    total_students: number;
    submitted: number;
    graded: number;
    pending: number;
  };
}

interface AssignmentStats {
  total_assignments: number;
  active_assignments: number;
  overdue_assignments: number;
  total_submissions: number;
  pending_grading: number;
  average_completion_rate: number;
}

export default function AdminAssignmentsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("all");

  // Fetch all assignments with relations
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["admin_assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          id,
          title,
          description,
          due_date,
          max_score,
          is_required,
          allow_late_submission,
          created_at,
          lesson:lessons (
            id,
            title,
            module:modules (
              id,
              title,
              course:courses (
                id,
                title
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch submission stats for each assignment
      const assignmentsWithStats = await Promise.all(
        (data || []).map(async (assignment) => {
          // Skip if lesson data is missing
          if (!assignment.lesson?.module?.course?.id) {
            return {
              ...assignment,
              submission_stats: {
                total_students: 0,
                submitted: 0,
                graded: 0,
                pending: 0,
              },
            };
          }

          // Get total enrolled students for the course
          const { count: totalStudents } = await supabase
            .from("enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", assignment.lesson.module.course.id)
            .eq("status", "ACTIVE");

          // Get submission stats
          const { data: submissions } = await supabase
            .from("assignment_submissions")
            .select("id, score")
            .eq("assignment_id", assignment.id);

          const submitted = submissions?.length || 0;
          const graded = submissions?.filter(s => s.score !== null).length || 0;

          return {
            ...assignment,
            submission_stats: {
              total_students: totalStudents || 0,
              submitted,
              graded,
              pending: submitted - graded,
            },
          };
        })
      );

      return assignmentsWithStats as Assignment[];
    },
  });

  // Fetch courses for filter
  const { data: courses } = useQuery({
    queryKey: ["admin_courses_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Calculate statistics
  const stats: AssignmentStats = {
    total_assignments: assignments?.length || 0,
    active_assignments: assignments?.filter(a => !a.due_date || isFuture(new Date(a.due_date))).length || 0,
    overdue_assignments: assignments?.filter(a => a.due_date && isPast(new Date(a.due_date))).length || 0,
    total_submissions: assignments?.reduce((sum, a) => sum + (a.submission_stats?.submitted || 0), 0) || 0,
    pending_grading: assignments?.reduce((sum, a) => sum + (a.submission_stats?.pending || 0), 0) || 0,
    average_completion_rate: assignments?.length 
      ? Math.round(
          (assignments.reduce((sum, a) => {
            const stats = a.submission_stats;
            if (!stats || stats.total_students === 0) return sum;
            return sum + (stats.submitted / stats.total_students);
          }, 0) / assignments.length) * 100
        )
      : 0,
  };

  // Filter assignments
  const filteredAssignments = assignments?.filter((assignment: Assignment) => {
    // Skip assignments with missing lesson data
    if (!assignment.lesson?.module?.course) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !assignment.title.toLowerCase().includes(query) &&
        !assignment.lesson.title.toLowerCase().includes(query) &&
        !assignment.lesson.module.course.title.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Course filter
    if (courseFilter !== "all" && assignment.lesson.module.course.id !== courseFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active" && assignment.due_date && isPast(new Date(assignment.due_date))) {
        return false;
      }
      if (statusFilter === "overdue" && (!assignment.due_date || !isPast(new Date(assignment.due_date)))) {
        return false;
      }
      if (statusFilter === "no_due_date" && assignment.due_date) {
        return false;
      }
    }

    // Tab filter
    if (selectedTab === "pending") {
      return (assignment.submission_stats?.pending || 0) > 0;
    }
    if (selectedTab === "overdue" && (!assignment.due_date || !isPast(new Date(assignment.due_date)))) {
      return false;
    }

    return true;
  });

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) {
      return <Badge variant="secondary" className="text-xs">No Due Date</Badge>;
    }

    const date = new Date(dueDate);
    if (isPast(date)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-orange-500 text-white text-xs">Due Today</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Upcoming</Badge>;
  };

  const getCompletionRate = (stats?: Assignment["submission_stats"]) => {
    if (!stats || stats.total_students === 0) return 0;
    return Math.round((stats.submitted / stats.total_students) * 100);
  };

  const navigateToAssignment = (assignment: Assignment) => {
    // Navigate to the course editor with the lesson and assignment pre-selected
    if (!assignment.lesson?.module?.course?.id) return;
    setLocation(`/admin?tab=courses&course=${assignment.lesson.module.course.id}&lesson=${assignment.lesson.id}&content=assignment`);
  };

  if (assignmentsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2c2015] font-sf-pro-display">
              Assignments Management
            </h1>
            <p className="text-[#6b5d4f] mt-1">
              Manage all assignments, track submissions, and grade student work
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2c2015]">{stats.total_assignments}</div>
            </CardContent>
          </Card>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_assignments}</div>
            </CardContent>
          </Card>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#5A2633]">{stats.overdue_assignments}</div>
            </CardContent>
          </Card>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <Users className="h-4 w-4" />
                Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2c2015]">{stats.total_submissions}</div>
            </CardContent>
          </Card>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Grading
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending_grading}</div>
            </CardContent>
          </Card>

          <Card className="border-[#d4c5b0]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-[#6b5d4f] flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#2c2015]">{stats.average_completion_rate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-[#d4c5b0]/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b6f47]" />
                <Input
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#d4c5b0]"
                />
              </div>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="border-[#d4c5b0]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-[#d4c5b0]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="no_due_date">No Due Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-[#faf9f6] border border-[#d4c5b0]/30">
            <TabsTrigger value="all">All Assignments</TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              Pending Grading
              {stats.pending_grading > 0 && (
                <Badge className="ml-2 bg-orange-500 text-white text-xs px-1.5 py-0">
                  {stats.pending_grading}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="relative">
              Overdue
              {stats.overdue_assignments > 0 && (
                <Badge className="ml-2 bg-[#5A2633] text-white text-xs px-1.5 py-0">
                  {stats.overdue_assignments}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="mt-6">
            <Card className="border-[#d4c5b0]/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{filteredAssignments?.length || 0} Assignments</span>
                </CardTitle>
                <CardDescription>
                  Click on any assignment to edit or view details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAssignments && filteredAssignments.length > 0 ? (
                  <div className="rounded-lg border border-[#d4c5b0]/30 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#faf9f6]">
                          <TableHead className="font-semibold">Assignment</TableHead>
                          <TableHead className="font-semibold">Course / Lesson</TableHead>
                          <TableHead className="font-semibold">Due Date</TableHead>
                          <TableHead className="font-semibold">Max Score</TableHead>
                          <TableHead className="font-semibold">Submissions</TableHead>
                          <TableHead className="font-semibold">Completion</TableHead>
                          <TableHead className="font-semibold text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((assignment: Assignment) => {
                          const completionRate = getCompletionRate(assignment.submission_stats);
                          // Skip if lesson data is missing
                          if (!assignment.lesson?.module?.course) return null;
                          
                          return (
                            <TableRow 
                              key={assignment.id}
                              className="hover:bg-[#faf9f6] cursor-pointer"
                              onClick={() => navigateToAssignment(assignment)}
                            >
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-[#2c2015] flex items-center gap-2">
                                    {assignment.title}
                                    {assignment.is_required && (
                                      <Badge variant="outline" className="text-xs bg-red-50 text-[#5A2633] border-red-200">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                  {assignment.description && (
                                    <div className="text-xs text-[#6b5d4f] line-clamp-1">
                                      {assignment.description}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-[#2c2015] flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {assignment.lesson.module.course.title}
                                  </div>
                                  <div className="text-xs text-[#6b5d4f]">
                                    {assignment.lesson.title}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {assignment.due_date ? (
                                    <>
                                      <div className="text-sm text-[#2c2015]">
                                        {format(new Date(assignment.due_date), "MMM d, yyyy")}
                                      </div>
                                      <div className="text-xs text-[#6b5d4f]">
                                        {format(new Date(assignment.due_date), "h:mm a")}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-sm text-[#8b6f47]">No due date</span>
                                  )}
                                  {getDueDateBadge(assignment.due_date)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium text-[#2c2015]">{assignment.max_score || 100} pts</span>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-[#2c2015]">
                                    {assignment.submission_stats?.submitted || 0} / {assignment.submission_stats?.total_students || 0}
                                  </div>
                                  {(assignment.submission_stats?.pending || 0) > 0 && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                      {assignment.submission_stats?.pending} pending
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        completionRate >= 80 ? 'bg-green-500' :
                                        completionRate >= 50 ? 'bg-yellow-500' :
                                        'bg-[#5A2633]'
                                      }`}
                                      style={{ width: `${completionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-[#2c2015] w-10 text-right">
                                    {completionRate}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToAssignment(assignment);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-[#8b6f47] opacity-50 mb-4" />
                    <h3 className="text-lg font-semibold text-[#2c2015] mb-2">
                      No assignments found
                    </h3>
                    <p className="text-[#6b5d4f] mb-4">
                      {searchQuery || courseFilter !== "all" || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Create assignments within course lessons to get started"}
                    </p>
                    <Button
                      onClick={() => setLocation("/admin?tab=courses")}
                      className="bg-[#5A2633] hover:bg-[#5A2633]"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Go to Courses
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import AdminMembershipTable from "@/components/admin-membership-table";
import AdminEnrollmentsTable from "@/components/admin-enrollments-table";
import AdminRenewalManagement from "@/components/admin-renewal-management";
import AdminOverviewStats from "@/components/admin-overview-stats";
import AdminCoursesTable from "@/components/admin-courses-table";
import AdminNotifications from "@/components/admin-notifications";
import AdminCourseTemplates from "@/components/admin-course-templates";
import AdminUsersProfiles from "@/components/admin-users-profiles";
import {
  Users,
  BookOpen,
  UserCheck,
  UserX,
  Eye,
  Download,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  FileText,
  Video,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  UserPlus,
  Shield,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types for Supabase query results
interface SupabaseApplication {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string;
  experience: string;
  qualifications: string;
  previous_teaching: string;
  areas_of_expertise: string[];
  cv_url: string | null;
  video_intro_url: string | null;
  status: "pending" | "approved" | "rejected" | string | null;
  submitted_at: string | null;
  review_comments: string | null;
}

export default function AdminDashboard() {
  const {
    isLoading: authLoading,
    hasAccess,
    user,
  } = useRoleProtection({
    requiredRole: "admin",
    showToast: false,
  });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewComments, setReviewComments] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Fetch stats for pending badge
  const { data: pendingCount } = useQuery({
    queryKey: ["admin_pending_count"],
    enabled: hasAccess,
    queryFn: async () => {
      const { count } = await supabase
        .from("instructor_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  // Fetch instructor applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ["admin_instructor_applications"],
    enabled: hasAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructor_applications")
        .select("*")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin_users"],
    enabled: hasAccess && activeTab === "users",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const allUsers = usersData || [];

  // Approve/Reject application
  const reviewApplication = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      comments,
    }: {
      applicationId: string;
      status: "approved" | "rejected";
      comments: string;
    }) => {
      const res = await apiRequest(
        "PUT",
        `/api/admin/instructor-applications/${applicationId}`,
        { status, comments }
      );
      return await res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin_instructor_applications"] });
      qc.invalidateQueries({ queryKey: ["admin_pending_count"] });
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({
        title:
          variables.status === "approved"
            ? "Instructor Approved!"
            : "Application Rejected",
      });
      setReviewComments("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const changeUserRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role: newRole });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      toast({ title: "Role Updated", description: `User role changed to ${variables.newRole}.` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateAdmin = async () => {
    if (!newAdmin.firstName || !newAdmin.lastName || !newAdmin.email || !newAdmin.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    if (newAdmin.password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setIsCreatingAdmin(true);
    try {
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          email: newAdmin.email,
          password: newAdmin.password,
          role: "admin",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create admin");
      }
      toast({ title: "Admin Created", description: `${newAdmin.firstName} ${newAdmin.lastName} has been added as an admin.` });
      setNewAdmin({ firstName: "", lastName: "", email: "", password: "" });
      setShowCreateAdmin(false);
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    } catch (error: unknown) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Could not create admin",
        variant: "destructive",
      });
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const pendingApps = applications.filter((a) => a.status === "pending");
  const reviewedApps = applications.filter((a) => a.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage instructors, courses, and platform operations
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <AdminNotifications />
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto p-1 gap-1">
              <TabsTrigger value="overview" className="text-sm px-4 py-2">Overview</TabsTrigger>
              <TabsTrigger value="enrollments" className="text-sm px-4 py-2">Enrollments</TabsTrigger>
              <TabsTrigger value="courses" className="text-sm px-4 py-2">Courses</TabsTrigger>
              <TabsTrigger value="templates" className="text-sm px-4 py-2">Templates</TabsTrigger>
              <TabsTrigger value="members" className="text-sm px-4 py-2">Members</TabsTrigger>
              <TabsTrigger value="renewals" className="text-sm px-4 py-2">Renewals</TabsTrigger>
              <TabsTrigger value="applications" className="text-sm px-4 py-2 relative">
                Applications
                {(pendingCount || 0) > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="text-sm px-4 py-2">Users</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab — Year selector, charts, YoY */}
          <TabsContent value="overview">
            <AdminOverviewStats />
          </TabsContent>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments">
            <AdminEnrollmentsTable />
          </TabsContent>

          {/* Courses Tab — Enhanced with capacity bars */}
          <TabsContent value="courses">
            <AdminCoursesTable />
          </TabsContent>

          {/* Templates Tab — Reusable course templates & cohort system */}
          <TabsContent value="templates">
            <AdminCourseTemplates />
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <AdminMembershipTable />
          </TabsContent>

          {/* Renewals Tab */}
          <TabsContent value="renewals">
            <AdminRenewalManagement />
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Instructor Applications</h2>
              <Badge variant="secondary">{pendingApps.length} pending</Badge>
            </div>

            {applicationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-20 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-muted-foreground">
                    Instructor applications will appear here for review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingApps.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-foreground">Pending Review</h3>
                    {pendingApps.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        reviewComments={reviewComments}
                        setReviewComments={setReviewComments}
                        onReview={(status) =>
                          reviewApplication.mutate({
                            applicationId: app.id,
                            status,
                            comments: reviewComments,
                          })
                        }
                        isPending={reviewApplication.isPending}
                      />
                    ))}
                  </>
                )}
                {reviewedApps.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mt-8">Reviewed</h3>
                    {reviewedApps.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        reviewComments={reviewComments}
                        setReviewComments={setReviewComments}
                        onReview={() => {}}
                        isPending={false}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <AdminUsersProfiles />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ApplicationCard({
  application,
  reviewComments,
  setReviewComments,
  onReview,
  isPending,
}: {
  application: SupabaseApplication;
  reviewComments: string;
  setReviewComments: (v: string) => void;
  onReview: (status: "approved" | "rejected") => void;
  isPending: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
  };
  const StatusIcon = statusIcons[application.status || "pending"] || Clock;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {application.first_name} {application.last_name}
              </h3>
              <p className="text-sm text-muted-foreground">{application.email}</p>
            </div>
          </div>
          <Badge className={statusColors[application.status || "pending"] || statusColors.pending}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {(application.status || "pending").charAt(0).toUpperCase() +
              (application.status || "pending").slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            Applied{" "}
            {application.submitted_at
              ? new Date(application.submitted_at).toLocaleDateString()
              : "N/A"}
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <GraduationCap className="w-4 h-4 mr-2" />
            {application.areas_of_expertise?.join(", ") || "N/A"}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{application.bio}</p>

        {application.review_comments && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Admin Review:</p>
            <p className="text-sm">{application.review_comments}</p>
          </div>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">
              <Eye className="w-3 h-3 mr-1" />
              Review
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Instructor Application - {application.first_name} {application.last_name}
              </DialogTitle>
              <DialogDescription>
                Review the application details and approve or reject.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-muted-foreground">
                    {application.first_name} {application.last_name}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{application.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-muted-foreground">{application.phone}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expertise</Label>
                  <p className="text-sm text-muted-foreground">
                    {application.areas_of_expertise?.join(", ")}
                  </p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Bio</Label>
                <p className="text-sm text-muted-foreground mt-1">{application.bio}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Professional Experience</Label>
                <p className="text-sm text-muted-foreground mt-1">{application.experience}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Qualifications</Label>
                <p className="text-sm text-muted-foreground mt-1">{application.qualifications}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Teaching Experience</Label>
                <p className="text-sm text-muted-foreground mt-1">{application.previous_teaching}</p>
              </div>

              {/* CV and Video */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Uploaded Documents</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">CV / Resume</span>
                    </div>
                    {application.cv_url ? (
                      <a href={application.cv_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          View CV
                        </Button>
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not uploaded</p>
                    )}
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Video className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Video Introduction</span>
                    </div>
                    {application.video_intro_url ? (
                      <div className="space-y-2">
                        <video controls className="w-full rounded max-h-40" src={application.video_intro_url} />
                        <a href={application.video_intro_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Open Full Screen
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Not uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {application.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label>Review Comments</Label>
                    <Textarea
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      placeholder="Add comments about your decision..."
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700" disabled={isPending}>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Instructor Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will grant {application.first_name} instructor access to create and
                            manage courses.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onReview("approved")}>
                            Approve
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isPending}>
                          <UserX className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onReview("rejected")}>
                            Reject
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

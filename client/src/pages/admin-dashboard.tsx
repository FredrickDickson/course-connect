// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRoleProtection } from "@/hooks/useRoleProtection";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, BookOpen, UserCheck, UserX, Eye, Download, Calendar, Mail, Phone,
  GraduationCap, FileText, Video, CheckCircle, XCircle, Clock, AlertCircle,
  TrendingUp, DollarSign, UserPlus, Shield
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const { isLoading: authLoading, hasAccess, user } = useRoleProtection({ requiredRole: 'admin' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [reviewComments, setReviewComments] = useState("");
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // Fetch stats from Supabase
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    enabled: hasAccess,
    queryFn: async () => {
      const [usersRes, instructorsRes, pendingRes, coursesRes, studentsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'instructor'),
        supabase.from('instructor_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
      ]);
      return {
        totalUsers: usersRes.count || 0,
        totalInstructors: instructorsRes.count || 0,
        pendingApplications: pendingRes.count || 0,
        totalCourses: coursesRes.count || 0,
        activeStudents: studentsRes.count || 0,
      };
    },
  });

  // Fetch instructor applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery({
    queryKey: ['admin-applications'],
    enabled: hasAccess,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_applications')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all users
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    enabled: hasAccess && activeTab === 'users',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all courses
  const { data: allCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['admin-courses'],
    enabled: hasAccess && activeTab === 'courses',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:users!courses_instructor_id_fkey(first_name, last_name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Approve/Reject application mutation
  const reviewApplication = useMutation({
    mutationFn: async ({ applicationId, userId, status, comments }: {
      applicationId: string;
      userId: string;
      status: 'approved' | 'rejected';
      comments: string;
    }) => {
      // Update application status
      const { error: appError } = await supabase
        .from('instructor_applications')
        .update({
          status,
          review_comments: comments,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      // If approved, update user role to instructor
      if (status === 'approved' && userId) {
        const { error: roleError } = await supabase
          .from('users')
          .update({ role: 'instructor' })
          .eq('id', userId);

        if (roleError) throw roleError;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['admin-applications'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: variables.status === 'approved' ? "Instructor Approved!" : "Application Rejected",
        description: variables.status === 'approved'
          ? "The instructor can now access the instructor dashboard and create courses."
          : "The applicant has been notified.",
      });
      setReviewComments("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) return null;

  const pendingApps = applications.filter((a: any) => a.status === 'pending');
  const reviewedApps = applications.filter((a: any) => a.status !== 'pending');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage instructors, courses, and platform operations</p>
          </div>
          <Badge variant="outline" className="mt-4 sm:mt-0">
            <AlertCircle className="w-3 h-3 mr-1" />
            Admin Access
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">
              Applications
              {(stats?.pendingApplications || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {stats?.pendingApplications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Users, title: "Total Users", value: stats?.totalUsers || 0, subtitle: "Registered users" },
                { icon: GraduationCap, title: "Active Instructors", value: stats?.totalInstructors || 0, subtitle: "Approved instructors" },
                { icon: Clock, title: "Pending Applications", value: stats?.pendingApplications || 0, subtitle: "Awaiting review" },
                { icon: BookOpen, title: "Total Courses", value: stats?.totalCourses || 0, subtitle: "Published courses" },
                { icon: TrendingUp, title: "Enrollments", value: stats?.activeStudents || 0, subtitle: "Total enrollments" },
              ].map(({ icon: Icon, title, value, subtitle }) => (
                <Card key={title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Instructor Applications</h2>
              <Badge variant="secondary">{pendingApps.length} pending</Badge>
            </div>

            {applicationsLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent>
                  </Card>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-muted-foreground">Instructor applications will appear here for review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Pending first */}
                {pendingApps.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-foreground">Pending Review</h3>
                    {pendingApps.map((app: any) => (
                      <ApplicationCard
                        key={app.id}
                        application={app}
                        reviewComments={reviewComments}
                        setReviewComments={setReviewComments}
                        onReview={(status) => reviewApplication.mutate({
                          applicationId: app.id,
                          userId: app.user_id,
                          status,
                          comments: reviewComments,
                        })}
                        isPending={reviewApplication.isPending}
                      />
                    ))}
                  </>
                )}
                {reviewedApps.length > 0 && (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mt-8">Reviewed</h3>
                    {reviewedApps.map((app: any) => (
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
            <h2 className="text-2xl font-bold">User Management</h2>
            {usersLoading ? (
              <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Name</th>
                          <th className="text-left p-4 font-medium">Email</th>
                          <th className="text-left p-4 font-medium">Role</th>
                          <th className="text-left p-4 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers.map((u: any) => (
                          <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-4">{u.first_name} {u.last_name}</td>
                            <td className="p-4 text-muted-foreground">{u.email}</td>
                            <td className="p-4">
                              <Badge variant={u.role === 'admin' ? 'default' : u.role === 'instructor' ? 'secondary' : 'outline'}>
                                {u.role}
                              </Badge>
                            </td>
                            <td className="p-4 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <h2 className="text-2xl font-bold">Course Management</h2>
            {coursesLoading ? (
              <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
            ) : allCourses.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
                  <p className="text-muted-foreground">Courses will appear here once instructors create them.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Title</th>
                          <th className="text-left p-4 font-medium">Instructor</th>
                          <th className="text-left p-4 font-medium">Price</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Enrollments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCourses.map((c: any) => (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-4 font-medium">{c.title}</td>
                            <td className="p-4 text-muted-foreground">
                              {c.instructor?.first_name} {c.instructor?.last_name}
                            </td>
                            <td className="p-4">${c.price}</td>
                            <td className="p-4">
                              <Badge variant={c.is_published ? 'default' : 'outline'}>
                                {c.is_published ? 'Published' : 'Draft'}
                              </Badge>
                            </td>
                            <td className="p-4">{c.enrollment_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ApplicationCard({ application, reviewComments, setReviewComments, onReview, isPending }: {
  application: any;
  reviewComments: string;
  setReviewComments: (v: string) => void;
  onReview: (status: 'approved' | 'rejected') => void;
  isPending: boolean;
}) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800"
  };
  const statusIcons: Record<string, any> = { pending: Clock, approved: CheckCircle, rejected: XCircle };
  const StatusIcon = statusIcons[application.status] || Clock;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{application.first_name} {application.last_name}</h3>
              <p className="text-sm text-muted-foreground">{application.email}</p>
            </div>
          </div>
          <Badge className={statusColors[application.status] || ""}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {application.status?.charAt(0).toUpperCase() + application.status?.slice(1)}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-2" />
            Applied {new Date(application.submitted_at).toLocaleDateString()}
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
            <Button size="sm"><Eye className="w-3 h-3 mr-1" />Review</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Instructor Application - {application.first_name} {application.last_name}</DialogTitle>
              <DialogDescription>Review the application details and approve or reject.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium">Name</Label><p className="text-sm text-muted-foreground">{application.first_name} {application.last_name}</p></div>
                <div><Label className="text-sm font-medium">Email</Label><p className="text-sm text-muted-foreground">{application.email}</p></div>
                <div><Label className="text-sm font-medium">Phone</Label><p className="text-sm text-muted-foreground">{application.phone}</p></div>
                <div><Label className="text-sm font-medium">Expertise</Label><p className="text-sm text-muted-foreground">{application.areas_of_expertise?.join(", ")}</p></div>
              </div>
              <div><Label className="text-sm font-medium">Bio</Label><p className="text-sm text-muted-foreground mt-1">{application.bio}</p></div>
              <div><Label className="text-sm font-medium">Professional Experience</Label><p className="text-sm text-muted-foreground mt-1">{application.experience}</p></div>
              <div><Label className="text-sm font-medium">Qualifications</Label><p className="text-sm text-muted-foreground mt-1">{application.qualifications}</p></div>
              <div><Label className="text-sm font-medium">Teaching Experience</Label><p className="text-sm text-muted-foreground mt-1">{application.previous_teaching}</p></div>

              {application.status === 'pending' && (
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
                          <UserCheck className="w-4 h-4 mr-2" />Approve
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Approve Instructor Application</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will grant {application.first_name} instructor access to create and manage courses. They will be redirected to the instructor dashboard on their next login.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onReview('approved')}>Approve</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isPending}>
                          <UserX className="w-4 h-4 mr-2" />Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Application</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onReview('rejected')}>Reject</AlertDialogAction>
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

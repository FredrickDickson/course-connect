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
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
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
  TrendingUp,
  DollarSign
} from "lucide-react";
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

interface InstructorApplication {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  experience: string;
  qualifications: string;
  previousTeaching: string;
  areasOfExpertise: string[];
  cvUrl?: string;
  videoIntroUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComments?: string;
}

interface AdminStats {
  totalUsers: number;
  totalInstructors: number;
  pendingApplications: number;
  totalCourses: number;
  monthlyRevenue: number;
  activeStudents: number;
}

export default function AdminDashboard() {
  const { isLoading: authLoading, hasAccess } = useRoleProtection({ 
    requiredRole: 'admin' 
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedApplication, setSelectedApplication] = useState<InstructorApplication | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: hasAccess,
  });

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<InstructorApplication[]>({
    queryKey: ['/api/admin/instructor-applications'],
    enabled: hasAccess,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: hasAccess,
  });

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/admin/courses'],
    enabled: hasAccess,
  });

  const reviewApplication = useMutation({
    mutationFn: async ({ applicationId, status, comments }: { 
      applicationId: string; 
      status: 'approved' | 'rejected'; 
      comments: string 
    }) => {
      await apiRequest("PUT", `/api/admin/instructor-applications/${applicationId}`, {
        status,
        comments
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/instructor-applications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({
        title: "Application Reviewed",
        description: "Instructor application has been processed successfully.",
      });
      setSelectedApplication(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to review application: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>;
  }

  if (!hasAccess) {
    return null; // Role protection will handle redirect
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, trend }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle: string;
    trend?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {trend && (
          <div className="flex items-center mt-2 text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ApplicationCard = ({ application }: { application: InstructorApplication }) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };

    const statusIcons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle
    };

    const StatusIcon = statusIcons[application.status];

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
                  {application.firstName} {application.lastName}
                </h3>
                <p className="text-sm text-muted-foreground">{application.email}</p>
              </div>
            </div>
            <Badge className={statusColors[application.status]}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Applied {new Date(application.submittedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <GraduationCap className="w-4 h-4 mr-2" />
              {application.areasOfExpertise.join(", ")}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {application.bio}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {application.cvUrl && (
                <Button size="sm" variant="outline">
                  <FileText className="w-3 h-3 mr-1" />
                  CV
                </Button>
              )}
              {application.videoIntroUrl && (
                <Button size="sm" variant="outline">
                  <Video className="w-3 h-3 mr-1" />
                  Video
                </Button>
              )}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => setSelectedApplication(application)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Review
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Instructor Application - {application.firstName} {application.lastName}
                  </DialogTitle>
                  <DialogDescription>
                    Review the application details and approve or reject the instructor.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Name</Label>
                        <p className="text-sm text-muted-foreground">
                          {application.firstName} {application.lastName}
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
                        <Label className="text-sm font-medium">Areas of Expertise</Label>
                        <p className="text-sm text-muted-foreground">
                          {application.areasOfExpertise.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label className="text-sm font-medium">Bio</Label>
                    <p className="text-sm text-muted-foreground mt-1">{application.bio}</p>
                  </div>

                  {/* Experience */}
                  <div>
                    <Label className="text-sm font-medium">Professional Experience</Label>
                    <p className="text-sm text-muted-foreground mt-1">{application.experience}</p>
                  </div>

                  {/* Qualifications */}
                  <div>
                    <Label className="text-sm font-medium">Qualifications</Label>
                    <p className="text-sm text-muted-foreground mt-1">{application.qualifications}</p>
                  </div>

                  {/* Teaching Experience */}
                  <div>
                    <Label className="text-sm font-medium">Previous Teaching Experience</Label>
                    <p className="text-sm text-muted-foreground mt-1">{application.previousTeaching}</p>
                  </div>

                  {/* Files */}
                  <div>
                    <Label className="text-sm font-medium">Attachments</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      {application.cvUrl && (
                        <Button variant="outline" size="sm">
                          <Download className="w-3 h-3 mr-1" />
                          Download CV
                        </Button>
                      )}
                      {application.videoIntroUrl && (
                        <Button variant="outline" size="sm">
                          <Video className="w-3 h-3 mr-1" />
                          View Video
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Review Actions */}
                  {application.status === 'pending' && (
                    <div className="flex items-center space-x-4 pt-4 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button className="bg-green-600 hover:bg-green-700">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Instructor Application</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to approve this instructor application? 
                              This will grant them access to create and manage courses.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => reviewApplication.mutate({
                                applicationId: application.id,
                                status: 'approved',
                                comments: 'Application approved by admin'
                              })}
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">
                            <UserX className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Instructor Application</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject this instructor application? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => reviewApplication.mutate({
                                applicationId: application.id,
                                status: 'rejected',
                                comments: 'Application rejected by admin'
                              })}
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage instructors, courses, and platform operations
            </p>
          </div>
          <Badge variant="outline" className="mt-4 sm:mt-0">
            <AlertCircle className="w-3 h-3 mr-1" />
            Admin Access
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                icon={Users}
                title="Total Users"
                value={stats?.totalUsers || 0}
                subtitle="Registered users"
                trend="+12% this month"
              />
              <StatCard
                icon={GraduationCap}
                title="Active Instructors"
                value={stats?.totalInstructors || 0}
                subtitle="Approved instructors"
                trend="+5% this month"
              />
              <StatCard
                icon={Clock}
                title="Pending Applications"
                value={stats?.pendingApplications || 0}
                subtitle="Awaiting review"
              />
              <StatCard
                icon={BookOpen}
                title="Total Courses"
                value={stats?.totalCourses || 0}
                subtitle="Published courses"
                trend="+8% this month"
              />
              <StatCard
                icon={DollarSign}
                title="Monthly Revenue"
                value={`$${stats?.monthlyRevenue?.toLocaleString() || 0}`}
                subtitle="Current month"
                trend="+15% vs last month"
              />
              <StatCard
                icon={TrendingUp}
                title="Active Students"
                value={stats?.activeStudents || 0}
                subtitle="Last 30 days"
                trend="+22% this month"
              />
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activities and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm">New instructor application from Sarah Johnson</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm">Course "Advanced Arbitration" published by Michael Chen</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm">Payment issue reported by student Emma Davis</p>
                      <p className="text-xs text-muted-foreground">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Instructor Applications</h2>
              <Badge variant="secondary">
                {applications.filter(app => app.status === 'pending').length} pending
              </Badge>
            </div>

            {applicationsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No applications yet</h3>
                  <p className="text-muted-foreground">
                    Instructor applications will appear here for review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Input placeholder="Search users..." className="max-w-sm" />
            </div>

            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">User management coming soon</h3>
                <p className="text-muted-foreground">
                  Advanced user management features will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Course Management</h2>
              <Input placeholder="Search courses..." className="max-w-sm" />
            </div>

            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Course management coming soon</h3>
                <p className="text-muted-foreground">
                  Advanced course management and moderation features will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Mail, Globe, Clock, BookOpen, Award, Edit2, Save, X, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithDetails } from "@shared/schema";

interface EnrollmentWithCourse {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  completedAt: string | null;
  progress: string;
  course: CourseWithDetails;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: user?.bio || "",
    country: user?.country || "",
    timezone: user?.timezone || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        bio: user.bio || "",
        country: user.country || "",
        timezone: user.timezone || "",
      });
    }
  }, [user]);

  // Fetch user enrollments
  const { data: enrollments = [], isLoading: isLoadingEnrollments } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ['/api/enrollments'],
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('PATCH', '/api/user/profile', data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      bio: user?.bio || "",
      country: user?.country || "",
      timezone: user?.timezone || "",
    });
    setIsEditing(false);
  };

  const completedCourses = enrollments.filter(e => e.completedAt);
  const inProgressCourses = enrollments.filter(e => !e.completedAt);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        {/* Profile Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={`${user.firstName} ${user.lastName}`} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-3xl mb-2">{user.firstName} {user.lastName}</CardTitle>
                  <CardDescription className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user.email}
                  </CardDescription>
                  <div className="mt-2">
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'instructor' ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline" data-testid="button-edit-profile">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave} 
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button 
                      onClick={handleCancel} 
                      variant="outline"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" data-testid="tab-info">
              <User className="h-4 w-4 mr-2" />
              Information
            </TabsTrigger>
            <TabsTrigger value="courses" data-testid="tab-courses">
              <BookOpen className="h-4 w-4 mr-2" />
              My Courses ({enrollments.length})
            </TabsTrigger>
            <TabsTrigger value="certificates" data-testid="tab-certificates">
              <Award className="h-4 w-4 mr-2" />
              Certificates ({completedCourses.length})
            </TabsTrigger>
          </TabsList>

          {/* Information Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!isEditing}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={!isEditing}
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    data-testid="input-bio"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., Ghana"
                        data-testid="input-country"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="timezone"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        disabled={!isEditing}
                        placeholder="e.g., GMT"
                        data-testid="input-timezone"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Account Details</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Member Since:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Courses Tab */}
          <TabsContent value="courses">
            <div className="space-y-6">
              {/* In Progress Courses */}
              {inProgressCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>In Progress ({inProgressCourses.length})</CardTitle>
                    <CardDescription>Courses you're currently taking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {inProgressCourses.map((enrollment) => (
                        <Link key={enrollment.id} href={`/course/${enrollment.courseId}/learn`}>
                          <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer" data-testid={`enrollment-${enrollment.id}`}>
                            {enrollment.course.thumbnailUrl && (
                              <img 
                                src={enrollment.course.thumbnailUrl} 
                                alt={enrollment.course.title}
                                className="w-24 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold">{enrollment.course.title}</h4>
                              <p className="text-sm text-muted-foreground">{enrollment.course.subtitle}</p>
                              <div className="mt-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <div className="flex-1 bg-secondary rounded-full h-2">
                                    <div 
                                      className="bg-primary h-2 rounded-full transition-all" 
                                      style={{ width: `${enrollment.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{enrollment.progress}%</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Continue Learning</Button>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completed Courses */}
              {completedCourses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Completed ({completedCourses.length})</CardTitle>
                    <CardDescription>Courses you've finished</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {completedCourses.map((enrollment) => (
                        <div key={enrollment.id} className="border rounded-lg p-4" data-testid={`completed-${enrollment.id}`}>
                          {enrollment.course.thumbnailUrl && (
                            <img 
                              src={enrollment.course.thumbnailUrl} 
                              alt={enrollment.course.title}
                              className="w-full h-32 object-cover rounded mb-3"
                            />
                          )}
                          <h4 className="font-semibold mb-2">{enrollment.course.title}</h4>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Completed: {new Date(enrollment.completedAt!).toLocaleDateString()}</span>
                            <Badge variant="secondary">
                              <Award className="h-3 w-3 mr-1" />
                              Certified
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {enrollments.length === 0 && !isLoadingEnrollments && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Courses Yet</h3>
                    <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
                    <Link href="/course-catalog">
                      <Button>Browse Courses</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {isLoadingEnrollments && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Loading your courses...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Certificates Tab */}
          <TabsContent value="certificates">
            <Card>
              <CardHeader>
                <CardTitle>Your Certificates</CardTitle>
                <CardDescription>View and download your course completion certificates</CardDescription>
              </CardHeader>
              <CardContent>
                {completedCourses.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedCourses.map((enrollment) => (
                      <div 
                        key={enrollment.id} 
                        className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                        data-testid={`certificate-${enrollment.id}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{enrollment.course.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {new Date(enrollment.completedAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          View Certificate
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground">Complete courses to earn certificates</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

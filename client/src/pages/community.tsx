import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function Community() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [newDiscussionCourse, setNewDiscussionCourse] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [selectedDiscussion, setSelectedDiscussion] = useState<string>("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "Please sign in to access the community.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Fetch user's enrolled courses for discussion categorization
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ['/api/enrollments'],
    enabled: isAuthenticated,
  });

  // Fetch all discussions (we'll filter by course)
  const { data: allDiscussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ['/api/discussions', 'all'],
    queryFn: async () => {
      // Since we don't have a general discussions endpoint, we'll aggregate from enrolled courses
      if (enrollments.length === 0) return [];
      
      const discussionPromises = enrollments.map((enrollment: any) =>
        fetch(`/api/discussions/${enrollment.course.id}`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : [])
          .catch(() => [])
      );
      
      const courseDiscussions = await Promise.all(discussionPromises);
      return courseDiscussions.flat().map((discussion: any, index: number) => ({
        ...discussion,
        course: enrollments.find((e: any) => 
          courseDiscussions.findIndex((cd: any) => cd.includes(discussion)) === enrollments.indexOf(e)
        )?.course
      }));
    },
    enabled: isAuthenticated && enrollments.length > 0,
  });

  // Fetch replies for selected discussion
  const { data: replies = [] } = useQuery<any[]>({
    queryKey: [`/api/replies/${selectedDiscussion}`],
    enabled: !!selectedDiscussion,
  });

  // Create new discussion mutation
  const createDiscussionMutation = useMutation({
    mutationFn: async ({ title, content, courseId }: { title: string; content: string; courseId: string }) => {
      const response = await apiRequest("POST", "/api/discussions", {
        title,
        content,
        courseId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discussions'] });
      setNewDiscussionTitle("");
      setNewDiscussionContent("");
      setNewDiscussionCourse("");
      toast({
        title: "Discussion Created",
        description: "Your discussion has been posted successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create discussion. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async ({ discussionId, content }: { discussionId: string; content: string }) => {
      const response = await apiRequest("POST", "/api/replies", {
        discussionId,
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/replies/${selectedDiscussion}`] });
      setReplyContent("");
      toast({
        title: "Reply Posted",
        description: "Your reply has been added to the discussion.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter discussions based on search and category
  const filteredDiscussions = allDiscussions.filter((discussion: any) => {
    const matchesSearch = discussion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discussion.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || discussion.course?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get recent discussions (last 5)
  const recentDiscussions = allDiscussions
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="grid md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-900 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold" data-testid="community-title">
              ADR Professional Community
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Connect with fellow practitioners, share knowledge, and advance your career in alternative dispute resolution.
            </p>
          </div>

          {/* Community Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
            <Card className="bg-white/10 backdrop-blur border-white/20" data-testid="stat-members">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">5,000+</div>
                <div className="text-blue-200">Active Members</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20" data-testid="stat-discussions">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">{allDiscussions.length}</div>
                <div className="text-blue-200">Discussions</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20" data-testid="stat-countries">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">50+</div>
                <div className="text-blue-200">Countries</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20" data-testid="stat-expertise">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">95%</div>
                <div className="text-blue-200">Expert Members</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Discussion Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Search and Filters */}
              <Card data-testid="search-filters">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                      <Input
                        data-testid="search-discussions"
                        type="text"
                        placeholder="Search discussions..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select onValueChange={setSelectedCategory} data-testid="filter-category">
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {enrollments.map((enrollment: any) => (
                          <SelectItem key={enrollment.course.id} value={enrollment.course.id}>
                            {enrollment.course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button data-testid="new-discussion-button">
                          <i className="fas fa-plus mr-2"></i>
                          New Discussion
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md" data-testid="new-discussion-dialog">
                        <DialogHeader>
                          <DialogTitle>Start a New Discussion</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="discussion-course">Course</Label>
                            <Select onValueChange={setNewDiscussionCourse} data-testid="discussion-course-select">
                              <SelectTrigger>
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                              <SelectContent>
                                {enrollments.map((enrollment: any) => (
                                  <SelectItem key={enrollment.course.id} value={enrollment.course.id}>
                                    {enrollment.course.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="discussion-title">Title</Label>
                            <Input
                              id="discussion-title"
                              data-testid="discussion-title-input"
                              placeholder="Discussion title..."
                              value={newDiscussionTitle}
                              onChange={(e) => setNewDiscussionTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="discussion-content">Content</Label>
                            <Textarea
                              id="discussion-content"
                              data-testid="discussion-content-input"
                              placeholder="Share your thoughts, ask questions..."
                              value={newDiscussionContent}
                              onChange={(e) => setNewDiscussionContent(e.target.value)}
                              className="min-h-[120px]"
                            />
                          </div>
                          <Button
                            data-testid="submit-discussion"
                            onClick={() => createDiscussionMutation.mutate({
                              title: newDiscussionTitle,
                              content: newDiscussionContent,
                              courseId: newDiscussionCourse
                            })}
                            disabled={!newDiscussionTitle || !newDiscussionContent || !newDiscussionCourse || createDiscussionMutation.isPending}
                            className="w-full"
                          >
                            {createDiscussionMutation.isPending ? 'Posting...' : 'Post Discussion'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Discussion Categories */}
              <Tabs defaultValue="all" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4" data-testid="discussion-tabs">
                  <TabsTrigger value="all">All Discussions</TabsTrigger>
                  <TabsTrigger value="questions">Q&A</TabsTrigger>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="career">Career</TabsTrigger>
                </TabsList>

                <TabsContent value="all" data-testid="tab-all-discussions">
                  {discussionsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse" data-testid={`skeleton-discussion-${i}`}>
                          <CardContent className="p-6">
                            <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-muted rounded w-1/4"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : filteredDiscussions.length === 0 ? (
                    <Card data-testid="no-discussions">
                      <CardContent className="p-8 text-center">
                        <i className="fas fa-comments text-6xl text-muted-foreground mb-4"></i>
                        <h3 className="text-xl font-semibold text-foreground mb-2">No discussions yet</h3>
                        <p className="text-muted-foreground mb-6">
                          Be the first to start a conversation in the community.
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button data-testid="start-first-discussion">Start First Discussion</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Start a New Discussion</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="discussion-course">Course</Label>
                                <Select onValueChange={setNewDiscussionCourse}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {enrollments.map((enrollment: any) => (
                                      <SelectItem key={enrollment.course.id} value={enrollment.course.id}>
                                        {enrollment.course.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="discussion-title">Title</Label>
                                <Input
                                  id="discussion-title"
                                  placeholder="Discussion title..."
                                  value={newDiscussionTitle}
                                  onChange={(e) => setNewDiscussionTitle(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="discussion-content">Content</Label>
                                <Textarea
                                  id="discussion-content"
                                  placeholder="Share your thoughts, ask questions..."
                                  value={newDiscussionContent}
                                  onChange={(e) => setNewDiscussionContent(e.target.value)}
                                  className="min-h-[120px]"
                                />
                              </div>
                              <Button
                                onClick={() => createDiscussionMutation.mutate({
                                  title: newDiscussionTitle,
                                  content: newDiscussionContent,
                                  courseId: newDiscussionCourse
                                })}
                                disabled={!newDiscussionTitle || !newDiscussionContent || !newDiscussionCourse || createDiscussionMutation.isPending}
                                className="w-full"
                              >
                                {createDiscussionMutation.isPending ? 'Posting...' : 'Post Discussion'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {filteredDiscussions.map((discussion: any) => (
                        <Card key={discussion.id} className="hover:shadow-lg transition-shadow" data-testid={`discussion-${discussion.id}`}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={discussion.user?.profileImageUrl} />
                                  <AvatarFallback className="bg-accent text-accent-foreground">
                                    {discussion.user?.firstName?.[0]}{discussion.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {discussion.user?.firstName} {discussion.user?.lastName}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {new Date(discussion.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              {discussion.course && (
                                <Badge variant="outline" data-testid={`discussion-course-${discussion.id}`}>
                                  {discussion.course.title}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold text-foreground mb-2" data-testid={`discussion-title-${discussion.id}`}>
                              {discussion.title}
                            </h3>
                            <p className="text-muted-foreground mb-4 line-clamp-3" data-testid={`discussion-content-${discussion.id}`}>
                              {discussion.content}
                            </p>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span data-testid={`discussion-replies-${discussion.id}`}>
                                  <i className="fas fa-reply mr-1"></i>
                                  {discussion._count?.replies || 0} replies
                                </span>
                                <span>
                                  <i className="fas fa-eye mr-1"></i>
                                  {Math.floor(Math.random() * 100) + 50} views
                                </span>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`view-discussion-${discussion.id}`}
                                    onClick={() => setSelectedDiscussion(discussion.id)}
                                  >
                                    View Discussion
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="discussion-detail-dialog">
                                  <DialogHeader>
                                    <DialogTitle>{discussion.title}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    {/* Original Post */}
                                    <div className="border-b pb-4">
                                      <div className="flex items-center space-x-3 mb-4">
                                        <Avatar className="h-10 w-10">
                                          <AvatarImage src={discussion.user?.profileImageUrl} />
                                          <AvatarFallback className="bg-accent text-accent-foreground">
                                            {discussion.user?.firstName?.[0]}{discussion.user?.lastName?.[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="font-medium text-foreground">
                                            {discussion.user?.firstName} {discussion.user?.lastName}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                            {new Date(discussion.createdAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-foreground whitespace-pre-wrap">{discussion.content}</p>
                                    </div>

                                    {/* Replies */}
                                    <div className="space-y-4">
                                      <h4 className="font-semibold text-foreground">Replies ({replies.length})</h4>
                                      {replies.map((reply: any) => (
                                        <div key={reply.id} className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg" data-testid={`reply-${reply.id}`}>
                                          <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={reply.user?.profileImageUrl} />
                                            <AvatarFallback className="bg-secondary text-secondary-foreground">
                                              {reply.user?.firstName?.[0]}{reply.user?.lastName?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                              <span className="font-medium text-foreground text-sm">
                                                {reply.user?.firstName} {reply.user?.lastName}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {new Date(reply.createdAt).toLocaleDateString()}
                                              </span>
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.content}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Reply Form */}
                                    <div className="border-t pt-4">
                                      <h4 className="font-semibold text-foreground mb-3">Add a Reply</h4>
                                      <div className="space-y-3">
                                        <Textarea
                                          data-testid="reply-content-input"
                                          placeholder="Share your thoughts..."
                                          value={replyContent}
                                          onChange={(e) => setReplyContent(e.target.value)}
                                          className="min-h-[100px]"
                                        />
                                        <Button
                                          data-testid="submit-reply"
                                          onClick={() => createReplyMutation.mutate({
                                            discussionId: selectedDiscussion,
                                            content: replyContent
                                          })}
                                          disabled={!replyContent || createReplyMutation.isPending}
                                        >
                                          {createReplyMutation.isPending ? 'Posting...' : 'Post Reply'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="questions" data-testid="tab-questions">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-question-circle text-6xl text-muted-foreground mb-4"></i>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Q&A Section</h3>
                      <p className="text-muted-foreground">
                        Ask questions and get answers from experienced ADR professionals.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="general" data-testid="tab-general">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-users text-6xl text-muted-foreground mb-4"></i>
                      <h3 className="text-xl font-semibold text-foreground mb-2">General Discussions</h3>
                      <p className="text-muted-foreground">
                        General topics related to ADR practice and industry trends.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="career" data-testid="tab-career">
                  <Card>
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-briefcase text-6xl text-muted-foreground mb-4"></i>
                      <h3 className="text-xl font-semibold text-foreground mb-2">Career Discussions</h3>
                      <p className="text-muted-foreground">
                        Career advice, job opportunities, and professional development.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Discussions */}
              <Card data-testid="recent-discussions">
                <CardHeader>
                  <CardTitle>Recent Discussions</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentDiscussions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent discussions</p>
                  ) : (
                    <div className="space-y-3">
                      {recentDiscussions.map((discussion: any) => (
                        <div key={discussion.id} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`recent-discussion-${discussion.id}`}>
                          <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-2">
                            {discussion.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>{discussion.user?.firstName} {discussion.user?.lastName}</span>
                            <span>•</span>
                            <span>{new Date(discussion.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Community Guidelines */}
              <Card data-testid="community-guidelines">
                <CardHeader>
                  <CardTitle>Community Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check text-green-600 mt-1"></i>
                      <span className="text-muted-foreground">Be respectful and professional</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check text-green-600 mt-1"></i>
                      <span className="text-muted-foreground">Share relevant and valuable content</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check text-green-600 mt-1"></i>
                      <span className="text-muted-foreground">Use clear and descriptive titles</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check text-green-600 mt-1"></i>
                      <span className="text-muted-foreground">Search before posting duplicates</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-check text-green-600 mt-1"></i>
                      <span className="text-muted-foreground">Maintain confidentiality</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Contributors */}
              <Card data-testid="top-contributors">
                <CardHeader>
                  <CardTitle>Top Contributors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Dr. Sarah Chen", posts: 45, badge: "Expert" },
                      { name: "Michael Rodriguez", posts: 32, badge: "Mentor" },
                      { name: "Emma Thompson", posts: 28, badge: "Active" },
                    ].map((contributor, index) => (
                      <div key={index} className="flex items-center space-x-3" data-testid={`contributor-${index}`}>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                            {contributor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-foreground text-sm">{contributor.name}</div>
                          <div className="text-xs text-muted-foreground">{contributor.posts} posts</div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {contributor.badge}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card data-testid="upcoming-events">
                <CardHeader>
                  <CardTitle>Upcoming Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-foreground text-sm mb-1">
                        Monthly ADR Webinar
                      </h4>
                      <div className="text-xs text-muted-foreground mb-2">
                        Dec 15, 2024 • 2:00 PM UTC
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" data-testid="register-webinar">
                        Register
                      </Button>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h4 className="font-medium text-foreground text-sm mb-1">
                        Networking Session
                      </h4>
                      <div className="text-xs text-muted-foreground mb-2">
                        Dec 20, 2024 • 7:00 PM UTC
                      </div>
                      <Button size="sm" variant="outline" className="text-xs" data-testid="join-networking">
                        Join
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

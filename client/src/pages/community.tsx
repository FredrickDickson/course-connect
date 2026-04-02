import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation } from "wouter";
import { MessageSquare, Plus, Users, Globe, Award } from "lucide-react";

export default function Community() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [selectedDiscussion, setSelectedDiscussion] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({ title: "Unauthorized", description: "Please sign in to access the community.", variant: "destructive" });
      setTimeout(() => setLocation("/login"), 500);
    }
  }, [isAuthenticated, authLoading, toast, setLocation]);

  // Fetch user enrollments to know which courses they can discuss
  const { data: enrollments = [] } = useQuery({
    queryKey: ['community-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("course_id, course:courses(id, title)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch discussions from enrolled courses
  const { data: discussions = [], isLoading: discussionsLoading } = useQuery({
    queryKey: ['community-discussions', user?.id],
    queryFn: async () => {
      const courseIds = enrollments.map((e: any) => e.course_id).filter(Boolean);
      if (courseIds.length === 0) return [];
      const { data, error } = await supabase
        .from("discussions")
        .select("*, course:courses(id, title)")
        .in("course_id", courseIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && enrollments.length > 0,
  });

  // Fetch replies for selected discussion
  const { data: replies = [] } = useQuery({
    queryKey: ['discussion-replies', selectedDiscussion],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("replies")
        .select("*")
        .eq("discussion_id", selectedDiscussion!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedDiscussion,
  });

  const createDiscussion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("discussions").insert({
        title: newTitle,
        content: newContent,
        course_id: newCourseId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-discussions'] });
      setNewTitle("");
      setNewContent("");
      setNewCourseId("");
      toast({ title: "Discussion Created", description: "Your discussion has been posted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createReply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("replies").insert({
        discussion_id: selectedDiscussion!,
        content: replyContent,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-replies'] });
      setReplyContent("");
      toast({ title: "Reply Posted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredDiscussions = discussions.filter((d: any) => {
    const matchesSearch = !searchTerm || d.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = !selectedCourse || d.course_id === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="text-3xl lg:text-4xl font-bold">ADR Professional Community</h1>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
            Connect with fellow practitioners, share knowledge, and advance your career.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{discussions.length}</div>
                <div className="text-primary-foreground/80 text-sm">Discussions</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 text-center">
                <Globe className="w-8 h-8 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">{enrollments.length}</div>
                <div className="text-primary-foreground/80 text-sm">Course Communities</div>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 text-center">
                <Award className="w-8 h-8 text-white mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-300">95%</div>
                <div className="text-primary-foreground/80 text-sm">Expert Members</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {/* Search & Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <Input
                      placeholder="Search discussions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                    <Select onValueChange={setSelectedCourse}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {enrollments.map((e: any) => (
                          <SelectItem key={e.course_id} value={e.course_id}>
                            {e.course?.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" />New Discussion</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start a New Discussion</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Course</Label>
                            <Select onValueChange={setNewCourseId}>
                              <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                              <SelectContent>
                                {enrollments.map((e: any) => (
                                  <SelectItem key={e.course_id} value={e.course_id}>{e.course?.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Title</Label>
                            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Discussion title..." />
                          </div>
                          <div>
                            <Label>Content</Label>
                            <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Share your thoughts..." className="min-h-[120px]" />
                          </div>
                          <Button
                            onClick={() => createDiscussion.mutate()}
                            disabled={!newTitle || !newContent || !newCourseId || createDiscussion.isPending}
                            className="w-full"
                          >
                            {createDiscussion.isPending ? 'Posting...' : 'Post Discussion'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Discussions List */}
              {discussionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-6 bg-muted rounded w-3/4 mb-4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredDiscussions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">No discussions yet</h3>
                    <p className="text-muted-foreground">
                      {enrollments.length === 0 
                        ? "Enroll in a course to join discussions."
                        : "Be the first to start a conversation!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredDiscussions.map((discussion: any) => (
                    <Card key={discussion.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {(discussion.user_id || "?")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(discussion.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          {discussion.course && (
                            <Badge variant="outline">{discussion.course.title}</Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">{discussion.title}</h3>
                        <p className="text-muted-foreground mb-4 line-clamp-3">{discussion.content}</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDiscussion(discussion.id)}>
                              View Discussion
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{discussion.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div className="border-b pb-4">
                                <p className="text-foreground whitespace-pre-wrap">{discussion.content}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(discussion.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold">Replies ({replies.length})</h4>
                                {replies.map((reply: any) => (
                                  <div key={reply.id} className="p-3 bg-muted/30 rounded-lg">
                                    <p className="text-sm">{reply.content}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(reply.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t pt-4 space-y-3">
                                <Textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder="Share your thoughts..."
                                  className="min-h-[100px]"
                                />
                                <Button
                                  onClick={() => createReply.mutate()}
                                  disabled={!replyContent || createReply.isPending}
                                >
                                  {createReply.isPending ? 'Posting...' : 'Post Reply'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Community Guidelines</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    {["Be respectful and professional", "Share relevant content", "Use clear titles", "Search before posting", "Maintain confidentiality"].map((rule, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <span className="text-green-600">✓</span>
                        <span className="text-muted-foreground">{rule}</span>
                      </div>
                    ))}
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

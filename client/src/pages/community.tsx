import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useLocation } from "wouter";
import { Plus, Users, MessageSquare, TrendingUp, Calendar, ChevronRight, Clock, Eye, BookOpen, HelpCircle, Lightbulb, Briefcase, GraduationCap, Coffee, Search, Sparkles, Trophy, Zap } from "lucide-react";
import { Link } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import NewPostModal from "@/components/NewPostModal";
import EmptyState from "@/components/empty-state";
import SkeletonLoader from "@/components/skeleton-loader";
import SearchAutocomplete from "@/components/search-autocomplete";

export default function Community() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  // Helper function to check if post is new (within 24 hours)
  const isNewPost = (createdAt: string) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return new Date(createdAt) > twentyFourHoursAgo;
  };

  // Helper function to get icon for category
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('help') || name.includes('support') || name.includes('question')) {
      return HelpCircle;
    } else if (name.includes('idea') || name.includes('suggestion') || name.includes('feature')) {
      return Lightbulb;
    } else if (name.includes('career') || name.includes('job') || name.includes('work')) {
      return Briefcase;
    } else if (name.includes('course') || name.includes('learning') || name.includes('education')) {
      return GraduationCap;
    } else if (name.includes('social') || name.includes('chat') || name.includes('network')) {
      return Coffee;
    }
    return MessageSquare;
  };

  // Debounce search term with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch forum categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch user's enrolled course boards
  const { data: myCourseBoards = [], error: boardsError } = useQuery({
    queryKey: ['my-course-boards', user?.id],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user!.id);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e: any) => e.course_id);
      const { data: boards, error } = await supabase
        .from('forum_boards')
        .select('*, course:courses(id, title)')
        .in('course_edition_id', courseIds)
        .eq('is_course_board', true);
      if (error) throw error;
      return boards || [];
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch community stats
  const { data: stats } = useQuery({
    queryKey: ['community-stats'],
    queryFn: async () => {
      const [membersCount, postsCount] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('forum_posts').select('id', { count: 'exact', head: true }),
      ]);
      return {
        members: membersCount.count || 0,
        posts: postsCount.count || 0,
      };
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch online users (active in last 15 minutes)
  const { data: onlineUsers } = useQuery({
    queryKey: ['online-users'],
    queryFn: async () => {
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

      // Count users who have posted, replied, or been active recently
      const [postAuthorsData, replyAuthorsData] = await Promise.all([
        supabase
          .from('forum_posts')
          .select('author_id')
          .gte('created_at', fifteenMinutesAgo.toISOString()),
        supabase
          .from('forum_replies')
          .select('author_id')
          .gte('created_at', fifteenMinutesAgo.toISOString()),
      ]);

      const postAuthors = postAuthorsData.data || [];
      const replyAuthors = replyAuthorsData.data || [];

      const uniqueUsers = new Set([
        ...postAuthors.map((p: any) => p.author_id),
        ...replyAuthors.map((r: any) => r.author_id),
      ]);

      return uniqueUsers.size;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });

  // Global search across all posts
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['global-search', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url),
          board:forum_boards(id, name, slug),
          board:forum_boards(category:forum_categories(id, name, slug))
        `)
        .eq('status', 'active')
        .or(`title.ilike.%${debouncedSearchTerm}%,body.ilike.%${debouncedSearchTerm}%`)
        .order('last_activity_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: debouncedSearchTerm.length >= 2,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch user's recent activity
  const { data: userActivity = [] } = useQuery({
    queryKey: ['user-activity', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const [recentPosts, recentReplies] = await Promise.all([
        supabase
          .from('forum_posts')
          .select('id, title, slug, created_at')
          .eq('author_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('forum_replies')
          .select(`
            id,
            created_at,
            post:forum_posts(id, title, slug)
          `)
          .eq('author_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const activities = [
        ...(recentPosts.data || []).map((p: any) => ({
          type: 'post',
          title: p.title,
          slug: p.slug,
          created_at: p.created_at,
        })),
        ...(recentReplies.data || []).map((r: any) => ({
          type: 'reply',
          title: r.post?.title || 'Unknown post',
          slug: r.post?.slug,
          created_at: r.created_at,
        })),
      ];

      // Sort by date and limit to 5 total
      return activities
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);
    },
    enabled: !!user,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch trending posts (by view count and reply count in last 7 days)
  const { data: trendingPosts = [] } = useQuery({
    queryKey: ['trending-posts'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url),
          board:forum_boards(id, name, slug)
        `)
        .eq('status', 'active')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('view_count', { ascending: false })
        .order('reply_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch upcoming events (published courses with upcoming start dates)
  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('courses')
        .select('id, title, start_date')
        .gt('start_date', today.toISOString())
        .eq('is_published', true)
        .order('start_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      return (data || []).map((course) => ({
        id: course.id,
        start_date: course.start_date,
        course: { id: course.id, title: course.title },
      }));
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Fetch leaderboard (top contributors by reputation)
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, reputation_points')
        .not('reputation_points', 'is', null)
        .order('reputation_points', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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

    <ErrorBoundary>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h1 className="text-3xl lg:text-4xl font-bold">CIMA Community</h1>
          <p className="text-xl text-primary-foreground/80 max-w-3xl mx-auto">
            Connect with ADR professionals in 33+ countries
          </p>
          <div className="max-w-2xl mx-auto mt-6">
            <SearchAutocomplete
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search discussions... (Cmd+K)"
            />
          </div>
        </div>
      </section>

      {/* Sub-navigation */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 py-3 overflow-x-auto">
            <Link href="/community" className="text-sm font-medium text-primary border-b-2 border-primary pb-3 whitespace-nowrap">
              All Forums
            </Link>
            <Link href="/community/my-boards" className="text-sm font-medium text-muted-foreground hover:text-primary pb-3 whitespace-nowrap">
              My Course Boards
            </Link>
            <Link href="/community/my-posts" className="text-sm font-medium text-muted-foreground hover:text-primary pb-3 whitespace-nowrap">
              My Posts
            </Link>
            <Link href="/community/notifications" className="text-sm font-medium text-muted-foreground hover:text-primary pb-3 whitespace-nowrap flex items-center gap-1">
              Notifications
              <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">0</span>
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Left Column - Forum Categories & Course Boards (70%) */}
            <div className="lg:col-span-3 space-y-8">

              {/* Search Results */}
              {debouncedSearchTerm.length >= 2 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    Search Results ({searchResults.length})
                  </h2>
                  {searchLoading ? (
                    <SkeletonLoader count={3} type="card" />
                  ) : searchResults.length === 0 ? (
                    <EmptyState
                      icon={Search}
                      title="No Results Found"
                      description={`No posts match your search for "${debouncedSearchTerm}". Try different keywords or browse the forums.`}
                      actionLabel="Browse Forums"
                      actionHref="/community"
                    />
                  ) : (
                    <div className="space-y-4">
                      {searchResults.map((post: any) => (
                        <Card key={post.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.author?.avatar_url} />
                                <AvatarFallback>
                                  {post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Link href={`/community/posts/${post.slug}`}>
                                    <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                                      {post.title}
                                    </h3>
                                  </Link>
                                  {isNewPost(post.created_at) && (
                                    <Badge variant="default" className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      New
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {post.body}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {post.author?.full_name || 'Anonymous'}
                                  </span>
                                  <span>•</span>
                                  <span>{post.board?.category?.name} / {post.board?.name}</span>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(post.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* General Forums */}
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6" />
                  General Forums
                </h2>
                {categoriesError ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-destructive">Failed to load forums. Please try again later.</p>
                    </CardContent>
                  </Card>
                ) : categoriesLoading ? (
                  <SkeletonLoader count={3} type="card" />
                ) : (
                  <div className="space-y-4">
                    {categories.map((category: any, index: number) => {
                      const gradients = [
                        'from-blue-500/10 to-blue-600/5',
                        'from-purple-500/10 to-purple-600/5',
                        'from-green-500/10 to-green-600/5',
                        'from-orange-500/10 to-orange-600/5',
                        'from-pink-500/10 to-pink-600/5',
                      ];
                      const gradient = gradients[index % gradients.length];
                      const CategoryIcon = getCategoryIcon(category.name);
                      return (
                        <Link key={category.id} href={`/community/forums/${category.slug}`}>
                          <Card className={`hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer bg-gradient-to-br ${gradient}`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <CategoryIcon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                                      {category.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                      <span>{category.post_count === 1 ? '1 topic' : `${category.post_count || 0} topics`}</span>
                                      <span>•</span>
                                      <span>Latest post</span>
                                    </div>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <ChevronRight className="h-5 w-5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Course Discussion Boards */}
              {myCourseBoards.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No Course Boards Yet"
                  description="Enroll in a course to see its discussion board here."
                  actionLabel="Browse Courses"
                  actionHref="/courses"
                />
              ) : (
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    My Course Boards
                  </h2>
                  {boardsError ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-destructive">Failed to load course boards. Please try again later.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {myCourseBoards.map((board: any) => (
                        <Link key={board.id} href={`/community/forums/${board.slug}`}>
                          <Card className="hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 hover:bg-gray-50 transition-all duration-200 cursor-pointer">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                                    {board.name}
                                  </h3>
                                  <p className="text-sm text-muted-foreground mt-1">{board.description}</p>
                                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                    <span>{board.post_count === 1 ? '1 topic' : `${board.post_count || 0} topics`}</span>
                                    <span>•</span>
                                    <span>{board.course?.title}</span>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  <ChevronRight className="h-5 w-5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sidebar Widgets (30%) */}
            <div className="space-y-6">
              
              {/* New Post Button */}
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowNewPostModal(true)}
              >
                <Plus className="h-5 w-5 mr-2" />
                New Post
              </Button>

              {/* Community Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Community Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Members</span>
                      <span className="font-semibold">{stats?.members || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Posts</span>
                      <span className="font-semibold">{stats?.posts || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Online now</span>
                      <span className="font-semibold">{onlineUsers || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* My Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">My Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {userActivity.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No recent activity
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userActivity.map((activity: any) => (
                        <div key={activity.id} className="space-y-1">
                          <Link href={`/community/posts/${activity.slug}`}>
                            <h4 className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                              {activity.title}
                            </h4>
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={activity.type === 'post' ? 'default' : 'secondary'} className="text-xs">
                              {activity.type === 'post' ? 'Posted' : 'Replied'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(activity.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      <Link href="/community/my-posts" className="text-sm text-primary hover:underline">
                        View all my activity →
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trending Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trending Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {trendingPosts.length === 0 ? (
                      <EmptyState
                        icon={TrendingUp}
                        title="No Trending Topics"
                        description="Be the first to start a discussion and get it trending!"
                        actionLabel="Create Post"
                        onAction={() => setShowNewPostModal(true)}
                      />
                    ) : (
                      trendingPosts.map((post: any) => (
                        <div key={post.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link href={`/community/posts/${post.slug}`}>
                              <h4 className="text-sm font-medium hover:text-primary transition-colors line-clamp-2">
                                {post.title}
                              </h4>
                            </Link>
                            {isNewPost(post.created_at) && (
                              <Badge variant="default" className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                                <Sparkles className="h-3 w-3 mr-1" />
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {post.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {post.reply_count}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming events</p>
                    ) : (
                      upcomingEvents.map((event: any) => (
                        <div key={event.id} className="space-y-1">
                          <Link href={`/course/${event.course?.id}`}>
                            <h4 className="text-sm font-medium hover:text-primary transition-colors line-clamp-1">
                              {event.course?.title || 'Course'}
                            </h4>
                          </Link>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{new Date(event.start_date).toLocaleDateString()}</span>
                            <Link href={`/checkout/${event.course?.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs min-h-[44px]">
                                Register →
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {leaderboard.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No contributors yet</p>
                    ) : (
                      leaderboard.map((contributor: any, index: number) => (
                        <div key={contributor.id} className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {index + 1}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={contributor.avatar_url} />
                            <AvatarFallback>
                              {contributor.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{contributor.full_name || 'Anonymous'}</h4>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Zap className="h-3 w-3" />
                            {contributor.reputation_points || 0}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      </ErrorBoundary>

      <Footer />
      
      {/* Mobile FAB */}
      <Button
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 rounded-full shadow-lg bg-red-600 hover:bg-red-700 z-50"
        size="icon"
        onClick={() => setShowNewPostModal(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* New Post Modal */}
      <NewPostModal 
        open={showNewPostModal} 
        onOpenChange={setShowNewPostModal} 
      />
    </div>
  );
}

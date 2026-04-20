import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { Plus, ArrowLeft, MessageSquare, Eye, Clock, Pin, Lock, ChevronUp } from "lucide-react";
import NewPostModal from "@/components/NewPostModal";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "replies">("newest");
  const [dateFilter, setDateFilter] = useState<"all" | "7days" | "30days" | "90days">("all");
  const [page, setPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const POSTS_PER_PAGE = 20;

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch category details
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['forum-category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch boards in this category
  const { data: boards = [] } = useQuery({
    queryKey: ['forum-boards', category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_boards')
        .select('*')
        .eq('category_id', category!.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!category?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch posts in this category (across all boards)
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['forum-posts', category?.id, sortBy, dateFilter, page],
    queryFn: async () => {
      const boardIds = boards.map((b: any) => b.id);
      if (boardIds.length === 0) return [];

      const offset = (page - 1) * POSTS_PER_PAGE;

      let query = supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url),
          board:forum_boards(id, name, slug)
        `)
        .in('board_id', boardIds)
        .eq('status', 'active')
        .order('is_pinned', { ascending: false });

      // Apply date filter
      if (dateFilter === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        query = query.gte('created_at', sevenDaysAgo.toISOString());
      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      } else if (dateFilter === '90days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        query = query.gte('created_at', ninetyDaysAgo.toISOString());
      }

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'replies') {
        query = query.order('reply_count', { ascending: false });
      }

      query = query.range(offset, offset + POSTS_PER_PAGE - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!category?.id && boards.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const filteredPosts = posts.filter((post: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      post.title?.toLowerCase().includes(searchLower) ||
      post.body?.toLowerCase().includes(searchLower)
    );
  });

  if (categoryLoading) {
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

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Link href="/community">
            <Button>Back to Community</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link href="/community" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Community
        </Link>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
              <p className="text-muted-foreground">{category.description}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{category.post_count || 0} topics</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateFilter} onValueChange={(value: "all" | "7days" | "30days" | "90days") => setDateFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "replies") => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="replies">Most Replies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md"
          />
          {user && (
            <Button onClick={() => setShowNewPostModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Topic
            </Button>
          )}
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {postsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No topics yet</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? "No topics match your search." : "Be the first to start a conversation!"}
                </p>
                {user && !searchTerm && (
                  <Button onClick={() => setShowNewPostModal(true)}>
                    Create First Topic
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post: any) => (
              <Card key={post.id} className="hover:shadow-lg hover:border-primary/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.author?.avatar_url} />
                      <AvatarFallback>
                        {post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <Link href={`/community/posts/${post.slug}`}>
                          <h3 className="text-lg font-semibold hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                        </Link>
                        {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                        {post.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {post.is_announcement && (
                          <Badge variant="default" className="text-xs">Announcement</Badge>
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
                        <span>{post.board?.name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {post.reply_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {post.view_count}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredPosts.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * POSTS_PER_PAGE) + 1} to {Math.min(page * POSTS_PER_PAGE, filteredPosts.length)} of {filteredPosts.length} topics
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(p => Math.max(1, p - 1));
                  scrollToTop();
                }}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPage(p => p + 1);
                  scrollToTop();
                }}
                disabled={filteredPosts.length < POSTS_PER_PAGE}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}

      <Footer />
      
      {/* New Post Modal */}
      <NewPostModal 
        open={showNewPostModal} 
        onOpenChange={setShowNewPostModal}
        preSelectedCategory={slug}
      />
    </div>
  );
}

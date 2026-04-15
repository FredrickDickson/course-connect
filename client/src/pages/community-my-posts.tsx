import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Eye, Clock, Search, Filter } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SkeletonLoader from "@/components/skeleton-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CommunityMyPosts() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "posts" | "replies">("all");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  // Fetch user's posts and replies
  const { data: userActivity = [], isLoading, error } = useQuery({
    queryKey: ['user-activity-all', user?.id, filter, sortBy],
    queryFn: async () => {
      if (!user) return [];

      let posts: any[] = [];
      let replies: any[] = [];

      if (filter === "all" || filter === "posts") {
        const { data: userPosts } = await supabase
          .from('forum_posts')
          .select('*, board:forum_boards(id, name, slug), category:forum_categories(id, name, slug)')
          .eq('author_id', user.id)
          .eq('status', 'active')
          .order(sortBy === 'recent' ? 'created_at' : 'view_count', { ascending: sortBy === 'recent' });

        posts = (userPosts || []).map((p: any) => ({ ...p, type: 'post' }));
      }

      if (filter === "all" || filter === "replies") {
        const { data: userReplies } = await supabase
          .from('forum_replies')
          .select(`
            *,
            post:forum_posts(id, title, slug, board:forum_boards(id, name, slug), category:forum_categories(id, name, slug))
          `)
          .eq('author_id', user.id)
          .eq('status', 'active')
          .order(sortBy === 'recent' ? 'created_at' : 'created_at', { ascending: sortBy === 'recent' });

        replies = (userReplies || []).map((r: any) => ({ ...r, type: 'reply' }));
      }

      // Combine and filter by search
      const combined = [...posts, ...replies];
      
      if (searchTerm) {
        return combined.filter((item: any) => {
          const title = item.type === 'post' ? item.title : item.post?.title;
          const body = item.type === 'post' ? item.body : item.body;
          return title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 body?.toLowerCase().includes(searchTerm.toLowerCase());
        });
      }

      return combined;
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/community">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Community
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">My Activity</h1>
          <p className="text-xl text-primary-foreground/80 mt-2">
            Track your posts and replies
          </p>
        </div>
      </div>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your activity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="posts">Posts Only</SelectItem>
                <SelectItem value="replies">Replies Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <SkeletonLoader count={5} type="card" />
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">Failed to load activity. Please try again later.</p>
              </CardContent>
            </Card>
          ) : userActivity.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No Activity Yet"
              description="Start posting and replying to see your activity here."
              actionLabel="Browse Community"
              actionHref="/community"
            />
          ) : (
            <div className="space-y-4">
              {userActivity.map((item: any) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>
                          {user?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={item.type === 'post' ? 'default' : 'secondary'} className="text-xs">
                            {item.type === 'post' ? 'Post' : 'Reply'}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Link 
                          href={`/community/posts/${item.type === 'post' ? item.slug : item.post?.slug}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {item.type === 'post' ? item.title : `Re: ${item.post?.title}`}
                        </Link>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {item.type === 'post' && (
                            <>
                              <span className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {item.view_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {item.reply_count || 0}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

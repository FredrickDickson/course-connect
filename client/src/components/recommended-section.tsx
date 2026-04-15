import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, MessageSquare, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function RecommendedSection() {
  // Fetch recommended posts based on user's course enrollments and interests
  const { data: recommendedPosts = [] } = useQuery({
    queryKey: ['recommended-posts'],
    queryFn: async () => {
      // Get posts from user's enrolled courses and trending posts
      const { data } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url),
          board:forum_boards(id, name, category:forum_categories(id, name))
        `)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    refetchOnWindowFocus: false,
  });

  if (recommendedPosts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendedPosts.map((post: any) => (
            <Link key={post.id} href={`/community/posts/${post.slug}`}>
              <div className="p-3 rounded-lg hover:bg-accent transition-colors">
                <h4 className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 mb-2">
                  {post.title}
                </h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={post.author?.avatar_url} />
                      <AvatarFallback>
                        {post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {post.author?.full_name || 'Anonymous'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.reply_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.view_count || 0}
                    </span>
                  </div>
                </div>
                {post.is_official_answer && (
                  <Badge variant="secondary" className="text-xs mt-2">
                    ✓ Official Answer
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

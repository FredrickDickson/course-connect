import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookmarkButtonProps {
  postId: string;
  isBookmarked?: boolean;
}

export default function BookmarkButton({ postId, isBookmarked: initialBookmarked = false }: BookmarkButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if post is bookmarked
  const { data: isBookmarked } = useQuery({
    queryKey: ['bookmark-status', postId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('post_bookmarks' as any)
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();
      return !!data;
    },
    enabled: !!user,
    initialData: initialBookmarked,
  });

  // Toggle bookmark
  const toggleBookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      if (isBookmarked) {
        const { error } = await supabase
          .from('post_bookmarks' as any)
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_bookmarks' as any)
          .insert({
            post_id: postId,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmark-status', postId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks', user?.id] });
      toast({
        title: isBookmarked ? "Bookmark removed" : "Post bookmarked",
        description: isBookmarked ? "Removed from your bookmarks" : "Added to your bookmarks",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update bookmark",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bookmark className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleBookmarkMutation.mutate()}
      disabled={toggleBookmarkMutation.isPending}
      className={isBookmarked ? "text-primary" : ""}
    >
      {isBookmarked ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}

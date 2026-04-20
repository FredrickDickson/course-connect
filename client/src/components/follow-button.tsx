import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FollowButtonProps {
  userId: string;
  followersCount?: number;
}

export default function FollowButton({ userId, followersCount = 0 }: FollowButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if current user is following this user
  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', user?.id, userId],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();
      return !!data;
    },
    enabled: !!user && user.id !== userId,
  });

  // Toggle follow
  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (user.id === userId) throw new Error("Cannot follow yourself");

      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: user.id,
            following_id: userId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following', user?.id, userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: isFollowing ? "You are no longer following this user" : "You are now following this user",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update follow status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user || user.id === userId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={() => toggleFollowMutation.mutate()}
      disabled={toggleFollowMutation.isPending}
      className="gap-2"
    >
      {toggleFollowMutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

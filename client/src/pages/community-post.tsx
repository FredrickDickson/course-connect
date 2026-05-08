import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, ThumbsUp, Eye, Clock, Pin, Lock, CheckCircle, Loader2, MoreVertical, Flag, Paperclip, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EmojiPicker from "@/components/emoji-picker";
import RichTextEditor from "@/components/rich-text-editor";
import RichTextViewer from "@/components/rich-text-viewer";
import FileUpload from "@/components/file-upload";
import BookmarkButton from "@/components/bookmark-button";
import UserBadges from "@/components/user-badges";

export default function CommunityPost() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'reply', id: string } | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [replyAttachments, setReplyAttachments] = useState<any[]>([]);
  const [reportDetails, setReportDetails] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string, targetId: string, targetType: 'post' | 'reply', message: string } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Fetch users for @mentions
  const { data: mentionableUsers = [] } = useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .limit(20);
      return data || [];
    },
  });

  // Handle @mention detection
  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setReplyContent(value);

    // Check for @mention
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.slice(lastAtIndex + 1);
      const spaceAfterAt = textAfterAt.indexOf(' ');
      
      if (spaceAfterAt === -1 || spaceAfterAt === textAfterAt.length - 1) {
        const searchTerm = textAfterAt.trim().toLowerCase();
        if (searchTerm.length >= 1) {
          const filtered = mentionableUsers.filter((user: any) =>
            user.full_name?.toLowerCase().includes(searchTerm)
          );
          setMentionSuggestions(filtered);
          setShowMentions(filtered.length > 0);
          setMentionIndex(0);
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const handleMentionSelect = (user: any) => {
    const lastAtIndex = replyContent.lastIndexOf('@');
    const beforeMention = replyContent.slice(0, lastAtIndex);
    const newContent = `${beforeMention}@${user.full_name} `;
    setReplyContent(newContent);
    setShowMentions(false);
    setMentionSuggestions([]);
  };

  // Handle file attachment
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Allow images and common document types
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length !== files.length) {
      toast({ 
        title: "Some files were skipped", 
        description: "Only images (JPEG, PNG, WebP, GIF), PDF, and text files under 5MB are allowed.",
        variant: "destructive" 
      });
    }

    setAttachedFiles(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle keyboard navigation in mentions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showMentions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => Math.min(prev + 1, mentionSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && mentionSuggestions.length > 0) {
      e.preventDefault();
      handleMentionSelect(mentionSuggestions[mentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Fetch post
  const { data: post, isLoading: postLoading, error: postError } = useQuery({
    queryKey: ['forum-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url, community_role, reputation_points, badges),
          board:forum_boards(id, name, slug, category_id),
          board:forum_boards(category:forum_categories(id, name, slug))
        `)
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      // Increment view count
      await supabase.from('forum_posts').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);

      return data as any;
    },
    enabled: !!slug,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch replies
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ['forum-replies', post?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_replies')
        .select(`
          *,
          author:profiles(id, full_name, avatar_url, community_role, reputation_points, badges),
          parent_reply:forum_replies(id, author_id)
        `)
        .eq('post_id', post!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!post?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Check if user has reacted
  const { data: userReaction } = useQuery({
    queryKey: ['post-reaction', post?.id, user?.id],
    queryFn: async () => {
      if (!user || !post) return null;
      const { data } = await supabase
        .from('forum_reactions')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user && !!post?.id,
  });

  // Check if user is following
  const { data: isFollowing } = useQuery({
    queryKey: ['post-follow', post?.id, user?.id],
    queryFn: async () => {
      if (!user || !post) return false;
      const { data } = await supabase
        .from('forum_follows')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
      return !!data;
    },
    enabled: !!user && !!post?.id,
  });

  // Toggle reaction
  const toggleReactionMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post) throw new Error("Not authenticated");

      if (userReaction) {
        // Remove reaction
        const { error } = await supabase
          .from('forum_reactions')
          .delete()
          .eq('id', userReaction.id);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('forum_reactions')
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: 'helpful',
          });
        if (error) throw error;
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['forum-post', slug] });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData(['forum-post', slug]);

      // Optimistically update
      queryClient.setQueryData(['forum-post', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          helpful_count: userReaction ? old.helpful_count - 1 : old.helpful_count + 1,
        };
      });

      return { previousPost };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['forum-post', slug], context?.previousPost);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-reaction', post?.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
    },
  });

  // Toggle follow
  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post) throw new Error("Not authenticated");

      if (isFollowing) {
        await supabase
          .from('forum_follows')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('forum_follows')
          .insert({
            user_id: user.id,
            post_id: post.id,
          });
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['forum-post', slug] });
      const previousPost = queryClient.getQueryData(['forum-post', slug]);
      queryClient.setQueryData(['forum-post', slug], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          follow_count: isFollowing ? old.follow_count - 1 : old.follow_count + 1,
        };
      });
      return { previousPost };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['forum-post', slug], context?.previousPost);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-follow', post?.id, user?.id] });
      toast({ title: isFollowing ? "Unfollowed" : "Following" });
    },
  });

  // Mark reply as official answer
  const markOfficialAnswerMutation = useMutation({
    mutationFn: async (replyId: string) => {
      if (!user || !post) throw new Error("Not authenticated");

      // First, unmark any existing official answers for this post
      await supabase
        .from('forum_replies')
        .update({ is_official_answer: false })
        .eq('post_id', post.id)
        .eq('is_official_answer', true);

      // Mark the selected reply as official
      const { error } = await supabase
        .from('forum_replies')
        .update({ is_official_answer: true })
        .eq('id', replyId);

      if (error) throw error;

      // Get the reply author to notify them
      const { data: reply } = await supabase
        .from('forum_replies')
        .select('author_id')
        .eq('id', replyId)
        .single();

      if (reply && reply.author_id !== user.id) {
        await supabase.from('community_notifications').insert({
          user_id: reply.author_id,
          type: 'official_answer',
          title: 'Your reply was marked as official answer',
          body: `Your reply to "${post.title}" was marked as the official answer`,
          link: `/community/posts/${post.slug}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', post?.id] });
      toast({ title: "Reply marked as official answer" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to mark answer", description: error.message, variant: "destructive" });
    },
  });

  // Moderate content (lock/unlock post, delete reply, etc.)
  const moderateContentMutation = useMutation({
    mutationFn: async ({ action, targetId, targetType }: { action: string, targetId: string, targetType: 'post' | 'reply' }) => {
      if (!user) throw new Error("Not authenticated");
      
      if (action === 'lock_post') {
        const { error } = await supabase
          .from('forum_posts')
          .update({ is_locked: true })
          .eq('id', targetId);
        if (error) throw error;
      } else if (action === 'unlock_post') {
        const { error } = await supabase
          .from('forum_posts')
          .update({ is_locked: false })
          .eq('id', targetId);
        if (error) throw error;
      } else if (action === 'pin_post') {
        const { error } = await supabase
          .from('forum_posts')
          .update({ is_pinned: true })
          .eq('id', targetId);
        if (error) throw error;
      } else if (action === 'unpin_post') {
        const { error } = await supabase
          .from('forum_posts')
          .update({ is_pinned: false })
          .eq('id', targetId);
        if (error) throw error;
      } else if (action === 'delete_reply') {
        const { error } = await supabase
          .from('forum_replies')
          .update({ status: 'deleted' })
          .eq('id', targetId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
      queryClient.invalidateQueries({ queryKey: ['forum-replies', post?.id] });
      toast({ title: "Moderation action completed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to moderate", description: error.message, variant: "destructive" });
    },
  });

  // Edit post
  const editPostMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post) throw new Error("Not authenticated");

      // Validate input
      if (!editTitle || editTitle.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (editTitle.length > 200) {
        throw new Error("Title is too long (max 200 characters)");
      }
      if (!editBody || editBody.trim().length === 0) {
        throw new Error("Body cannot be empty");
      }
      if (editBody.length > 50000) {
        throw new Error("Body is too long (max 50,000 characters)");
      }

      const { error } = await supabase
        .from('forum_posts')
        .update({
          title: editTitle,
          body: editBody,
        })
        .eq('id', post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setIsEditingPost(false);
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
      toast({ title: "Post updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update post", description: error.message, variant: "destructive" });
    },
  });

  // Delete post
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      if (!user || !post) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('forum_posts')
        .update({ status: 'deleted' })
        .eq('id', post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Post deleted" });
      window.location.href = '/community';
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete post", description: error.message, variant: "destructive" });
    },
  });

  // Report content
  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!user || !reportTarget) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          post_id: reportTarget.type === 'post' ? reportTarget.id : null,
          reply_id: reportTarget.type === 'reply' ? reportTarget.id : null,
          reason: reportReason,
          details: reportDetails,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");
      setReportTarget(null);
      toast({ title: "Report submitted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit report", description: error.message, variant: "destructive" });
    },
  });

  // Submit reply
  const submitReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !post) throw new Error("Not authenticated");

      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error("Reply cannot be empty");
      }
      if (content.length > 10000) {
        throw new Error("Reply is too long (max 10,000 characters)");
      }

      // Insert reply with attachments
      const { error: replyError } = await supabase
        .from('forum_replies')
        .insert({
          post_id: post.id,
          author_id: user.id,
          body: content,
          parent_reply_id: replyingTo,
          attachments: replyAttachments,
        });

      if (replyError) throw replyError;

      // Update post reply count
      await supabase.from('forum_posts').update({
        reply_count: (post.reply_count || 0) + 1,
        last_activity_at: new Date().toISOString()
      }).eq('id', post.id);

      // Create notification for post author (if not the same user)
      if (post.author_id !== user.id) {
        await supabase.from('community_notifications').insert({
          user_id: post.author_id,
          type: 'reply',
          title: 'New reply to your post',
          body: `${user.id} replied to "${post.title}"`,
          link: `/community/posts/${post.slug}`,
        });
      }

      // Create notifications for mentioned users
      const mentionRegex = /@([a-zA-Z\s]+)/g;
      const mentions = content.match(mentionRegex);
      if (mentions) {
        const { data: mentionedProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('full_name', mentions.map(m => m.slice(1).trim()));

        if (mentionedProfiles) {
          for (const profile of mentionedProfiles) {
            if (profile.id !== user.id) {
              await supabase.from('community_notifications').insert({
                user_id: profile.id,
                type: 'mention',
                title: 'You were mentioned',
                body: `${user.id} mentioned you in a reply`,
                link: `/community/posts/${post.slug}`,
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      setReplyContent("");
      setReplyingTo(null);
      setAttachedFiles([]);
      setReplyAttachments([]);
      queryClient.invalidateQueries({ queryKey: ['forum-replies', post?.id] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
      queryClient.invalidateQueries({ queryKey: ['community-notifications', post.author_id] });
      toast({ title: "Reply posted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to post reply", description: error.message, variant: "destructive" });
    },
  });

  // Organize replies into threads
  const topLevelReplies = replies.filter((r: any) => !r.parent_reply_id);
  const getNestedReplies = (parentId: string) =>
    replies.filter((r: any) => r.parent_reply_id === parentId);

  // Real-time subscription for new replies
  useEffect(() => {
    if (!post?.id) return;

    const channel = supabase
      .channel(`forum_replies:${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_replies',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          // Invalidate queries to fetch new reply
          queryClient.invalidateQueries({ queryKey: ['forum-replies', post.id] });
          queryClient.invalidateQueries({ queryKey: ['forum-post', slug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id, slug, queryClient]);

  if (postLoading) {
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

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Link href="/community">
            <Button>Back to Community</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const canModerate = user && (
    post.author?.community_role === 'admin' ||
    post.author?.community_role === 'moderator' ||
    post.author?.community_role === 'instructor'
  );

  const isAuthor = user?.id === post.author_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
        {/* Breadcrumb - collapsed on mobile */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto">
          <Link href="/community" className="hover:text-primary whitespace-nowrap">
            Community
          </Link>
          <span className="hidden sm:inline">/</span>
          <Link href={`/community/forums/${post.board?.category?.slug}`} className="hover:text-primary whitespace-nowrap hidden sm:inline">
            {post.board?.category?.name}
          </Link>
          <span className="hidden sm:inline">/</span>
          <span className="text-foreground font-medium truncate">{post.title}</span>
        </nav>

        {/* Post */}
        <Card className={`
          mb-6
          ${post.is_pinned ? "border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent" : ""}
          ${post.is_locked ? "border-l-4 border-l-red-500 bg-gradient-to-r from-red-50 to-transparent" : ""}
          ${post.is_announcement ? "border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-transparent" : ""}
        `}>
          <CardContent className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.author?.avatar_url} />
                  <AvatarFallback>
                    {post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{post.author?.full_name || 'Anonymous'}</span>
                    <UserBadges 
                      reputationPoints={post.author?.reputation_points} 
                      badges={post.author?.badges || []}
                      size="sm"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant={post.author?.community_role === 'admin' ? 'default' : 'outline'} className="text-xs">
                      {post.author?.community_role || 'student'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
              
              {(isAuthor || canModerate) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {isAuthor && (
                      <DropdownMenuItem onClick={() => {
                        setIsEditingPost(true);
                        setEditTitle(post.title);
                        setEditBody(post.body);
                      }}>
                        Edit Post
                      </DropdownMenuItem>
                    )}
                    {(isAuthor || canModerate) && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setConfirmAction({
                            type: 'delete_post',
                            targetId: post.id,
                            targetType: 'post',
                            message: 'Are you sure you want to delete this post? This action cannot be undone.'
                          });
                          setShowConfirmDialog(true);
                        }}
                      >
                        Delete Post
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {post.is_pinned && (
                <Badge variant="default">
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
              {post.is_locked && (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
              {post.is_announcement && (
                <Badge variant="default" className="bg-orange-500">
                  Announcement
                </Badge>
              )}
            </div>

            {/* Title */}
            {isEditingPost ? (
              <div className="space-y-4 mb-6">
                <div>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Post title"
                    maxLength={200}
                  />
                </div>
                <RichTextEditor
                  content={editBody}
                  onChange={setEditBody}
                  placeholder="Post content"
                />
                <div className="flex gap-2">
                  <Button onClick={() => editPostMutation.mutate()} disabled={editPostMutation.isPending}>
                    {editPostMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingPost(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-4">{post.title}</h1>

                {/* Body */}
                <div className="mb-6">
                  <RichTextViewer content={post.body} />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <EmojiPicker
                  onSelect={(emoji) => {
                    // For now, just use the helpful reaction
                    // In the future, this could store the specific emoji
                    toggleReactionMutation.mutate();
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleReactionMutation.mutate()}
                  className={userReaction ? "text-primary" : ""}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  {post.helpful_count || 0}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!user) {
                    toast({ title: "Please log in to follow posts", variant: "destructive" });
                    return;
                  }
                  toggleFollowMutation.mutate();
                }}
                className={isFollowing ? "text-primary" : ""}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {post.reply_count || 0}
              </Button>
              <BookmarkButton postId={post.id} />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-4 w-4" />
                {post.view_count || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reply Composer - Fixed to bottom on mobile */}
        {!post.is_locked && user && (
          <Card className="mb-6 lg:mb-0 lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Post a Reply</CardTitle>
            </CardHeader>
            <CardContent>
              {replyingTo && (
                <div className="mb-3 p-2 bg-muted/50 rounded text-sm">
                  <span className="text-muted-foreground">Replying to:</span> {replyingTo}
                  <button
                    type="button"
                    className="ml-2 text-sm text-destructive hover:text-destructive"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="relative">
                <RichTextEditor
                  content={replyContent}
                  onChange={setReplyContent}
                  placeholder="Write your reply... (Use @ to mention users)"
                />

                {/* File Attachments */}
                <div className="mt-3">
                  <FileUpload
                    onFilesChange={setReplyAttachments}
                    maxFiles={3}
                    maxSize={5 * 1024 * 1024}
                    acceptedTypes={['image/*', 'application/pdf']}
                  />
                </div>

                {/* Mention Suggestions */}
                {showMentions && mentionSuggestions.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {mentionSuggestions.map((user, index) => (
                      <div
                        key={user.id}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-accent ${
                          index === mentionIndex ? 'bg-accent' : ''
                        }`}
                        onClick={() => handleMentionSelect(user)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* File Attachments */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    id="file-attachment"
                    multiple
                    accept="image/*,.pdf,.txt"
                    onChange={handleFileAttachment}
                    className="hidden"
                  />
                  <label htmlFor="file-attachment">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach Files
                    </Button>
                  </label>
                  <span className="text-xs text-muted-foreground">
                    Images, PDF, Text (max 5MB each)
                  </span>
                </div>

                {/* Attached Files List */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={() => submitReplyMutation.mutate(replyContent)}
                disabled={!replyContent.trim() || submitReplyMutation.isPending || uploadingFiles}
              >
                {(submitReplyMutation.isPending || uploadingFiles) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {uploadingFiles ? 'Uploading...' : 'Posting...'}
                  </>
                ) : (
                  "Post Reply"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Replies */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Replies ({replies.length})</h2>
            <Select defaultValue="newest">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="helpful">Most helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {repliesLoading ? (
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
          ) : replies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No replies yet</h3>
                <p className="text-muted-foreground">Be the first to reply!</p>
              </CardContent>
            </Card>
          ) : (
            topLevelReplies.map((reply: any) => (
              <ReplyThread
                key={reply.id}
                reply={reply}
                nestedReplies={getNestedReplies(reply.id)}
                onReply={(content: string) => submitReplyMutation.mutate(content)}
                setReplyingTo={setReplyingTo}
                user={user}
                postId={post.id}
                canModerate={canModerate}
                markOfficialAnswer={(replyId: string) => markOfficialAnswerMutation.mutate(replyId)}
                moderateContent={(args: any) => moderateContentMutation.mutate(args)}
                setConfirmAction={setConfirmAction}
                setShowConfirmDialog={setShowConfirmDialog}
              />
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Confirm Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>{confirmAction.message}</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowConfirmDialog(false);
                    setConfirmAction(null);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirmAction.type === 'delete_post') {
                        deletePostMutation.mutate();
                      } else if (confirmAction.type === 'delete_reply') {
                        moderateContentMutation.mutate({ action: 'delete_reply', targetId: confirmAction.targetId, targetType: confirmAction.targetType });
                      } else if (confirmAction.type === 'lock_post') {
                        moderateContentMutation.mutate({ action: 'lock_post', targetId: confirmAction.targetId, targetType: confirmAction.targetType });
                      } else if (confirmAction.type === 'unlock_post') {
                        moderateContentMutation.mutate({ action: 'unlock_post', targetId: confirmAction.targetId, targetType: confirmAction.targetType });
                      }
                      setShowConfirmDialog(false);
                      setConfirmAction(null);
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Report Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reason">Reason *</Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger id="reason">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spam">Spam</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                      <SelectItem value="misinformation">Misinformation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="details">Details</Label>
                  <Textarea
                    id="details"
                    placeholder="Please provide additional details..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => reportMutation.mutate()}
                    disabled={!reportReason || reportMutation.isPending}
                  >
                    {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}

function ReplyThread({ reply, nestedReplies, onReply, setReplyingTo, user, postId, canModerate, markOfficialAnswer, moderateContent, setConfirmAction, setShowConfirmDialog }: any) {
  const [showNested, setShowNested] = useState(true);
  const isAuthor = user?.id === reply.author_id;
  const isInstructor = user?.community_role === 'instructor' || user?.community_role === 'moderator' || user?.community_role === 'admin';

  return (
    <Card className={reply.parent_reply_id ? "ml-8 mt-2" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={reply.author?.avatar_url} />
            <AvatarFallback>
              {reply.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{reply.author?.full_name || 'Anonymous'}</span>
              <UserBadges 
                reputationPoints={reply.author?.reputation_points} 
                badges={reply.author?.badges || []}
                size="sm"
              />
              {reply.author?.community_role === 'instructor' && (
                <Badge variant="outline" className="text-xs">Instructor</Badge>
              )}
              {reply.author?.community_role === 'moderator' && (
                <Badge variant="outline" className="text-xs">Moderator</Badge>
              )}
              {reply.author?.community_role === 'admin' && (
                <Badge variant="default" className="text-xs">Admin</Badge>
              )}
              {reply.is_official_answer && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Official Answer
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(reply.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="text-sm mb-2">
              <RichTextViewer content={reply.body} />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setReplyingTo(reply.author?.full_name)}
              >
                Reply
              </Button>
              
              {isAuthor && (
                <Button variant="ghost" size="sm" className="h-8 text-xs min-h-[44px]">
                  Edit
                </Button>
              )}
              
              {isInstructor && !reply.is_official_answer && !reply.parent_reply_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() => markOfficialAnswer(reply.id)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark Official
                </Button>
              )}
              
              {canModerate && !isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-xs min-h-[44px]">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setConfirmAction({
                          type: 'delete_reply',
                          targetId: reply.id,
                          targetType: 'reply',
                          message: 'Are you sure you want to delete this reply? This action cannot be undone.'
                        });
                        setShowConfirmDialog(true);
                      }}
                    >
                      Delete Reply
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {nestedReplies.length > 0 && (
          <div className="mt-4 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNested(!showNested)}
              className="text-xs"
            >
              {showNested ? 'Hide' : 'Show'} {nestedReplies.length} {nestedReplies.length === 1 ? 'reply' : 'replies'}
            </Button>
            {showNested && nestedReplies.map((nestedReply: any) => (
              <ReplyThread
                key={nestedReply.id}
                reply={nestedReply}
                nestedReplies={[]}
                onReply={onReply}
                setReplyingTo={setReplyingTo}
                user={user}
                postId={postId}
                canModerate={canModerate}
                markOfficialAnswer={markOfficialAnswer}
                moderateContent={moderateContent}
                setConfirmAction={setConfirmAction}
                setShowConfirmDialog={setShowConfirmDialog}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import FileUpload from "@/components/file-upload";
import RichTextEditor from "@/components/rich-text-editor";
import TagInput from "@/components/tag-input";

export default function CreatePost() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [announcementPriority, setAnnouncementPriority] = useState("normal");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Fetch category details
  const { data: category } = useQuery({
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
  });

  // Fetch user's profile to check role
  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const canPostAnnouncements = profile?.community_role === 'instructor' || 
                               profile?.community_role === 'moderator' || 
                               profile?.community_role === 'admin';

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedBoardId || !title || !body) {
        throw new Error("Please fill in all required fields");
      }

      // Validate input
      if (title.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (title.length > 200) {
        throw new Error("Title is too long (max 200 characters)");
      }
      if (body.trim().length === 0) {
        throw new Error("Body cannot be empty");
      }
      if (body.length > 50000) {
        throw new Error("Body is too long (max 50,000 characters)");
      }

      // Generate slug from title
      const slugBase = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const { data: existingPost } = await supabase
        .from('forum_posts')
        .select('slug')
        .eq('slug', slugBase)
        .single();

      const finalSlug = existingPost ? `${slugBase}-${Date.now()}` : slugBase;

      const { error: insertError, data: postData } = await supabase
        .from('forum_posts')
        .insert({
          board_id: selectedBoardId,
          author_id: user.id,
          title,
          body,
          slug: finalSlug,
          is_announcement: isAnnouncement,
          announcement_priority: announcementPriority,
          attachments: attachments,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Save tags
      if (tags.length > 0 && postData) {
        const tagInserts = tags.map(tag => ({
          post_id: postData.id,
          tag: tag.toLowerCase(),
        }));
        await supabase.from('post_tags').insert(tagInserts);
      }

      // Update board post count
      const { data: boardData } = await supabase
        .from('forum_boards')
        .select('post_count')
        .eq('id', selectedBoardId)
        .single();
      
      await supabase
        .from('forum_boards')
        .update({ post_count: (boardData?.post_count || 0) + 1 })
        .eq('id', selectedBoardId);
      
      // Update category post count
      if (category) {
        await supabase
          .from('forum_categories')
          .update({ post_count: (category.post_count || 0) + 1 })
          .eq('id', category.id);
      }

      return finalSlug;
    },
    onSuccess: (postSlug) => {
      setAttachments([]);
      toast({ title: "Post created successfully" });
      queryClient.invalidateQueries({ queryKey: ['forum-posts', category?.id] });
      queryClient.invalidateQueries({ queryKey: ['community-stats'] });
      window.location.href = `/community/posts/${postSlug}`;
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create post", description: error.message, variant: "destructive" });
    },
  });

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link href={`/community/forums/${slug}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {category.name}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Create New Topic</CardTitle>
            <CardDescription>Start a new discussion in {category.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Board Selection */}
              <div>
                <Label htmlFor="board">Board *</Label>
                <Select onValueChange={setSelectedBoardId} value={selectedBoardId}>
                  <SelectTrigger id="board">
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board: any) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter a descriptive title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {title.length}/200 characters
                </p>
              </div>

              {/* Body */}
              <div>
                <Label htmlFor="body">Content *</Label>
                <RichTextEditor
                  content={body}
                  onChange={setBody}
                  placeholder="Write your post content here..."
                />
              </div>

              {/* File Attachments */}
              <div>
                <Label>Attachments</Label>
                <FileUpload
                  onFilesChange={setAttachments}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024}
                  acceptedTypes={['image/*', 'application/pdf']}
                />
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <TagInput
                  tags={tags}
                  onTagsChange={setTags}
                  placeholder="Add tags (e.g., help, question, discussion)"
                  maxTags={5}
                />
              </div>

              {/* Announcement Options (for instructors/moderators/admins) */}
              {canPostAnnouncements && (
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="announcement"
                      checked={isAnnouncement}
                      onChange={(e) => setIsAnnouncement(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="announcement" className="font-medium">
                      Post as Announcement
                    </Label>
                  </div>
                  
                  {isAnnouncement && (
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select onValueChange={setAnnouncementPriority} value={announcementPriority}>
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Link href={`/community/forums/${slug}`}>
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  onClick={() => createPostMutation.mutate()}
                  disabled={!selectedBoardId || !title || !body || createPostMutation.isPending}
                >
                  {createPostMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Post Topic"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Posting Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use clear, descriptive titles</li>
              <li>• Search before posting to avoid duplicates</li>
              <li>• Be respectful and professional</li>
              <li>• Include relevant details in your post</li>
              <li>• Use appropriate board for your topic</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { X, Loader2, Image as ImageIcon, Tag, Eye, ChevronDown } from "lucide-react";
import RichTextEditor from "@/components/rich-text-editor";
import RichTextViewer from "@/components/rich-text-viewer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface NewPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedCategory?: string;
}

interface DraftData {
  title: string;
  body: string;
  selectedBoardId: string;
  tags: string[];
  timestamp: number;
}

export default function NewPostModal({ open, onOpenChange, preSelectedCategory }: NewPostModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftAge, setDraftAge] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch forum categories and boards
  const { data: categories = [] } = useQuery({
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
  });

  // Fetch user's enrolled course boards
  const { data: myCourseBoards = [] } = useQuery({
    queryKey: ['my-course-boards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, course:courses(id, title, cohort_id)')
        .eq('user_id', user.id);

      if (!enrollments || enrollments.length === 0) return [];

      const courseIds = enrollments.map((e: any) => e.course_id);
      const { data: boards, error } = await supabase
        .from('forum_boards')
        .select('*, course:courses(id, title, cohort_id)')
        .in('course_edition_id', courseIds)
        .eq('is_course_board', true);
      if (error) throw error;
      return boards || [];
    },
    enabled: !!user,
  });

  // Fetch all boards for general forums
  const { data: generalBoards = [] } = useQuery({
    queryKey: ['general-boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_boards')
        .select('*, category:forum_categories(id, name, slug)')
        .eq('is_course_board', false)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch existing tags for autocomplete
  const { data: existingTags = [] } = useQuery({
    queryKey: ['forum-tags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('forum_posts')
        .select('tags')
        .not('tags', 'is', null);
      const allTags = (data || []).flatMap((p: any) => p.tags || []);
      return Array.from(new Set(allTags)).slice(0, 50);
    },
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!open) return;

    const saveDraft = () => {
      if (title || body || selectedBoardId || tags.length > 0) {
        const draft: DraftData = {
          title,
          body,
          selectedBoardId,
          tags,
          timestamp: Date.now(),
        };
        localStorage.setItem('community-post-draft', JSON.stringify(draft));
      }
    };

    const interval = setInterval(saveDraft, 30000); // Save every 30 seconds
    return () => clearInterval(interval);
  }, [open, title, body, selectedBoardId, tags]);

  // Check for existing draft on open
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem('community-post-draft');
      if (savedDraft) {
        try {
          const draft: DraftData = JSON.parse(savedDraft);
          const ageMinutes = Math.floor((Date.now() - draft.timestamp) / 60000);
          if (ageMinutes < 60 && (draft.title || draft.body || draft.selectedBoardId)) {
            setDraftAge(ageMinutes);
            setShowDraftBanner(true);
          }
        } catch (e) {
          // Invalid draft, ignore
        }
      }
    }
  }, [open]);

  // Pre-select category if provided
  useEffect(() => {
    if (preSelectedCategory && open) {
      const board = [...generalBoards, ...myCourseBoards].find(
        (b: any) => b.slug === preSelectedCategory || b.category?.slug === preSelectedCategory
      );
      if (board) {
        setSelectedBoardId(board.id);
      }
    }
  }, [preSelectedCategory, open, generalBoards, myCourseBoards]);

  // Restore draft
  const restoreDraft = () => {
    const savedDraft = localStorage.getItem('community-post-draft');
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        setTitle(draft.title);
        setBody(draft.body);
        setSelectedBoardId(draft.selectedBoardId);
        setTags(draft.tags);
        setShowDraftBanner(false);
      } catch (e) {
        localStorage.removeItem('community-post-draft');
      }
    }
  };

  // Clear draft
  const clearDraft = () => {
    localStorage.removeItem('community-post-draft');
    setShowDraftBanner(false);
  };

  // Handle image attachment
  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });

    if (validFiles.length !== files.length) {
      toast({ 
        title: "Some files were skipped", 
        description: "Only images (JPEG, PNG, WebP, GIF) under 5MB are allowed.",
        variant: "destructive" 
      });
    }

    if (attachedImages.length + validFiles.length > 3) {
      toast({ 
        title: "Too many images", 
        description: "Maximum 3 images per post.",
        variant: "destructive" 
      });
      return;
    }

    setAttachedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag) && tags.length < 5) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Filter boards by search term
  const filteredGeneralBoards = generalBoards.filter((board: any) =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourseBoards = myCourseBoards.filter((board: any) =>
    board.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    board.course?.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedBoard = [...generalBoards, ...myCourseBoards].find((b: any) => b.id === selectedBoardId);

  // Submit post
  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedBoardId || !title || !body) {
        throw new Error("Please fill in all required fields");
      }

      // Upload images
      const imageUrls: string[] = [];
      for (const image of attachedImages) {
        const fileName = `${user.id}-${Date.now()}-${image.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('forum-attachments')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('forum-attachments')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
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

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          board_id: selectedBoardId,
          author_id: user.id,
          title,
          body,
          slug: finalSlug,
          tags,
          attachments: imageUrls,
        });

      if (error) throw error;

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

      return finalSlug;
    },
    onSuccess: (postSlug) => {
      // Clear draft
      localStorage.removeItem('community-post-draft');
      
      // Reset form
      setTitle("");
      setBody("");
      setSelectedBoardId("");
      setTags([]);
      setAttachedImages([]);
      setIsPreview(false);
      
      // Close modal
      onOpenChange(false);
      
      // Show success toast
      toast({ 
        title: "Your post is live ✓",
        description: "Your post has been published successfully."
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-stats'] });
      queryClient.invalidateQueries({ queryKey: ['trending-posts'] });
      
      // Redirect to post
      window.location.href = `/community/posts/${postSlug}`;
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create post", 
        description: error.message, 
        variant: "destructive" 
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (title.length < 10) {
      toast({ title: "Title too short", description: "Minimum 10 characters required", variant: "destructive" });
      return;
    }
    if (body.length < 20) {
      toast({ title: "Content too short", description: "Minimum 20 characters required", variant: "destructive" });
      return;
    }
    if (!selectedBoardId) {
      toast({ title: "Category required", description: "Please select a category", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    createPostMutation.mutate();
  };

  const handleCancel = () => {
    if (title || body || selectedBoardId || tags.length > 0 || attachedImages.length > 0) {
      setShowCancelConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const confirmCancel = () => {
    localStorage.removeItem('community-post-draft');
    setTitle("");
    setBody("");
    setSelectedBoardId("");
    setTags([]);
    setAttachedImages([]);
    setShowCancelConfirm(false);
    onOpenChange(false);
  };

  const canSubmit = title.length >= 10 && body.length >= 20 && selectedBoardId && !isSubmitting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto sm:rounded-lg rounded-none h-full sm:h-auto fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Create a New Post</DialogTitle>
          </DialogHeader>

          {/* Draft Banner */}
          {showDraftBanner && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-800 mb-2">
                You have an unsaved draft from {draftAge} {draftAge === 1 ? 'minute' : 'minutes'} ago.
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={restoreDraft}>
                  Restore draft
                </Button>
                <Button size="sm" variant="ghost" onClick={clearDraft}>
                  Start fresh
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What's your question or discussion topic?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="mt-1"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-muted-foreground">Minimum 10 characters</p>
                <p className="text-xs text-muted-foreground">{title.length}/120</p>
              </div>
            </div>

            {/* Category/Board Selection */}
            <div>
              <Label htmlFor="category">Post in *</Label>
              <div className="relative mt-1">
                <div
                  className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-background cursor-pointer"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <span className={selectedBoard ? "text-foreground" : "text-muted-foreground"}>
                    {selectedBoard?.name || "Select a category..."}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
                
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <Input
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 border-b rounded-none focus:ring-0"
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    {/* General Forums */}
                    {filteredGeneralBoards.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">General Forums</p>
                        {filteredGeneralBoards.map((board: any) => (
                          <div
                            key={board.id}
                            className="px-2 py-2 hover:bg-accent cursor-pointer rounded"
                            onClick={() => {
                              setSelectedBoardId(board.id);
                              setShowDropdown(false);
                              setSearchTerm("");
                            }}
                          >
                            <div className="font-medium">{board.name}</div>
                            <div className="text-xs text-muted-foreground">{board.category?.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* My Course Boards */}
                    {filteredCourseBoards.length > 0 ? (
                      <div className="p-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">My Course Boards</p>
                        {filteredCourseBoards.map((board: any) => (
                          <div
                            key={board.id}
                            className="px-2 py-2 hover:bg-accent cursor-pointer rounded"
                            onClick={() => {
                              setSelectedBoardId(board.id);
                              setShowDropdown(false);
                              setSearchTerm("");
                            }}
                          >
                            <div className="font-medium">{board.course?.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {board.course?.cohort_id} · {board.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border-t">
                        <p className="text-sm text-muted-foreground text-center">
                          No course boards yet — enroll in a course to access course discussions
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div>
              <Label htmlFor="body">Content *</Label>
              <div className="mt-1">
                {isPreview ? (
                  <div className="border rounded-lg p-4 min-h-[200px]">
                    <RichTextViewer content={body} />
                  </div>
                ) : (
                  <RichTextEditor
                    content={body}
                    onChange={setBody}
                    placeholder="Share your thoughts, ask a question, or start a discussion..."
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 20 characters</p>
            </div>

            {/* Image Attachments */}
            <div>
              <Label>Attach Images (max 3)</Label>
              <div className="mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachedImages.length >= 3}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageAttach}
                  className="hidden"
                />
                
                {attachedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {attachedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-20 w-20 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags (optional, max 5)</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. arbitration, award-writing"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="pl-9"
                  />
                </div>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
              
              {tagInput && existingTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Suggested tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingTags
                      .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
                      .slice(0, 5)
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => {
                            if (tags.length < 5) {
                              setTags([...tags, tag]);
                              setTagInput("");
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex items-center justify-between w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreview(!isPreview)}
                className="hover:bg-gray-100 active:scale-95"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isPreview ? "← Back to Edit" : "Preview"}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="hover:bg-gray-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="bg-red-600 hover:bg-red-700 active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Now →"
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this post?</AlertDialogTitle>
            <AlertDialogDescription>
              Your draft will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

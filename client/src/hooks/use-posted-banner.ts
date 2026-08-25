import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UsePostedBannerOptions {
  courseId?: string;
  liveSessionId?: string;
}

// Live "new coursework posted" banner. Mirrors the Supabase Realtime pattern
// already used for forum replies (client/src/pages/community-post.tsx). Works
// because the server's "Post now" action does a plain UPDATE ... SET posted_at
// = now(), and Postgres Changes only delivers a row to a subscriber once RLS
// authorizes it for them -- so a student only ever receives this event for an
// item that has actually just become visible to them.
export function usePostedBanner({ courseId, liveSessionId }: UsePostedBannerOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const anchorColumn = liveSessionId ? "live_session_id" : courseId ? "course_id" : null;
    const anchorId = liveSessionId || courseId;
    if (!anchorColumn || !anchorId) return;

    const queryKey = liveSessionId ? ["session-coursework", liveSessionId] : ["course-coursework", courseId];

    const handlePosted = (kind: "assignment" | "quiz") => (payload: any) => {
      const row = payload.new;
      if (!row?.posted_at) return;
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: kind === "assignment" ? "New assignment posted" : "New quiz posted",
        description: row.title,
      });
    };

    const channel = supabase
      .channel(`coursework:${anchorColumn}:${anchorId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "assignments", filter: `${anchorColumn}=eq.${anchorId}` },
        handlePosted("assignment"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quizzes", filter: `${anchorColumn}=eq.${anchorId}` },
        handlePosted("quiz"),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, liveSessionId, queryClient, toast]);
}

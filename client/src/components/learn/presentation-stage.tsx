import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LearnLesson } from "./types";
import { LazyPresentationViewer } from "./LazyPresentationViewer";

const sb: any = supabase;

interface Props {
  lesson: LearnLesson;
  initialSlide: number;
  completed: boolean;
  onProgress: (slideIndex: number, completed: boolean) => void;
}

export default function PresentationStage({ lesson, initialSlide, completed, onProgress }: Props) {
  const { data: presentation, isLoading } = useQuery({
    queryKey: ["lesson-presentation", lesson.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("presentations")
        .select("*")
        .eq("lesson_id", lesson.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="bg-background pt-6 pb-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Loading presentation…
          </div>
        ) : !presentation ? (
          <div className="p-6 text-sm text-muted-foreground border rounded-lg">
            No presentation attached to this lesson yet.
          </div>
        ) : (
          <LazyPresentationViewer
            fileUrl={presentation.file_url}
            fileName={presentation.file_name}
            initialSlide={initialSlide}
            allowDownload={!!presentation.allow_download}
            className="min-h-[60vh]"
            onSlideChange={(index, total) => {
              const isLast = total > 0 && index === total - 1;
              onProgress(index, completed || isLast);
            }}
          />
        )}
      </div>
    </div>
  );
}

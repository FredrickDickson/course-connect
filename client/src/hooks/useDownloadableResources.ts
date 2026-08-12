import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface DownloadableResource {
  id: string;
  title: string;
  description: string;
  resource_type: "PDF" | "Guide" | "Handbook" | "Rules" | "Policy" | "Workplan" | "Document";
  category: "Arbitrator" | "Mediator" | "Both";
  file_size: string;
  download_url: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useDownloadableResources(category?: "Arbitrator" | "Mediator" | "Both") {
  return useQuery({
    queryKey: ["downloadable-resources", category],
    queryFn: async () => {
      let query = supabase
        .from("downloadable_resources")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      // Filter by category if provided
      if (category && category !== "Both") {
        query = query.or(`category.eq.${category},category.eq.Both`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching downloadable resources:", error);
        throw error;
      }

      return data as DownloadableResource[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useArbitratorResources() {
  return useDownloadableResources("Arbitrator");
}

export function useMediatorResources() {
  return useDownloadableResources("Mediator");
}

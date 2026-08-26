/**
 * Session Materials Component
 * Displays assignments and resources for a live session
 * Visible to registered students and instructors
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Download,
  Calendar,
  Award,
  Clock,
  AlertCircle,
  File,
  Loader2,
} from "lucide-react";

interface SessionMaterialsProps {
  sessionId: string;
  userRegistered: boolean;
  isInstructor: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string | null;
  max_score: number | null;
  allow_late_submission: boolean | null;
}

interface Resource {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  download_count: number | null;
}

export default function SessionMaterials({
  sessionId,
  userRegistered,
  isInstructor,
}: SessionMaterialsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadResource = async (resource: Resource) => {
    try {
      const response = await fetch(resource.file_url);
      if (!response.ok) throw new Error("Download failed");

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resource.file_name || resource.title;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Storage may block browser fetches; let the browser handle the public URL.
      window.location.href = resource.file_url;
    }
  };

  // Fetch assignments
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useQuery<Assignment[]>({
    queryKey: ["session_assignments", sessionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/sessions/${sessionId}/assignments`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
    enabled: userRegistered || isInstructor,
    refetchOnMount: "always",
  });

  // Fetch resources
  const {
    data: resources = [],
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery<Resource[]>({
    queryKey: ["session_resources", sessionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/sessions/${sessionId}/resources`);
      if (!response.ok) throw new Error("Failed to fetch resources");
      return response.json();
    },
    enabled: userRegistered || isInstructor,
    refetchOnMount: "always",
  });

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) {
      return <Badge variant="secondary" className="text-xs">No Due Date</Badge>;
    }

    const date = new Date(dueDate);
    if (isPast(date)) {
      return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
    }
    
    return <Badge variant="outline" className="text-xs border-[#610000] text-[#610000]">Due {format(date, "MMM d, yyyy")}</Badge>;
  };

  if (!userRegistered && !isInstructor) {
    return (
      <Card className="border-[#d4c5b0]/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-[#8b6f47] opacity-50 mb-4" />
          <h3 className="text-lg font-semibold text-[#2c2015] mb-2">
            Register to Access Materials
          </h3>
          <p className="text-[#6b5d4f]">
            Register for this session to view assignments and resources
          </p>
        </CardContent>
      </Card>
    );
  }

  if (assignmentsLoading || resourcesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#610000]" />
      </div>
    );
  }

  if (assignmentsError || resourcesError) {
    const errorMessage = assignmentsError?.message || resourcesError?.message || "Unable to load session materials";

    return (
      <Card className="border-red-200">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 opacity-70 mb-4" />
          <h3 className="text-lg font-semibold text-[#2c2015] mb-2">
            Materials Could Not Be Loaded
          </h3>
          <p className="text-[#6b5d4f] break-words">{errorMessage}</p>
        </CardContent>
      </Card>
    );
  }

  const hasContent = assignments.length > 0 || resources.length > 0;

  if (!hasContent) {
    return (
      <Card className="border-[#d4c5b0]/30">
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-[#8b6f47] opacity-50 mb-4" />
          <h3 className="text-lg font-semibold text-[#2c2015] mb-2">
            No Materials Yet
          </h3>
          <p className="text-[#6b5d4f]">
            {isInstructor
              ? "Add assignments or resources when creating/editing the session"
              : "The instructor hasn't added any materials for this session yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignments Section */}
      {assignments.length > 0 && (
        <Card className="border-[#d4c5b0]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#610000]" />
              Session Assignments
            </CardTitle>
            <CardDescription>
              Complete these assignments related to this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assignments.map((assignment, index) => (
              <div key={assignment.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#2c2015] text-lg">
                        {assignment.title}
                      </h4>
                      {assignment.description && (
                        <p className="text-sm text-[#6b5d4f] mt-1">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                    {getDueDateBadge(assignment.due_date)}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#6b5d4f]">
                    {assignment.max_score && (
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4 w-4" />
                        <span>{assignment.max_score} points</span>
                      </div>
                    )}
                    {assignment.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Due {format(new Date(assignment.due_date), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    )}
                    {assignment.allow_late_submission && (
                      <Badge variant="outline" className="text-xs">
                        Late submission allowed
                      </Badge>
                    )}
                  </div>

                  {assignment.instructions && (
                    <div className="bg-[#faf9f6] p-4 rounded-lg">
                      <p className="text-sm text-[#2c2015] font-medium mb-2">Instructions:</p>
                      <div 
                        className="text-sm text-[#6b5d4f] prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: assignment.instructions }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="bg-[#610000] hover:bg-[#7d0000]"
                      onClick={() => {
                        // TODO: Navigate to assignment submission page
                        toast({
                          title: "Coming Soon",
                          description: "Assignment submission feature is being implemented",
                        });
                      }}
                    >
                      View & Submit Assignment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Resources Section */}
      {resources.length > 0 && (
        <Card className="border-[#d4c5b0]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#610000]" />
              Session Resources
            </CardTitle>
            <CardDescription>
              Download materials and resources for this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-4 border border-[#d4c5b0]/30 rounded-lg hover:bg-[#faf9f6] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <File className="h-10 w-10 text-[#610000]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-[#2c2015] truncate">
                        {resource.title}
                      </h5>
                      <p className="text-xs text-[#6b5d4f] flex items-center gap-2 mt-1">
                        <span className="truncate">{resource.file_name}</span>
                        <span>•</span>
                        <span>{formatFileSize(resource.file_size)}</span>
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-shrink-0 border-[#610000] text-[#610000] hover:bg-[#610000] hover:text-white"
                    onClick={() => downloadResource(resource)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

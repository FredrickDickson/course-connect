/**
 * Admin Live Sessions Management
 * Edit and delete scheduled live sessions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Video, Calendar, Clock, Users, Edit, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateSessionDialog from "@/components/live-sessions/create-session-dialog";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_type: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  zoom_join_url: string;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
  };
  course?: {
    id: string;
    title: string;
  };
  participant_count: any[];
}

export default function AdminLiveSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  const { data: sessions = [], isLoading } = useQuery<LiveSession[]>({
    queryKey: ['admin_sessions', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filter === 'upcoming') {
        params.append('upcoming', 'true');
      } else if (filter === 'past') {
        params.append('include_past', 'true');
        params.append('status', 'completed');
      }

      const response = await apiRequest('GET', `/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('DELETE', `/api/sessions/${sessionId}`);
      if (!response.ok) throw new Error('Failed to cancel session');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_sessions'] });
      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: "bg-blue-100 text-blue-800 border-blue-200",
      workshop: "bg-purple-100 text-purple-800 border-purple-200",
      office_hours: "bg-green-100 text-green-800 border-green-200",
      q_a: "bg-orange-100 text-orange-800 border-orange-200",
      webinar: "bg-pink-100 text-pink-800 border-pink-200",
      group_study: "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getStatusBadge = (session: LiveSession) => {
    if (session.status === 'live') {
      return (
        <Badge className="bg-[#5A2633] text-white animate-pulse border-0">
          <span className="h-2 w-2 rounded-full bg-white mr-1.5 animate-pulse" />
          Live Now
        </Badge>
      );
    }

    if (session.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (session.status === 'completed') {
      return <Badge className="bg-gray-500 text-white border-0">Completed</Badge>;
    }

    return <Badge variant="secondary">Scheduled</Badge>
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A2633] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2c2015]">Live Sessions Management</h2>
          <p className="text-sm text-[#6b5d4f] mt-1">
            Manage all scheduled live sessions across the platform
          </p>
        </div>
        <CreateSessionDialog />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          onClick={() => setFilter('upcoming')}
          className={filter === 'upcoming' ? 'bg-[#5A2633] hover:bg-[#5A2633]' : ''}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-[#5A2633] hover:bg-[#5A2633]' : ''}
        >
          All
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'outline'}
          onClick={() => setFilter('past')}
          className={filter === 'past' ? 'bg-[#5A2633] hover:bg-[#5A2633]' : ''}
        >
          Past
        </Button>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card className="border-[#d4c5b0]/30">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#f5f3ed] flex items-center justify-center">
              <Video className="w-10 h-10 text-[#8b6f47]" />
            </div>
            <h3 className="text-xl font-bold text-[#2c2015] mb-2">No sessions found</h3>
            <p className="text-[#6b5d4f]">
              {filter === 'upcoming' ? 'No upcoming sessions scheduled' : filter === 'past' ? 'No past sessions' : 'No sessions found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => {
            const startDate = new Date(session.scheduled_start);
            const participantCount = session.participant_count?.[0]?.count || 0;

            return (
              <Card key={session.id} className="border-[#d4c5b0]/30 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Date Badge */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-gradient-to-br from-[#5A2633] to-[#5A2633] rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                        <span className="text-2xl font-bold">
                          {format(startDate, 'd')}
                        </span>
                        <span className="text-xs uppercase tracking-wider">
                          {format(startDate, 'MMM')}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-xl font-bold text-[#2c2015]">
                              {session.title}
                            </h3>
                            {getStatusBadge(session)}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-[#6b5d4f] flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn("text-xs border", getSessionTypeColor(session.session_type))}
                            >
                              {session.session_type.replace('_', ' ')}
                            </Badge>
                            {session.course && (
                              <>
                                <span>•</span>
                                <span className="text-xs">{session.course.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#6b5d4f]">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>
                            {session.instructor.first_name} {session.instructor.last_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{format(startDate, "MMM d, h:mm a")}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>{session.duration_minutes} minutes</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>{participantCount} registered</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <Link href={`/sessions/${session.id}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Details
                          </Button>
                        </Link>

                        {session.status !== 'completed' && session.status !== 'cancelled' && (
                          <>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Edit className="h-4 w-4" />
                              Edit
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 text-[#5A2633] hover:text-[#5A2633] border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Cancel Session
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will cancel the session "{session.title}" and notify all {participantCount} registered participants. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Session</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(session.id)}
                                    className="bg-[#5A2633] hover:bg-[#5A2633]"
                                  >
                                    Cancel Session
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Live Sessions Page
 * View all upcoming, live, and past sessions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInMinutes } from "date-fns";
import { Link } from "wouter";
import StudentLayout from "@/components/student-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  Calendar,
  Clock,
  Users,
  Search,
  ExternalLink,
  CheckCircle,
  BookOpen,
} from "lucide-react";
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
    profile_image_url?: string;
  };
  course?: {
    id: string;
    title: string;
    thumbnail_url?: string;
  };
  user_registered: boolean;
  user_registration_status?: string;
  participant_count: any[];
}

export default function SessionsPage() {
  const { user, isInstructor, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");

  const { data: sessions = [], isLoading } = useQuery<LiveSession[]>({
    queryKey: ['all_sessions', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (activeTab === 'upcoming') {
        params.append('upcoming', 'true');
      } else if (activeTab === 'past') {
        params.append('include_past', 'true');
        params.append('status', 'completed');
      }

      const response = await apiRequest('GET', `/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 60000,
  });

  const filteredSessions = sessions.filter((session) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(query) ||
      session.description?.toLowerCase().includes(query) ||
      session.instructor.first_name.toLowerCase().includes(query) ||
      session.instructor.last_name.toLowerCase().includes(query) ||
      session.course?.title.toLowerCase().includes(query)
    );
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
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    // If explicitly marked as live
    if (session.status === 'live') {
      return (
        <Badge className="bg-red-500 text-white animate-pulse border-0">
          <span className="h-2 w-2 rounded-full bg-white mr-1.5 animate-pulse" />
          Live Now
        </Badge>
      );
    }

    // If meeting is currently in progress (between start and end time)
    if (now >= start && now <= end) {
      return (
        <Badge className="bg-red-500 text-white animate-pulse border-0">
          <span className="h-2 w-2 rounded-full bg-white mr-1.5 animate-pulse" />
          In Progress
        </Badge>
      );
    }

    if (session.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (session.status === 'completed') {
      return <Badge className="bg-gray-500 text-white border-0">Completed</Badge>;
    }

    const minutesUntil = differenceInMinutes(start, now);

    if (minutesUntil <= 15 && minutesUntil > 0) {
      return (
        <Badge className="bg-orange-500 text-white border-0">
          Starting in {minutesUntil} min
        </Badge>
      );
    }

    return <Badge variant="secondary">Scheduled</Badge>;
  };

  const canJoinSession = (session: LiveSession) => {
    if (!session.user_registered) return false; // Must be registered to join
    
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    // Can join if explicitly marked as live
    if (session.status === 'live') return true;
    
    // Can join if meeting is in progress (between start and end)
    if (now >= start && now <= end) return true;
    
    return false;
  };

  const registerMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/sessions/${sessionId}/register`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_sessions'] });
      toast({
        title: "Registered Successfully",
        description: "You're now registered for this session!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <StudentLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#2c2015] font-sf-pro-display flex items-center gap-3">
                <Video className="h-10 w-10 text-[#610000]" />
                Live Sessions
              </h1>
              <p className="text-lg text-[#6b5d4f] mt-2">
                Join interactive sessions with expert instructors
              </p>
            </div>
            {(isInstructor() || isAdmin()) && <CreateSessionDialog />}
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="border-[#d4c5b0]/30">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions by title, instructor, or course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-[#f5f3ed]">
            <TabsTrigger value="upcoming">
              Upcoming ({sessions.filter(s => s.status === 'scheduled' || s.status === 'live').length})
            </TabsTrigger>
            <TabsTrigger value="registered">
              Registered ({sessions.filter(s => s.user_registered).length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <SessionsList
              sessions={filteredSessions.filter(
                s => s.status === 'scheduled' || s.status === 'live'
              )}
              isLoading={isLoading}
              getSessionTypeColor={getSessionTypeColor}
              getStatusBadge={getStatusBadge}
              canJoinSession={canJoinSession}
              registerMutation={registerMutation}
            />
          </TabsContent>

          <TabsContent value="registered" className="mt-6">
            <SessionsList
              sessions={filteredSessions.filter(s => s.user_registered)}
              isLoading={isLoading}
              getSessionTypeColor={getSessionTypeColor}
              getStatusBadge={getStatusBadge}
              canJoinSession={canJoinSession}
              registerMutation={registerMutation}
            />
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <SessionsList
              sessions={filteredSessions.filter(s => s.status === 'completed')}
              isLoading={isLoading}
              getSessionTypeColor={getSessionTypeColor}
              getStatusBadge={getStatusBadge}
              canJoinSession={canJoinSession}
              registerMutation={registerMutation}
              showPast
            />
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
}

interface SessionsListProps {
  sessions: LiveSession[];
  isLoading: boolean;
  getSessionTypeColor: (type: string) => string;
  getStatusBadge: (session: LiveSession) => JSX.Element | null;
  canJoinSession: (session: LiveSession) => boolean;
  registerMutation: any;
  showPast?: boolean;
}

function SessionsList({
  sessions,
  isLoading,
  getSessionTypeColor,
  getStatusBadge,
  canJoinSession,
  registerMutation,
  showPast = false,
}: SessionsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#610000] border-t-transparent" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-[#d4c5b0]/30">
        <CardContent className="py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#f5f3ed] flex items-center justify-center">
            <Calendar className="w-10 h-10 text-[#8b6f47]" />
          </div>
          <h3 className="text-xl font-bold text-[#2c2015] mb-2">
            {showPast ? 'No past sessions' : 'No sessions found'}
          </h3>
          <p className="text-[#6b5d4f]">
            {showPast
              ? 'Past session recordings will appear here'
              : 'Check back later for upcoming live sessions'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      {sessions.map((session) => {
        const startDate = new Date(session.scheduled_start);
        const isJoinable = canJoinSession(session);
        const participantCount = session.participant_count?.[0]?.count || 0;

        return (
          <Card
            key={session.id}
            className="border-[#d4c5b0]/30 hover:border-[#8b6f47]/40 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Date Badge */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#610000] to-[#8b0000] rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                    <span className="text-2xl font-bold">
                      {format(startDate, 'd')}
                    </span>
                    <span className="text-xs uppercase tracking-wider">
                      {format(startDate, 'MMM')}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
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
                            <BookOpen className="h-3.5 w-3.5" />
                            <span className="truncate">{session.course.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-sm text-[#6b5d4f] line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Instructor & Info */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-[#6b5d4f]">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={session.instructor.profile_image_url} />
                        <AvatarFallback className="text-xs bg-[#610000] text-white">
                          {session.instructor.first_name[0]}
                          {session.instructor.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {session.instructor.first_name} {session.instructor.last_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{format(startDate, "h:mm a")}</span>
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
                    {/* Registered Badge */}
                    {session.user_registered && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Registered
                      </Badge>
                    )}

                    {/* Join Button - Only if registered and session is live */}
                    {isJoinable && session.zoom_join_url && !showPast ? (
                      <Button
                        className="gap-2 bg-gradient-to-br from-[#610000] to-[#8b0000] hover:from-[#7a0000] hover:to-[#a00000]"
                        onClick={() => window.open(session.zoom_join_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Now
                      </Button>
                    ) : showPast ? (
                      <Button variant="secondary" className="gap-2" disabled>
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </Button>
                    ) : session.user_registered && !showPast ? (
                      <Button variant="secondary" className="gap-2" disabled>
                        <Clock className="h-4 w-4" />
                        {differenceInMinutes(new Date(session.scheduled_start), new Date()) > 0 
                          ? `Starts in ${differenceInMinutes(new Date(session.scheduled_start), new Date())} min`
                          : "Starting Soon"}
                      </Button>
                    ) : !showPast ? (
                      <Button
                        className="gap-2 bg-[#610000] hover:bg-[#7a0000]"
                        onClick={(e) => {
                          e.stopPropagation();
                          registerMutation.mutate(session.id);
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <Users className="h-4 w-4" />
                        {registerMutation.isPending ? "Registering..." : "Register"}
                      </Button>
                    ) : null}

                    <Link href={`/sessions/${session.id}`}>
                      <Button variant="ghost">View Details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

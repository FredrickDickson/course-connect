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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  CheckCircle,
  BookOpen,
} from "lucide-react";
import { cn, formatMinutesDuration } from "@/lib/utils";
import { getViewerZoneAbbreviation } from "@shared/timezone";
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
  zoom_start_url?: string;
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

  // Get today's and upcoming sessions for the notice banner
  // Priority: Live > Starting Soon (within 30 min) > Today's sessions (sorted by start time)
  const todaysSessions = sessions
    .filter(session => {
      const sessionDate = new Date(session.scheduled_start);
      const today = new Date();
      return (
        sessionDate.toDateString() === today.toDateString() &&
        (session.status === 'scheduled' || session.status === 'live')
      );
    })
    .sort((a, b) => {
      // Prioritize: 1. Live sessions, 2. Starting soon (< 30 min), 3. Earliest start time
      const now = new Date();
      const aStart = new Date(a.scheduled_start);
      const bStart = new Date(b.scheduled_start);
      const aMinutesUntil = differenceInMinutes(aStart, now);
      const bMinutesUntil = differenceInMinutes(bStart, now);
      
      // Live sessions first
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;
      
      // Then starting soon (within 30 minutes)
      const aStartingSoon = aMinutesUntil >= 0 && aMinutesUntil <= 30;
      const bStartingSoon = bMinutesUntil >= 0 && bMinutesUntil <= 30;
      if (aStartingSoon && !bStartingSoon) return -1;
      if (bStartingSoon && !aStartingSoon) return 1;
      
      // Finally sort by start time (earliest first)
      return aStart.getTime() - bStart.getTime();
    });

  // Get upcoming sessions this week (excluding today), sorted by start time
  const upcomingThisWeek = sessions
    .filter(session => {
      const sessionDate = new Date(session.scheduled_start);
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return (
        sessionDate >= today &&
        sessionDate <= nextWeek &&
        sessionDate.toDateString() !== today.toDateString() &&
        (session.status === 'scheduled' || session.status === 'live')
      );
    })
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

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
      <div className="space-y-8 pb-8 md:pb-0">
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

        {/* Notice Banner for Today's Sessions */}
        {todaysSessions.length > 0 && (
          <Card className="border-[#610000] bg-gradient-to-r from-[#610000] to-[#8b0000] text-white shadow-lg">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Video className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <span className="animate-pulse">🔴</span>
                    {todaysSessions.length === 1 ? 'Live Session Today!' : `${todaysSessions.length} Live Sessions Today!`}
                  </h3>
                  {todaysSessions.map((session, index) => {
                    const now = new Date();
                    const sessionStart = new Date(session.scheduled_start);
                    const minutesUntil = differenceInMinutes(sessionStart, now);
                    const isLive = session.status === 'live' || (now >= sessionStart && now <= new Date(session.scheduled_end));
                    const isStartingSoon = minutesUntil >= 0 && minutesUntil <= 30;
                    
                    return (
                      <div key={session.id} className={cn("space-y-2", index > 0 && "pt-3 border-t border-white/20")}>
                        {/* Priority Badge */}
                        {index === 0 && (isLive || isStartingSoon) && (
                          <div className="inline-flex items-center gap-1 bg-white/30 px-2 py-1 rounded text-xs font-bold">
                            {isLive ? '🔴 LIVE NOW' : `⏰ Starting in ${minutesUntil} min`}
                          </div>
                        )}
                        
                        <p className="text-white text-sm sm:text-base font-semibold">
                          {session.title}
                        </p>
                        {session.course && (
                          <p className="text-white/80 text-xs sm:text-sm">
                            📚 {session.course.title}
                          </p>
                        )}
                        <div className="flex flex-col xs:flex-row xs:items-center gap-2 text-xs sm:text-sm">
                          <span className="text-white/90">
                            📅 {format(sessionStart, "h:mm a")}
                          </span>
                          {session.user_registered ? (
                            <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-xs w-fit">
                              <CheckCircle className="h-3 w-3" />
                              You're registered
                            </span>
                          ) : (
                            <Link href={`/sessions/${session.id}`}>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-8 text-xs sm:text-sm bg-white text-[#610000] hover:bg-white/90 w-full xs:w-auto font-semibold"
                              >
                                Register Now →
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming This Week Banner - Minimal Warm Ivory & Charcoal Design */}
        {upcomingThisWeek.length > 0 && todaysSessions.length === 0 && (
          <Card className="border-[#2C2C2C]/10 bg-[#F5F1E8] shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-[#2C2C2C] flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#F5F1E8]" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-[#2C2C2C]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {upcomingThisWeek.length === 1 
                      ? 'Upcoming Session This Week' 
                      : `${upcomingThisWeek.length} Upcoming Sessions This Week`}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#2C2C2C]/80 leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    <span className="font-semibold">{upcomingThisWeek[0].title}</span>
                    <br className="sm:hidden" />
                    <span className="block sm:inline sm:ml-1">
                      on {format(new Date(upcomingThisWeek[0].scheduled_start), "EEE, MMM d 'at' h:mm a")}
                    </span>
                    {upcomingThisWeek.length > 1 && (
                      <span className="block mt-1 text-[#2C2C2C]/60">
                        + {upcomingThisWeek.length - 1} more session{upcomingThisWeek.length > 2 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-[#f5f3ed] h-auto">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm py-2 sm:py-2.5">
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Up</span>
              <span className="ml-1">({sessions.filter(s => s.status === 'scheduled' || s.status === 'live').length})</span>
            </TabsTrigger>
            <TabsTrigger value="registered" className="text-xs sm:text-sm py-2 sm:py-2.5">
              <span className="hidden sm:inline">Registered</span>
              <span className="sm:hidden">Reg</span>
              <span className="ml-1">({sessions.filter(s => s.user_registered).length})</span>
            </TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm py-2 sm:py-2.5">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <SessionsList
              sessions={sessions.filter(
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
              sessions={sessions.filter(s => s.user_registered)}
              isLoading={isLoading}
              getSessionTypeColor={getSessionTypeColor}
              getStatusBadge={getStatusBadge}
              canJoinSession={canJoinSession}
              registerMutation={registerMutation}
            />
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <SessionsList
              sessions={sessions.filter(s => s.status === 'completed')}
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
  const { user, isAdmin } = useAuth();

  const canStartSession = (session: LiveSession) => {
    if (!user) return false;
    if (session.status === 'cancelled' || session.status === 'completed') return false;
    return isAdmin() || session.instructor.id === user.id;
  };

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
        const isStartable = canStartSession(session);
        const participantCount = session.participant_count?.[0]?.count || 0;
        const minsUntilStart = differenceInMinutes(startDate, new Date());

        return (
          <Card
            key={session.id}
            className="border-[#d4c5b0]/30 hover:border-[#8b6f47]/40 hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Date Badge */}
                <div className="flex-shrink-0 self-start">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#610000] to-[#8b0000] rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                    <span className="text-xl sm:text-2xl font-bold">
                      {format(startDate, 'd')}
                    </span>
                    <span className="text-[10px] sm:text-xs uppercase tracking-wider">
                      {format(startDate, 'MMM')}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3 sm:space-y-4">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-[#2c2015] flex-1">
                        {session.title}
                      </h3>
                      {getStatusBadge(session)}
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[#6b5d4f] flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", getSessionTypeColor(session.session_type))}
                      >
                        {session.session_type.replace('_', ' ')}
                      </Badge>
                      {session.course && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <div className="flex items-center gap-1 w-full sm:w-auto">
                            <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate text-xs">{session.course.title}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-xs sm:text-sm text-[#6b5d4f] line-clamp-2 leading-relaxed">
                      {session.description}
                    </p>
                  )}

                  {/* Instructor & Info */}
                  <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 sm:gap-y-3 text-xs sm:text-sm text-[#6b5d4f]">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                        <AvatarImage src={session.instructor.profile_image_url} />
                        <AvatarFallback className="text-[10px] sm:text-xs bg-[#610000] text-white">
                          {session.instructor.first_name[0]}
                          {session.instructor.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-xs sm:text-sm">
                        {session.instructor.first_name} {session.instructor.last_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{format(startDate, "h:mm a")} {getViewerZoneAbbreviation(startDate)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{formatMinutesDuration(session.duration_minutes)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>{participantCount}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col xs:flex-row xs:flex-wrap items-stretch xs:items-center gap-2 sm:gap-3 pt-2">
                    {/* Registered Badge */}
                    {session.user_registered && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 w-fit">
                        <CheckCircle className="h-3 w-3" />
                        Registered
                      </Badge>
                    )}

                    {/* Start Meeting Button - Instructor/admin host control */}
                    {isStartable && session.zoom_start_url && !showPast ? (
                      <Button
                        className="gap-2 bg-gradient-to-br from-[#610000] to-[#8b0000] hover:from-[#7a0000] hover:to-[#a00000]"
                        onClick={() => window.open(session.zoom_start_url, '_blank')}
                      >
                        <Video className="h-4 w-4" />
                        Start Meeting
                      </Button>
                    ) : /* Join Button - Only if registered and session is live */
                    isJoinable && session.zoom_join_url && !showPast ? (
                      <Button
                        className="gap-2 bg-gradient-to-br from-[#610000] to-[#8b0000] hover:from-[#7a0000] hover:to-[#a00000] w-full xs:w-auto text-sm"
                        size="default"
                        onClick={() => window.open(session.zoom_join_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Now
                      </Button>
                    ) : showPast ? (
                      <Button variant="secondary" className="gap-2 w-full xs:w-auto text-sm" disabled>
                        <CheckCircle className="h-4 w-4" />
                        Completed
                      </Button>
                    ) : session.user_registered && !showPast ? (
                      <Button variant="secondary" className="gap-2 w-full xs:w-auto text-xs sm:text-sm" disabled>
                        <Clock className="h-4 w-4" />
                        <span className="hidden xs:inline">
                          {minsUntilStart > 0
                            ? `Starts in ${formatMinutesDuration(minsUntilStart)}`
                            : "Starting Soon"}
                        </span>
                        <span className="xs:hidden">
                          {minsUntilStart > 0
                            ? formatMinutesDuration(minsUntilStart)
                            : "Soon"}
                        </span>
                      </Button>
                    ) : !showPast ? (
                      <Button
                        className="gap-2 bg-[#610000] hover:bg-[#7a0000] w-full xs:w-auto text-sm"
                        size="default"
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
                      <Button variant="ghost" className="w-full xs:w-auto text-sm">View Details</Button>
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

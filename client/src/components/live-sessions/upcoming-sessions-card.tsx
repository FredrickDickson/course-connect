import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInMinutes } from "date-fns";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Video,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { cn, formatMinutesDuration } from "@/lib/utils";
import { getViewerZoneAbbreviation } from "@shared/timezone";

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

export default function UpcomingSessionsCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  
  const { data: sessions = [], isLoading } = useQuery<LiveSession[]>({
    queryKey: ['upcoming_sessions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sessions?upcoming=true');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 60000,
  });

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
      queryClient.invalidateQueries({ queryKey: ['upcoming_sessions'] });
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

  const getSessionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      lecture: "bg-blue-100 text-blue-800",
      workshop: "bg-purple-100 text-purple-800",
      office_hours: "bg-green-100 text-green-800",
      q_a: "bg-orange-100 text-orange-800",
      webinar: "bg-pink-100 text-pink-800",
      group_study: "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (session: LiveSession) => {
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    if (session.status === 'live') {
      return (
        <Badge className="bg-[#5A2633] text-white animate-pulse">
          <span className="h-2 w-2 rounded-full bg-white mr-1" />
          Live Now
        </Badge>
      );
    }

    if (now >= start && now <= end) {
      return (
        <Badge className="bg-[#5A2633] text-white animate-pulse">
          <span className="h-2 w-2 rounded-full bg-white mr-1" />
          In Progress
        </Badge>
      );
    }
    
    const minutesUntil = differenceInMinutes(start, now);
    
    if (minutesUntil <= 15 && minutesUntil > 0) {
      return (
        <Badge className="bg-orange-500 text-white">
          Starting in {minutesUntil} min
        </Badge>
      );
    }
    
    return null;
  };

  const canJoinSession = (session: LiveSession) => {
    if (!session.user_registered) return false; // Must be registered to join

    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    if (session.status === 'live') return true;

    // Can join if within session time window
    return now >= start && now <= end;
  };

  const canStartSession = (session: LiveSession) => {
    if (!user) return false;
    if (session.status === 'cancelled' || session.status === 'completed') return false;
    return isAdmin() || session.instructor.id === user.id;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle>Upcoming Live Sessions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle>Upcoming Live Sessions</CardTitle>
          </div>
          <CardDescription>
            Join live sessions to interact with instructors in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              No upcoming sessions scheduled
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Check back later or browse available courses
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            <CardTitle>Upcoming Live Sessions</CardTitle>
          </div>
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <CardDescription>
          Join live sessions to interact with instructors in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.slice(0, 3).map((session, index) => {
          const startDate = new Date(session.scheduled_start);
          const isJoinable = canJoinSession(session);
          const isStartable = canStartSession(session);
          const participantCount = session.participant_count?.[0]?.count || 0;
          
          const now = new Date();
          const start = new Date(session.scheduled_start);
          const end = new Date(session.scheduled_end);
          const isInProgress = (now >= start && now <= end) || session.status === 'live';
          const minsUntilStart = differenceInMinutes(start, now);

          return (
            <div key={session.id}>
              {index > 0 && <Separator className="my-4" />}
              
              <div className={cn(
                "space-y-3 p-3 rounded-lg transition-all",
                isInProgress && "bg-red-50 border-2 border-red-200 shadow-sm"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm leading-tight">
                        {session.title}
                      </h4>
                      {getStatusBadge(session)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getSessionTypeColor(session.session_type))}
                      >
                        {session.session_type.replace('_', ' ')}
                      </Badge>
                      {session.course && (
                        <span className="truncate">• {session.course.title}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={session.instructor.profile_image_url} />
                    <AvatarFallback className="text-xs">
                      {session.instructor.first_name[0]}
                      {session.instructor.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {session.instructor.first_name} {session.instructor.last_name}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(startDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(startDate, "h:mm a")} {getViewerZoneAbbreviation(startDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{participantCount} registered</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Registered Badge */}
                  {session.user_registered && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Registered
                    </Badge>
                  )}

                  {/* Start Meeting Button - Instructor/admin host control */}
                  {isStartable && session.zoom_start_url ? (
                    <Button
                      size="sm"
                      className={cn(
                        "gap-1",
                        isInProgress
                          ? "bg-[#5A2633] hover:bg-[#5A2633] text-white animate-pulse"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={() => window.open(session.zoom_start_url, '_blank')}
                    >
                      <Video className="h-3.5 w-3.5" />
                      {isInProgress ? "Start Meeting - Live!" : "Start Meeting"}
                    </Button>
                  ) : isJoinable && session.zoom_join_url ? (
                    <Button
                      size="sm"
                      className={cn(
                        "gap-1",
                        isInProgress
                          ? "bg-[#5A2633] hover:bg-[#5A2633] text-white animate-pulse"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={() => window.open(session.zoom_join_url, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isInProgress ? "Join Now - Live!" : "Join Session"}
                    </Button>
                  ) : session.user_registered ? (
                    <Button size="sm" variant="secondary" className="gap-1" disabled>
                      <Clock className="h-3.5 w-3.5" />
                      {minsUntilStart > 0
                        ? `Starts in ${formatMinutesDuration(minsUntilStart)}`
                        : "Starting Soon"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1 bg-[#5A2633] hover:bg-[#7a0000]"
                      onClick={(e) => {
                        e.stopPropagation();
                        registerMutation.mutate(session.id);
                      }}
                      disabled={registerMutation.isPending}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {registerMutation.isPending ? "Registering..." : "Register"}
                    </Button>
                  )}
                  
                  <Link href={`/sessions/${session.id}`}>
                    <Button size="sm" variant="ghost">
                      Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {sessions.length > 3 && (
          <div className="pt-4">
            <Link href="/sessions">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View {sessions.length - 3} More Sessions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

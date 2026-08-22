import { useQuery } from "@tanstack/react-query";
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
import {
  Video,
  Calendar,
  Clock,
  Users,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function UpcomingSessionsCard() {
  const { data: sessions = [], isLoading } = useQuery<LiveSession[]>({
    queryKey: ['upcoming_sessions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sessions?upcoming=true');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    },
    refetchInterval: 60000,
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
        <Badge className="bg-red-500 text-white animate-pulse">
          <span className="h-2 w-2 rounded-full bg-white mr-1" />
          Live Now
        </Badge>
      );
    }

    if (now >= start && now <= end) {
      return (
        <Badge className="bg-red-500 text-white animate-pulse">
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
    const now = new Date();
    const start = new Date(session.scheduled_start);
    const end = new Date(session.scheduled_end);

    if (session.status === 'live') return true;
    
    if (now >= start && now <= end) return true;
    
    const minutesUntil = differenceInMinutes(start, now);
    return minutesUntil <= 15 && minutesUntil > 0;
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
          const participantCount = session.participant_count?.[0]?.count || 0;
          
          const now = new Date();
          const start = new Date(session.scheduled_start);
          const end = new Date(session.scheduled_end);
          const isInProgress = (now >= start && now <= end) || session.status === 'live';

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

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(startDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{format(startDate, "h:mm a")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{participantCount} registered</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isJoinable && session.zoom_join_url ? (
                    <Button
                      size="sm"
                      className={cn(
                        "gap-1",
                        isInProgress 
                          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={() => window.open(session.zoom_join_url, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isInProgress ? "Join Now - In Progress!" : "Join Session"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="gap-1" disabled>
                      <Clock className="h-3.5 w-3.5" />
                      {differenceInMinutes(new Date(session.scheduled_start), new Date()) > 0 
                        ? `Join in ${differenceInMinutes(new Date(session.scheduled_start), new Date())} min`
                        : "Session Starting Soon"}
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

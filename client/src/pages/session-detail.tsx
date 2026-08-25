/**
 * Session Detail Page
 * Detailed view of a single live session
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { format, differenceInMinutes, formatDistanceToNow } from "date-fns";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Video,
  Calendar,
  Clock,
  Users,
  ExternalLink,
  BookOpen,
  MapPin,
  Info,
  ArrowLeft,
  Edit,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { CourseworkSection } from "@/components/assignments/coursework-section";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface LiveSession {
  id: string;
  title: string;
  description: string;
  session_type: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  timezone: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  zoom_join_url: string;
  zoom_start_url: string;
  is_public: boolean;
  max_participants?: number;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    profile_image_url?: string;
  };
  course?: {
    id: string;
    title: string;
    thumbnail_url?: string;
    description?: string;
  };
  user_registered: boolean;
  user_registration: any;
  participants: any[];
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isInstructor, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const { data: session, isLoading } = useQuery<LiveSession>({
    queryKey: ['session', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/sessions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/sessions/${id}`);
      if (!response.ok) throw new Error('Failed to cancel session');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled successfully",
      });
      setLocation('/sessions');
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

  const getStatusBadge = () => {
    if (!session) return null;

    if (session.status === 'live') {
      return (
        <Badge className="bg-red-500 text-white animate-pulse border-0">
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

    const start = new Date(session.scheduled_start);
    const minutesUntil = differenceInMinutes(start, new Date());

    if (minutesUntil <= 15 && minutesUntil > 0) {
      return (
        <Badge className="bg-orange-500 text-white border-0">
          Starting in {minutesUntil} min
        </Badge>
      );
    }

    return <Badge variant="secondary">Scheduled</Badge>;
  };

  const canJoinSession = () => {
    if (!session) return false;
    if (session.status === 'live') return true;
    const start = new Date(session.scheduled_start);
    const minutesUntil = differenceInMinutes(start, new Date());
    return minutesUntil <= 15 && minutesUntil > -10;
  };

  const canManageSession = () => {
    if (!session || !user) return false;
    return isAdmin() || session.instructor.id === user.id;
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#610000] border-t-transparent" />
        </div>
      </StudentLayout>
    );
  }

  if (!session) {
    return (
      <StudentLayout>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Session not found</h2>
          <Link href="/sessions">
            <Button>Back to Sessions</Button>
          </Link>
        </div>
      </StudentLayout>
    );
  }

  const startDate = new Date(session.scheduled_start);
  const endDate = new Date(session.scheduled_end);
  const participantCount = session.participants?.length || 0;
  const isJoinable = canJoinSession();
  const minutesUntil = differenceInMinutes(startDate, new Date());
  
  const getSessionStatus = () => {
    const now = new Date();
    if (session.status === 'live' || (now >= startDate && now <= endDate)) {
      return 'In Progress';
    }
    if (minutesUntil <= 15 && minutesUntil > 0) {
      return 'Starting Soon';
    }
    return 'Scheduled';
  };

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back Button */}
        <Link href="/sessions">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <h1 className="text-4xl font-bold text-[#2c2015] font-sf-pro-display">
                  {session.title}
                </h1>
                {getStatusBadge()}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("border", getSessionTypeColor(session.session_type))}
                >
                  {session.session_type.replace('_', ' ')}
                </Badge>
                {session.is_public && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Public Session
                  </Badge>
                )}
              </div>
            </div>

            {canManageSession() && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the session and notify all registered participants. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Session</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Cancel Session
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {session.description && (
              <Card className="border-[#d4c5b0]/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About This Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#6b5d4f] whitespace-pre-wrap">{session.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Course Info */}
            {session.course && (
              <Card className="border-[#d4c5b0]/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Related Course
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/course/${session.course.id}`}>
                    <div className="flex items-center gap-4 p-4 bg-[#faf9f6] rounded-xl hover:bg-[#f5f3ed] transition-colors cursor-pointer">
                      {session.course.thumbnail_url && (
                        <img
                          src={session.course.thumbnail_url}
                          alt={session.course.title}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-[#2c2015]">
                          {session.course.title}
                        </h3>
                        {session.course.description && (
                          <p className="text-sm text-[#6b5d4f] line-clamp-2 mt-1">
                            {session.course.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Participants (for instructors/admins) */}
            {canManageSession() && (
              <Card className="border-[#d4c5b0]/30">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Registered Participants
                    </div>
                    <Badge variant="secondary">{participantCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {participantCount === 0 ? (
                    <p className="text-sm text-[#6b5d4f] text-center py-8">
                      No participants registered yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {session.participants.map((participant: any) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 p-3 bg-[#faf9f6] rounded-lg"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.user?.profile_image_url} />
                            <AvatarFallback className="bg-[#610000] text-white">
                              {participant.user?.first_name?.[0]}
                              {participant.user?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-[#2c2015]">
                              {participant.user?.first_name} {participant.user?.last_name}
                            </p>
                            <p className="text-xs text-[#6b5d4f]">
                              Registered {formatDistanceToNow(new Date(participant.registered_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {participant.registration_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Assignments & Quizzes for this session */}
            <Card className="border-[#d4c5b0]/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Assignments &amp; Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CourseworkSection anchor={{ type: "session", id: id! }} canManage={canManageSession()} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="border-[#d4c5b0]/30 bg-gradient-to-br from-[#faf9f6] to-white sticky top-24">
              <CardContent className="p-6 space-y-6">
                {/* Instructor */}
                <div>
                  <p className="text-sm text-[#6b5d4f] mb-3">Instructor</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.instructor.profile_image_url} />
                      <AvatarFallback className="bg-[#610000] text-white">
                        {session.instructor.first_name[0]}
                        {session.instructor.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-[#2c2015]">
                        {session.instructor.first_name} {session.instructor.last_name}
                      </p>
                      <p className="text-xs text-[#6b5d4f]">{session.instructor.email}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Session Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-[#8b6f47] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2c2015]">
                        {format(startDate, "EEEE, MMMM d, yyyy")}
                      </p>
                      <p className="text-xs text-[#6b5d4f]">
                        {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-[#8b6f47] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2c2015]">
                        {session.duration_minutes} minutes
                      </p>
                      <p className="text-xs text-[#6b5d4f]">Duration</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#8b6f47] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2c2015]">Online via Zoom</p>
                      <p className="text-xs text-[#6b5d4f]">{session.timezone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-[#8b6f47] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#2c2015]">
                        {participantCount} registered
                        {session.max_participants && ` / ${session.max_participants}`}
                      </p>
                      <p className="text-xs text-[#6b5d4f]">Participants</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isJoinable && session.zoom_join_url ? (
                    <Button
                      className="w-full gap-2 bg-gradient-to-br from-[#610000] to-[#8b0000] text-white"
                      size="lg"
                      onClick={() => window.open(session.zoom_join_url, '_blank')}
                    >
                      <ExternalLink className="h-5 w-5" />
                      {getSessionStatus() === 'In Progress' ? 'Join Now - In Progress!' : 'Join Session'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      size="lg"
                      disabled
                    >
                      <Clock className="h-5 w-5" />
                      {minutesUntil > 0 
                        ? `Join in ${minutesUntil} minutes`
                        : "Session Starting Soon"}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setLocation('/sessions')}
                  >
                    <Video className="h-5 w-5" />
                    View All Sessions
                  </Button>
                </div>

                {!isJoinable && minutesUntil > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Session starts soon!</strong> You can join 15 minutes before the session starts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}

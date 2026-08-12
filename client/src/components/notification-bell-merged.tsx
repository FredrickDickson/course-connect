import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck } from "lucide-react";

interface CombinedNotification {
  id: string;
  source: "system" | "community";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  actionUrl?: string;
}

export default function NotificationBellMerged() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    notifications: systemNotifications,
    unreadCount: systemUnreadCount,
    markAsRead: markSystemAsRead,
    markAllAsRead: markAllSystemAsRead,
  } = useNotifications();

  const { data: communityNotifications = [] } = useQuery({
    queryKey: ["community-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("community_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const markCommunityAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("community_notifications")
        .update({ read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-notifications", user?.id] });
    },
  });

  const markAllCommunityAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("community_notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-notifications", user?.id] });
    },
  });

  const communityUnreadCount = communityNotifications.filter((n: any) => !n.read).length;
  const unreadCount = systemUnreadCount + communityUnreadCount;

  const combined: CombinedNotification[] = [
    ...systemNotifications.map((n) => ({
      id: n.id,
      source: "system" as const,
      title: n.title,
      message: n.message,
      read: n.read,
      created_at: n.created_at,
      actionUrl: n.action_url,
    })),
    ...communityNotifications.map((n: any) => ({
      id: n.id,
      source: "community" as const,
      title: n.title,
      message: n.body,
      read: n.read,
      created_at: n.created_at,
      actionUrl: n.link,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleNotificationClick = (notification: CombinedNotification) => {
    if (!notification.read) {
      if (notification.source === "system") {
        markSystemAsRead(notification.id);
      } else {
        markCommunityAsRead.mutate(notification.id);
      }
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllSystemAsRead();
    markAllCommunityAsRead.mutate();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[#4a3828] hover:text-[#610000] hover:bg-[#faf9f6]"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#610000] text-white text-[10px] rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {combined.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            No notifications yet
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {combined.map((notification) => (
              <DropdownMenuItem
                key={`${notification.source}-${notification.id}`}
                className="flex flex-col items-start p-3 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  {!notification.read && (
                    <div className="h-2 w-2 mt-2 rounded-full bg-[#610000] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/community/notifications"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

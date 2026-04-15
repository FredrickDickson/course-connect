import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, ThumbsUp, Check, CheckCheck, Bell, X } from "lucide-react";
import EmptyState from "@/components/empty-state";
import SkeletonLoader from "@/components/skeleton-loader";
import { useToast } from "@/hooks/use-toast";

export default function CommunityNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['community-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('community_notifications')
        .select(`
          *,
          actor:profiles(id, full_name, avatar_url),
          post:forum_posts(id, title, slug),
          reply:forum_replies(id, body, post_id)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('community_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('community_notifications')
        .update({ read: true })
        .eq('user_id', user!.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notifications'] });
      toast({ title: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Failed to mark notifications as read", variant: "destructive" });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('community_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-notifications'] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="h-4 w-4" />;
      case 'like':
        return <ThumbsUp className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationText = (notification: any) => {
    const actorName = notification.actor?.full_name || 'Someone';
    switch (notification.type) {
      case 'reply':
        return `${actorName} replied to your post`;
      case 'like':
        return `${actorName} liked your post`;
      case 'mention':
        return `${actorName} mentioned you`;
      default:
        return `${actorName} interacted with your post`;
    }
  };

  const getNotificationLink = (notification: any) => {
    if (notification.post) {
      return `/community/posts/${notification.post.slug}`;
    }
    return '#';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/community">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Community
                </Button>
              </Link>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
            )}
          </div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-xl text-primary-foreground/80 mt-2">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
      </div>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <SkeletonLoader count={5} type="card" />
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">Failed to load notifications. Please try again later.</p>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Notifications"
              description="You're all caught up! We'll notify you when there's activity on your posts."
              actionLabel="Browse Community"
              actionHref="/community"
            />
          ) : (
            <div className="space-y-4">
              {notifications.map((notification: any) => (
                <Card 
                  key={notification.id} 
                  className={`transition-all ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${!notification.read ? 'bg-primary/10' : 'bg-muted'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.actor?.avatar_url} />
                        <AvatarFallback>
                          {notification.actor?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">{getNotificationText(notification)}</span>
                              {!notification.read && (
                                <Badge variant="default" className="ml-2 text-xs">New</Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {notification.post && (
                          <Link 
                            href={getNotificationLink(notification)}
                            className="block mt-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => !notification.read && markAsReadMutation.mutate(notification.id)}
                          >
                            {notification.post.title}
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

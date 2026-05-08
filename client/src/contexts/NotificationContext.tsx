import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  type: 'academic' | 'social' | 'administrative' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  expires_at?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url?: string;
  action_text?: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_academic: boolean;
  email_social: boolean;
  email_administrative: boolean;
  email_system: boolean;
  in_app_academic: boolean;
  in_app_social: boolean;
  in_app_administrative: boolean;
  in_app_system: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

interface NotificationContextType {
  notifications: Notification[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => Promise<void>;
  createBulkNotifications: (notifications: Omit<Notification, 'id' | 'created_at' | 'read'>[]) => Promise<void>;
  getNotificationStats: () => {
    total: number;
    unread: number;
    byType: {
      academic: number;
      social: number;
      administrative: number;
      system: number;
    };
    byPriority: {
      urgent: number;
      high: number;
      normal: number;
      low: number;
    };
  };
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as unknown as Notification[]) || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences(data as unknown as NotificationPreferences);
      } else {
        // Create default preferences
        const defaultPrefs = {
          user_id: user.id,
          email_academic: true,
          email_social: true,
          email_administrative: true,
          email_system: true,
          in_app_academic: true,
          in_app_social: true,
          in_app_administrative: true,
          in_app_system: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00:00',
          quiet_hours_end: '08:00:00',
          timezone: 'UTC'
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences' as any)
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs as unknown as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications' as any)
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications' as any)
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !preferences) return;

      const { error } = await supabase
        .from('notification_preferences' as any)
        .update(newPrefs)
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPrefs } : null);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [preferences]);

  // Create notification
  const createNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check user preferences for this notification type
      if (preferences) {
        const prefKey = `in_app_${notification.type}` as keyof NotificationPreferences;
        const enabled = preferences[prefKey] as boolean;
        
        if (!enabled) return; // User has disabled this notification type
      }

      const { data, error } = await supabase
        .from('notifications' as any)
        .insert({
          ...notification,
          user_id: user.id,
          created_at: new Date().toISOString(),
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setNotifications(prev => [data as unknown as Notification, ...prev]);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [preferences]);

  // Batch create notifications
  const createBulkNotifications = useCallback(async (notifications: Omit<Notification, 'id' | 'created_at' | 'read'>[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Filter notifications based on user preferences
      const filteredNotifications = notifications.filter(notification => {
        if (!preferences) return true;
        const prefKey = `in_app_${notification.type}` as keyof NotificationPreferences;
        return preferences[prefKey] as boolean;
      });

      if (filteredNotifications.length === 0) return;

      const { data, error } = await supabase
        .from('notifications' as any)
        .insert(
          filteredNotifications.map(notification => ({
            ...notification,
            user_id: user.id,
            created_at: new Date().toISOString(),
            read: false,
          }))
        )
        .select();

      if (error) throw error;

      // Update local state
      setNotifications(prev => [...(data as unknown as Notification[]), ...prev]);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
    }
  }, [preferences]);

  // Get notification statistics
  const getNotificationStats = useCallback(() => {
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {
        academic: notifications.filter(n => n.type === 'academic').length,
        social: notifications.filter(n => n.type === 'social').length,
        administrative: notifications.filter(n => n.type === 'administrative').length,
        system: notifications.filter(n => n.type === 'system').length,
      },
      byPriority: {
        urgent: notifications.filter(n => n.priority === 'urgent').length,
        high: notifications.filter(n => n.priority === 'high').length,
        normal: notifications.filter(n => n.priority === 'normal').length,
        low: notifications.filter(n => n.priority === 'low').length,
      },
    };

    return stats;
  }, [notifications]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotifications(prev => [payload.new as Notification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev => 
                prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev => 
                prev.filter(n => n.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        preferences,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        updatePreferences,
        createNotification,
        createBulkNotifications,
        getNotificationStats,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

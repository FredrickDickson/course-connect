/**
 * Admin Notifications Bell
 * Real-time notification dropdown for admin dashboard
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  UserPlus,
  CreditCard,
  AlertTriangle,
  FileText,
  Users,
  AlertCircle,
} from "lucide-react";

interface Notification {
  id: string;
  icon: React.ElementType;
  message: string;
  time: string;
  type: "info" | "payment" | "warning" | "capacity";
}

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);

  // Fetch recent enrollments (last 7 days)
  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ["admin-notifications-enrollments"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("id, full_name, payment_status, ticket_price, created_at, course:courses(title)")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // poll every 30s
  });

  // Fetch courses near capacity
  const { data: courses = [] } = useQuery({
    queryKey: ["admin-notifications-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, total_capacity, enrollment_count, is_published")
        .eq("is_published", true);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Fetch pending bank transfers older than 3 days
  const { data: stalePending = [] } = useQuery({
    queryKey: ["admin-notifications-stale"],
    queryFn: async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data, error } = await (supabase as any)
        .from("course_enrollments")
        .select("id, full_name, created_at")
        .eq("payment_status", "pending_bank")
        .lte("created_at", threeDaysAgo.toISOString())
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000,
  });

  const notifications: Notification[] = useMemo(() => {
    const notifs: Notification[] = [];

    // New enrollments
    recentEnrollments.forEach((e: any) => {
      if (e.payment_status === "confirmed") {
        notifs.push({
          id: `payment-${e.id}`,
          icon: CreditCard,
          message: `Payment received: ${e.full_name} — GHS ${Number(e.ticket_price).toLocaleString()}`,
          time: e.created_at,
          type: "payment",
        });
      } else {
        notifs.push({
          id: `enroll-${e.id}`,
          icon: UserPlus,
          message: `New enrollment: ${e.full_name} — ${e.course?.title || "Course"}`,
          time: e.created_at,
          type: "info",
        });
      }
    });

    // Stale pending bank transfers
    stalePending.forEach((e: any) => {
      notifs.push({
        id: `stale-${e.id}`,
        icon: AlertTriangle,
        message: `Bank transfer pending 3+ days: ${e.full_name}`,
        time: e.created_at,
        type: "warning",
      });
    });

    // Courses near capacity
    courses.forEach((c: any) => {
      if (c.total_capacity && c.total_capacity > 0) {
        const pct = ((c.enrollment_count || 0) / c.total_capacity) * 100;
        if (pct >= 100) {
          notifs.push({
            id: `full-${c.id}`,
            icon: AlertCircle,
            message: `${c.title} is now sold out`,
            time: new Date().toISOString(),
            type: "capacity",
          });
        } else if (pct >= 90) {
          notifs.push({
            id: `cap-${c.id}`,
            icon: Users,
            message: `${c.title} is ${Math.round(pct)}% full (${c.enrollment_count}/${c.total_capacity})`,
            time: new Date().toISOString(),
            type: "capacity",
          });
        }
      }
    });

    // Sort by time descending
    notifs.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    return notifs.slice(0, 20);
  }, [recentEnrollments, stalePending, courses]);

  const unreadCount = notifications.length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const typeColors: Record<string, string> = {
    info: "text-blue-600",
    payment: "text-green-600",
    warning: "text-amber-600",
    capacity: "text-red-600",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px] bg-red-500 text-white border-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <p className="text-xs text-muted-foreground">
            Last 7 days of activity
          </p>
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No recent notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 hover:bg-muted/30"
                  >
                    <Icon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${typeColors[n.type]}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {timeAgo(n.time)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

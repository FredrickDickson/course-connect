import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  UserCheck,
  RefreshCw,
  Shield,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertCircle,
  Zap,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  tab?: string; // For tabs within admin dashboard
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function AdminSidebar({
  collapsed: controlledCollapsed,
  onCollapseChange,
}: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin-sidebar-collapsed") === "true";
    }
    return false;
  });

  const collapsed = controlledCollapsed ?? internalCollapsed;

  // Fetch pending applications count for badge
  const { data: pendingCount } = useQuery({
    queryKey: ["admin_pending_count"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { count } = await supabase
        .from("instructor_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  const handleCollapseToggle = () => {
    const newState = !collapsed;
    setInternalCollapsed(newState);
    onCollapseChange?.(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin-sidebar-collapsed", String(newState));
    }
  };

  // Navigation structure - using tabs within main dashboard
  const navigationSections: NavSection[] = [
    {
      items: [
        { name: "Overview", href: "/admin?tab=overview", icon: LayoutDashboard, tab: "overview" },
        { name: "Enrollments", href: "/admin?tab=enrollments", icon: UserCheck, tab: "enrollments" },
        { name: "Courses", href: "/admin?tab=courses", icon: BookOpen, tab: "courses" },
        { name: "Create Course", href: "/admin?tab=templates", icon: FileText, tab: "templates" },
      ],
    },
    {
      title: "Management",
      items: [
        { name: "Members", href: "/admin?tab=members", icon: Users, tab: "members" },
        { name: "Renewals", href: "/admin?tab=renewals", icon: RefreshCw, tab: "renewals" },
        { name: "Renewal Automation", href: "/admin/renewals", icon: Mail },
        { 
          name: "Applications", 
          href: "/admin?tab=applications", 
          icon: AlertCircle, 
          badge: pendingCount || undefined,
          tab: "applications"
        },
        { name: "Users", href: "/admin?tab=users", icon: Shield, tab: "users" },
      ],
    },
    {
      title: "Tools",
      items: [
        { name: "Expedited Reviews", href: "/admin/expedited", icon: Zap },
      ],
    },
    {
      title: "Support",
      items: [
        { name: "Help Center", href: "/help-center", icon: HelpCircle },
        { name: "Settings", href: "/notification-settings", icon: Settings },
      ],
    },
  ];

  const isActivePath = (path: string, tab?: string) => {
    // For admin dashboard tabs
    if (location === "/admin" || location === "/admin-dashboard") {
      // Get current tab from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const currentTab = urlParams.get("tab") || "overview";
      
      if (tab) {
        return currentTab === tab;
      }
    }
    
    // Exact match for other pages
    if (location === path) {
      return true;
    }
    
    // Check if the current location starts with the path (for sub-routes)
    if (location.startsWith(path + "/")) {
      return true;
    }
    
    return false;
  };

  if (!isAuthenticated) return null;

  return (
    <aside
      className={cn(
        "sticky top-0 self-start h-screen flex flex-col bg-[#faf9f6] border-r border-[#d4c5b0]/30 transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-[280px]"
      )}
    >
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-6 border-b border-[#d4c5b0]/30 flex-shrink-0">
        {!collapsed ? (
          <Link href="/admin" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <img 
              src="/images/logo.jpeg" 
              alt="CIMA Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-[#610000] font-sf-pro-display">Admin Portal</h1>
              <p className="text-[10px] text-[#8b6f47] font-sf-pro-text uppercase tracking-[0.08em] font-semibold">
                Management Dashboard
              </p>
            </div>
          </Link>
        ) : (
          <Link href="/admin" className="flex items-center justify-center w-full">
            <img 
              src="/images/logo.jpeg" 
              alt="CIMA Logo" 
              className="w-10 h-10 object-contain"
            />
          </Link>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={handleCollapseToggle}
        className="absolute -right-3 top-24 z-50 bg-white border-2 border-[#d4c5b0]/30 rounded-full p-1.5 shadow-md hover:shadow-lg hover:border-[#8b6f47]/50 transition-all duration-300"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-[#610000]" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-[#610000]" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-sidebar-border scrollbar-track-transparent">
        {navigationSections.map((section, sectionIdx) => (
          <div key={sectionIdx} className={cn("mb-6", sectionIdx > 0 && "pt-6 border-t border-[#d4c5b0]/30")}>
            {section.title && !collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-[#8b6f47] uppercase tracking-wider">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = isActivePath(item.href, item.tab);
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle navigation for tab-based links
                      if (item.tab && (location === "/admin" || location === "/admin-dashboard")) {
                        const url = new URL(window.location.href);
                        url.searchParams.set("tab", item.tab);
                        window.history.pushState({}, "", url);
                        // Force a re-render by triggering a custom event
                        window.dispatchEvent(new Event("tabchange"));
                      } else {
                        // For non-tab links, use wouter navigation
                        window.location.href = item.href;
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all duration-300 group relative",
                      collapsed && "justify-center",
                      isActive
                        ? "bg-[#610000] text-white shadow-md"
                        : "text-[#4a3828] hover:bg-[#f5f3ed] hover:text-[#610000]"
                    )}
                  >
                      <Icon
                        className={cn(
                          "w-5 h-5 flex-shrink-0 transition-colors",
                          isActive ? "text-white" : "text-[#8b6f47] group-hover:text-[#610000]"
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left font-medium text-[15px] font-sf-pro-text">
                            {item.name}
                          </span>
                          {item.badge && (
                            <Badge
                              className={cn(
                                "h-5 px-2 text-xs font-semibold",
                                isActive
                                  ? "bg-white text-[#610000]"
                                  : "bg-[#610000] text-white"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#610000] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t border-[#d4c5b0]/30 p-4 flex-shrink-0">
        {!collapsed ? (
          <div className="space-y-3">
            <Link href="/profile">
              <div className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#f5f3ed] transition-all duration-300 cursor-pointer group">
                <Avatar className="h-10 w-10 border-2 border-[#d4c5b0]">
                  <AvatarImage
                    src={user?.profileImageUrl || undefined}
                    alt={`${user?.firstName} ${user?.lastName}`}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-[#610000] to-[#8b0000] text-white font-semibold">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2c2015] truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-[#8b6f47]">Administrator</p>
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[#4a3828] hover:text-[#610000] hover:bg-[#f5f3ed]"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <Link href="/profile">
              <Avatar className="h-10 w-10 border-2 border-[#d4c5b0] cursor-pointer hover:border-[#8b6f47] transition-all">
                <AvatarImage
                  src={user?.profileImageUrl || undefined}
                  alt={`${user?.firstName} ${user?.lastName}`}
                />
                <AvatarFallback className="bg-gradient-to-br from-[#610000] to-[#8b0000] text-white font-semibold text-sm">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="w-full p-2 text-[#4a3828] hover:text-[#610000] hover:bg-[#f5f3ed]"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

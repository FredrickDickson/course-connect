import { useState } from "react";
import { Home, BookOpen, Users, HelpCircle, User, Menu, X, GraduationCap, Search, Target, Award, FileText, Bookmark, Settings, LogOut, Video } from "lucide-react";
import { Link } from "wouter";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function MobileBottomNav() {
  const [location] = useLocation();
  const search = useSearch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();

  const quickNavItems = [
    { href: "/home", icon: Home, label: "Home" },
    { href: "/dashboard", icon: BookOpen, label: "Learning" },
    { href: "/community", icon: Users, label: "Community" },
    { href: "/help-center", icon: HelpCircle, label: "Support" },
  ];

  // Full navigation structure from sidebar - conditionally include Instructor link
  const navigationSections: NavSection[] = [
    {
      items: [
        { name: "Home", href: "/home", icon: Home },
        { name: "My Learning", href: "/dashboard", icon: BookOpen },
        { name: "Discover Courses", href: "/course-catalog", icon: Search },
        { name: "Live Sessions", href: "/sessions", icon: Video },
        ...(user?.role === "instructor" 
          ? [{ name: "Instructor", href: "/instructor", icon: GraduationCap }] 
          : []),
      ],
    },
    {
      title: "Learning",
      items: [
        // { name: "Programs", href: "/programs", icon: GraduationCap },
        { name: "Qualification Pathway", href: "/qualification-pathway", icon: Target },
        { name: "Certificates", href: "/profile?tab=certificates", icon: Award },
        { name: "Resources", href: "/resources", icon: BookOpen },
      ],
    },
    {
      title: "Community",
      items: [
        { name: "Community Hub", href: "/community", icon: Users },
        { name: "My Posts", href: "/community/my-posts", icon: FileText },
        { name: "My Boards", href: "/community/my-boards", icon: Bookmark },
      ],
    },
    {
      title: "Support",
      items: [
        { name: "Help Center", href: "/help-center", icon: HelpCircle },
        { name: "Academic Advising", href: "/academic-advising", icon: User },
        { name: "Technical Support", href: "/technical-support", icon: Settings },
      ],
    },
    {
      items: [
        { name: "Profile", href: "/profile", icon: User },
      ],
    },
  ];

  const isActivePath = (path: string) => {
    const [basePath, queryString] = path.split("?");

    // The Profile page uses a `?tab=` query param to switch between its
    // Information/Courses/Certificates tabs, so pathname alone can't tell
    // "Profile" and "Certificates" apart - compare the tab too.
    if (basePath === "/profile") {
      if (location !== "/profile") return false;
      const currentTab = new URLSearchParams(search).get("tab");
      const itemTab = new URLSearchParams(queryString || "").get("tab");
      return itemTab ? currentTab === itemTab : currentTab !== "certificates";
    }
    if (path === "/dashboard") {
      return location === "/dashboard";
    }
    if (path === "/community") {
      return location === "/community";
    }
    if (location === path) {
      return true;
    }
    if (!path.startsWith("/community") && location.startsWith(path + "/")) {
      return true;
    }
    return false;
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-1">
          {quickNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || 
              (item.href !== "/home" && location.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-[60px] ${
                  isActive ? "text-[#610000]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors min-w-[60px] text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px]">Menu</span>
          </button>
        </div>
      </nav>

      {/* Full Menu Modal */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="p-6 pb-4 border-b border-[#d4c5b0]/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img 
                    src="/images/logo.jpeg" 
                    alt="CIMA Logo" 
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <SheetTitle className="text-lg font-bold text-[#610000] font-sf-pro-display">
                      CIMA Learn
                    </SheetTitle>
                    <p className="text-[10px] text-[#8b6f47] font-sf-pro-text uppercase tracking-[0.08em] font-semibold">
                      Professional ADR Education
                    </p>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4">
              {navigationSections.map((section, sectionIdx) => (
                <div key={sectionIdx} className={cn("mb-6", sectionIdx > 0 && "pt-6 border-t border-[#d4c5b0]/30")}>
                  {section.title && (
                    <p className="px-3 mb-3 text-xs font-semibold text-[#8b6f47] uppercase tracking-wider">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = isActivePath(item.href);
                      const Icon = item.icon;

                      return (
                        <Link key={item.name} href={item.href}>
                          <button
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-300",
                              isActive
                                ? "bg-[#610000] text-white shadow-md"
                                : "text-[#4a3828] hover:bg-[#f5f3ed] hover:text-[#610000]"
                            )}
                          >
                            <Icon
                              className={cn(
                                "w-5 h-5 flex-shrink-0",
                                isActive ? "text-white" : "text-[#8b6f47]"
                              )}
                            />
                            <span className="flex-1 text-left font-medium text-[15px] font-sf-pro-text">
                              {item.name}
                            </span>
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* User Section */}
            <div className="border-t border-[#d4c5b0]/30 p-4 flex-shrink-0">
              <div className="space-y-3">
                <Link href="/profile">
                  <div 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-[12px] hover:bg-[#f5f3ed] transition-all duration-300 cursor-pointer"
                  >
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
                      <p className="text-xs text-[#8b6f47] truncate">{user?.email}</p>
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
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

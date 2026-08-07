import { useState } from "react";
import StudentSidebar from "@/components/student-sidebar";
import TopNavbar from "@/components/top-navbar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, User, BookOpen, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";

interface StudentLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

export default function StudentLayout({
  children,
  fullWidth = false,
  noPadding = false,
}: StudentLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f3ed]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 self-start h-screen">
        <StudentSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-[#faf9f6]">
          <StudentSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar - Desktop Only */}
        <div className="hidden lg:block">
          <TopNavbar />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-white sticky top-0 z-40">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img 
              src="/images/logo.jpeg" 
              alt="CIMA Logo" 
              className="w-10 h-10 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#610000] leading-none">CIMA Learn</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Professional ADR Education</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link href="/community/notifications">
              <Button variant="ghost" size="icon" className="relative h-9 w-9">
                <Bell className="w-5 h-5 text-[#610000]" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </Button>
            </Link>

            {/* Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 overflow-hidden">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#610000] text-white flex items-center justify-center text-sm font-semibold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#d4c5b0]/30">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-[#2c2015]">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-[#8b6f47]">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2 text-[#610000]" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/courses" className="cursor-pointer">
                    <BookOpen className="w-4 h-4 mr-2 text-[#610000]" />
                    <span>My Learning</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notification-settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2 text-[#610000]" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
                <DropdownMenuItem
                  onClick={async () => {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Page Content */}
        <main
          className={cn(
            "flex-1 bg-white pb-20 lg:pb-0", // Added pb-20 for mobile bottom nav space
            !noPadding && "p-6 lg:p-8"
          )}
        >
          <div className={cn(!fullWidth && "max-w-[1600px] mx-auto")}>{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}

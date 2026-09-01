import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Bell, ChevronDown, User, Settings, LogOut, Menu, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import AdminNotifications from "@/components/admin-notifications";

interface AdminTopNavProps {
  onMobileMenuToggle?: () => void;
}

export default function AdminTopNav({ onMobileMenuToggle }: AdminTopNavProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setLocation(q ? `/admin?tab=users&search=${encodeURIComponent(q)}` : "/admin?tab=users");
  };

  const handleSignOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      {/* Desktop Top Nav */}
      <nav className="hidden lg:block sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#d4c5b0]/30 shadow-sm">
        <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-[1920px] mx-auto">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-xl">
            <div className="relative flex items-center">
              <Input
                type="text"
                placeholder="Search users, courses, applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-12 pl-4 py-5 text-sm border-[#d4c5b0]/40 focus:border-[#5A2633] focus:ring-[#5A2633] rounded-full bg-[#faf9f6]"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 bg-[#5A2633] hover:bg-[#5A2633] text-white rounded-full h-10 w-10 shadow-md"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Admin Badge */}
            <Badge variant="outline" className="text-xs px-3 py-1 border-[#5A2633] text-[#5A2633]">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </Badge>

            {/* Quick Actions */}
            <Link href="/admin?tab=overview">
              <Button
                variant="ghost"
                className={cn(
                  "text-sm font-medium text-[#4a3828] hover:text-[#5A2633] hover:bg-transparent",
                  location === "/admin" && "text-[#5A2633] font-semibold"
                )}
              >
                Dashboard
              </Button>
            </Link>

            {/* Notifications */}
            <AdminNotifications />

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-[#faf9f6] px-2 py-1 h-auto rounded-full"
                >
                  <Avatar className="h-9 w-9 border-2 border-[#d4c5b0]">
                    <AvatarImage
                      src={user?.profileImageUrl || undefined}
                      alt={`${user?.firstName} ${user?.lastName}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#5A2633] to-[#5A2633] text-white font-semibold text-sm">
                      {user?.firstName?.[0]}
                      {user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start mr-1">
                    <span className="text-sm font-semibold text-[#2c2015] leading-tight">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-xs text-[#8b6f47]">Administrator</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#8b6f47]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-[#d4c5b0]/30">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold text-[#2c2015]">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-[#8b6f47]">{user?.email}</p>
                    <Badge variant="secondary" className="w-fit text-xs mt-1">Administrator</Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2 text-[#5A2633]" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="cursor-pointer">
                    <Shield className="w-4 h-4 mr-2 text-[#5A2633]" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notification-settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2 text-[#5A2633]" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-[#5A2633] focus:text-[#5A2633] focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-white sticky top-0 z-50">
        {/* Menu Button */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMobileMenuToggle}
          className="h-9 w-9"
        >
          <Menu className="w-5 h-5 text-[#5A2633]" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img 
            src="/uploads/logo.png" 
            alt="CIMA Logo" 
            className="w-10 h-10 object-contain"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#5A2633] leading-none">Admin Portal</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Management</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <AdminNotifications />

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full p-0 overflow-hidden">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.firstName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#5A2633] text-white flex items-center justify-center text-sm font-semibold">
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
                  <Badge variant="secondary" className="w-fit text-xs mt-1">Administrator</Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="w-4 h-4 mr-2 text-[#5A2633]" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/notification-settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2 text-[#5A2633]" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#d4c5b0]/30" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-[#5A2633] focus:text-[#5A2633] focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}

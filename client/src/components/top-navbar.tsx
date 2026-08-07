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
import { Search, ShoppingCart, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  onSearch?: (query: string) => void;
}

export default function TopNavbar({ onSearch }: TopNavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location] = useLocation();
  const { user } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      // Default: navigate to course search with query
      window.location.href = `/course-search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleSignOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#d4c5b0]/30 shadow-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-[1920px] mx-auto">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="What do you want to learn?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-5 text-sm border-[#d4c5b0]/40 focus:border-[#610000] focus:ring-[#610000] rounded-full bg-[#faf9f6]"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-1 bg-[#610000] hover:bg-[#7d0000] text-white rounded-full h-10 w-10 shadow-md"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* My Learning Link */}
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className={cn(
                "text-sm font-medium text-[#4a3828] hover:text-[#610000] hover:bg-transparent",
                location === "/dashboard" && "text-[#610000] font-semibold"
              )}
            >
              My learning
            </Button>
          </Link>

          {/* Shopping Cart */}
          <Link href="/courses">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[#4a3828] hover:text-[#610000] hover:bg-[#faf9f6]"
            >
              <ShoppingCart className="w-5 h-5" />
            </Button>
          </Link>

          {/* Notifications */}
          <Link href="/community/notifications">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[#4a3828] hover:text-[#610000] hover:bg-[#faf9f6]"
            >
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[#610000] text-white text-[10px] rounded-full">
                3
              </Badge>
            </Button>
          </Link>

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
                  <AvatarFallback className="bg-gradient-to-br from-[#610000] to-[#8b0000] text-white font-semibold text-sm">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start mr-1">
                  <span className="text-sm font-semibold text-[#2c2015] leading-tight">
                    {user?.firstName} {user?.lastName}
                  </span>
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
                <Link href="/dashboard" className="cursor-pointer">
                  <User className="w-4 h-4 mr-2 text-[#610000]" />
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
                onClick={handleSignOut}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

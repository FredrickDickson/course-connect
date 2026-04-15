import { Home, MessageSquare, Users, BookOpen, Search } from "lucide-react";
import { Link } from "wouter";
import { useLocation } from "wouter";

export default function MobileBottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/community", icon: MessageSquare, label: "Community" },
    { href: "/courses", icon: BookOpen, label: "Courses" },
    { href: "/community/my-boards", icon: Users, label: "My Boards" },
    { href: "/community", icon: Search, label: "Search" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href === "/community" && location.startsWith("/community"));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

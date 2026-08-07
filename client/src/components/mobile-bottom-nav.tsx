import { Home, BookOpen, Users, HelpCircle, User, Menu } from "lucide-react";
import { Link } from "wouter";
import { useLocation } from "wouter";

export default function MobileBottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/courses", icon: BookOpen, label: "Learning" },
    { href: "/community", icon: Users, label: "Community" },
    { href: "/help-center", icon: HelpCircle, label: "Support" },
    { href: "/profile", icon: User, label: "Account" },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 safe-area-pb">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
            (item.href !== "/dashboard" && location.startsWith(item.href));
          
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
      </div>
    </nav>
  );
}

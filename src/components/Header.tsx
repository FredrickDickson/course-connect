import { Link } from "react-router-dom";
import { GraduationCap, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-accent" />
          <span className="font-display text-xl font-bold text-foreground">Lumina</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Courses
          </Link>
          <Link to="/my-courses">
            <Button variant="outline" size="sm" className="gap-2">
              <BookMarked className="w-4 h-4" />
              My Courses
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}

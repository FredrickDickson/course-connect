import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  currentPage: string;
}

export default function BreadcrumbNav({ items, currentPage }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto">
      <Link href="/community" className="hover:text-primary whitespace-nowrap flex items-center gap-1">
        <Home className="h-4 w-4" />
        Community
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
          {item.href ? (
            <Link href={item.href} className="hover:text-primary whitespace-nowrap">
              {item.label}
            </Link>
          ) : (
            <span className="whitespace-nowrap">{item.label}</span>
          )}
        </div>
      ))}
      <ChevronRight className="h-4 w-4 flex-shrink-0" />
      <span className="text-foreground font-medium truncate">{currentPage}</span>
    </nav>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MessageSquare, Bookmark } from "lucide-react";

interface QuickFiltersProps {
  activeFilter?: 'all' | 'unread' | 'participated' | 'bookmarked';
  onFilterChange: (filter: 'all' | 'unread' | 'participated' | 'bookmarked') => void;
  unreadCount?: number;
}

export default function QuickFilters({ activeFilter = 'all', onFilterChange, unreadCount = 0 }: QuickFiltersProps) {
  const filters = [
    { value: 'all' as const, label: 'All', icon: null },
    { value: 'unread' as const, label: 'Unread', icon: Eye, count: unreadCount },
    { value: 'participated' as const, label: 'Participated', icon: MessageSquare },
    { value: 'bookmarked' as const, label: 'Bookmarked', icon: Bookmark },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map((filter) => {
        const Icon = filter.icon;
        return (
          <Button
            key={filter.value}
            variant={activeFilter === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className="gap-2"
          >
            {Icon && <Icon className="h-4 w-4" />}
            {filter.label}
            {filter.count !== undefined && filter.count > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {filter.count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

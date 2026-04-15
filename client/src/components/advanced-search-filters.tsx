import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, X } from "lucide-react";

interface AdvancedSearchFiltersProps {
  categories: any[];
  onFilterChange: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  category?: string;
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'year';
  author?: string;
}

export default function AdvancedSearchFilters({ categories, onFilterChange }: AdvancedSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={hasActiveFilters ? "border-primary text-primary" : ""}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {hasActiveFilters && <span className="ml-1">•</span>}
      </Button>
    );
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Advanced Filters
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Category</Label>
            <Select
              value={filters.category || ""}
              onValueChange={(value) => handleFilterChange('category', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date Range</Label>
            <Select
              value={filters.dateRange || 'all'}
              onValueChange={(value) => handleFilterChange('dateRange', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Author</Label>
            <Input
              placeholder="Search by author..."
              value={filters.author || ""}
              onChange={(e) => handleFilterChange('author', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear Filters
          </Button>
          <Button onClick={() => setIsOpen(false)}>
            Apply Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

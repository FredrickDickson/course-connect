import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Clock, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "wouter";

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchAutocomplete({ value, onChange, placeholder = "Search discussions..." }: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', value],
    queryFn: async () => {
      if (!value || value.length < 2) return [];

      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          id,
          title,
          slug,
          author:profiles(id, full_name, avatar_url),
          board:forum_boards(id, name)
        `)
        .eq('status', 'active')
        .or(`title.ilike.%${value}%,body.ilike.%${value}%`)
        .order('last_activity_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      return data || [];
    },
    enabled: value.length >= 2,
  });

  // Get recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('recent-searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut to focus search (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        containerRef.current?.querySelector('input')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const totalItems = suggestions.length + recentSearches.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      if (selectedIndex < recentSearches.length) {
        onChange(recentSearches[selectedIndex]);
      } else {
        const suggestion = suggestions[selectedIndex - recentSearches.length];
        window.location.href = `/community/posts/${suggestion.slug}`;
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (suggestion: any) => {
    // Save to recent searches
    const updatedRecent = [suggestion.title, ...recentSearches.filter((s) => s !== suggestion.title)].slice(0, 5);
    localStorage.setItem('recent-searches', JSON.stringify(updatedRecent));
    setRecentSearches(updatedRecent);
    
    setIsOpen(false);
    window.location.href = `/community/posts/${suggestion.slug}`;
  };

  const handleRecentSearch = (term: string) => {
    onChange(term);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10"
        />
      </div>

      {isOpen && (value.length >= 2 || recentSearches.length > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-lg">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {recentSearches.length > 0 && value.length < 2 && (
              <div className="p-3 border-b">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Recent Searches
                </div>
                <div className="space-y-1">
                  {recentSearches.map((term, index) => (
                    <button
                      key={term}
                      onClick={() => handleRecentSearch(term)}
                      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors ${
                        selectedIndex === index ? 'bg-accent' : ''
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2 max-h-80 overflow-y-auto">
                <div className="text-xs text-muted-foreground mb-2 px-1">
                  {value.length >= 2 ? 'Suggestions' : 'Popular Posts'}
                </div>
                {suggestions.map((suggestion: any, index) => (
                  <Link
                    key={suggestion.id}
                    href={`/community/posts/${suggestion.slug}`}
                    onClick={() => handleSelect(suggestion)}
                    className={`block p-3 rounded hover:bg-accent transition-colors ${
                      selectedIndex === recentSearches.length + index ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={suggestion.author?.avatar_url} />
                        <AvatarFallback>
                          {suggestion.author?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.board?.name}
                        </p>
                      </div>
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {value.length >= 2 && suggestions.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

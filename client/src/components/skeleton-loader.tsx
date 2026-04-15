import { Card, CardContent } from "@/components/ui/card";

interface SkeletonLoaderProps {
  count?: number;
  type?: 'card' | 'list' | 'avatar';
}

export default function SkeletonLoader({ count = 3, type = 'card' }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-8 w-8 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-12 w-12 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Eye, ThumbsUp, Calendar } from "lucide-react";

interface ContributionStatsProps {
  postsCount?: number;
  repliesCount?: number;
  helpfulCount?: number;
  viewCount?: number;
  joinDate?: string;
}

export default function ContributionStats({ 
  postsCount = 0, 
  repliesCount = 0, 
  helpfulCount = 0, 
  viewCount = 0,
  joinDate 
}: ContributionStatsProps) {
  const totalContributions = postsCount + repliesCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Contribution Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Posts</span>
              </div>
              <p className="text-2xl font-bold">{postsCount}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Replies</span>
              </div>
              <p className="text-2xl font-bold">{repliesCount}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Helpful</span>
              </div>
              <p className="text-2xl font-bold">{helpfulCount}</p>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Views</span>
              </div>
              <p className="text-2xl font-bold">{viewCount}</p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Contributions</span>
              <span className="font-semibold">{totalContributions}</span>
            </div>
            {joinDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Calendar className="h-4 w-4" />
                <span>Joined {new Date(joinDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

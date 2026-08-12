import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, BookOpen, Scale, FileSpreadsheet, Users, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDownloadableResources } from "@/hooks/useDownloadableResources";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Map icon names to lucide-react components
const iconMap: Record<string, any> = {
  Scale,
  BookOpen,
  Users,
  FileText,
  FileSpreadsheet,
};

export default function DownloadableResources() {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  
  // Fetch resources from database
  const { data: resources, isLoading, error } = useDownloadableResources();

  const handleDownload = async (resource: any) => {
    const resourceId = resource.id;
    setDownloadingId(resourceId);

    try {
      // Open download in new tab
      window.open(resource.download_url, '_blank');
      
      toast({
        title: "Download Started",
        description: `${resource.title} is being downloaded.`,
      });

      // Track download event (could be sent to analytics)
      console.log(`Resource downloaded: ${resource.title}`);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error downloading the resource. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "Arbitrator":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Mediator":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Both":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Rules":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      case "Guide":
        return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "Policy":
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
      case "Handbook":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#610000]" />
        <p className="text-muted-foreground">Loading resources...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load resources. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!resources || resources.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No resources available at this time. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  // Group resources by category
  const arbitratorResources = resources.filter(r => r.category === "Arbitrator" || r.category === "Both");
  const mediatorResources = resources.filter(r => r.category === "Mediator" || r.category === "Both");

  const renderResourceCard = (resource: any) => {
    const isDownloading = downloadingId === resource.id;
    const Icon = resource.icon ? iconMap[resource.icon] || FileText : FileText;

    return (
      <Card key={resource.id} className="hover:shadow-lg transition-all duration-300 flex flex-col h-full">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-[#610000]/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-[#610000]" />
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge variant="secondary" className={getTypeBadgeColor(resource.resource_type)}>
                {resource.resource_type}
              </Badge>
              <Badge variant="secondary" className={getCategoryBadgeColor(resource.category)}>
                {resource.category}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg leading-tight">{resource.title}</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 flex-grow flex flex-col">
          <p className="text-sm text-muted-foreground flex-grow">
            {resource.description}
          </p>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
            <span className="flex items-center">
              <FileText className="w-3 h-3 mr-1" />
              {resource.file_size}
            </span>
            <span className="flex items-center">
              <i className="fas fa-calendar-alt mr-1"></i>
              {new Date(resource.updated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full border-[#610000] text-[#610000] hover:bg-[#610000] hover:text-white transition-colors"
            onClick={() => handleDownload(resource)}
            disabled={isDownloading}
            data-testid={`download-${resource.id}`}
          >
            {isDownloading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-[#2c2015] font-sf-pro-display">
          Course Resources & Study Materials
        </h2>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Download official CIMA documents, rules, guides, and training materials for arbitrators and mediators.
        </p>
      </div>

      {/* Arbitrator Resources */}
      {arbitratorResources.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <Scale className="w-6 h-6 text-[#610000]" />
            <h3 className="text-2xl font-bold text-[#2c2015] font-sf-pro-display">
              Arbitrator Resources
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arbitratorResources.map(renderResourceCard)}
          </div>
        </section>
      )}

      {/* Mediator Resources */}
      {mediatorResources.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-[#610000]" />
            <h3 className="text-2xl font-bold text-[#2c2015] font-sf-pro-display">
              Mediator Resources
            </h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediatorResources.map(renderResourceCard)}
          </div>
        </section>
      )}

      {/* Info Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <i className="fas fa-info-circle text-blue-600 text-2xl"></i>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Official CIMA Resources</h4>
              <p className="text-sm text-blue-800">
                All resources are official documents from the Center for International Mediators and Arbitrators (CIMA). 
                These materials are updated regularly to reflect current standards and best practices in international arbitration and mediation.
              </p>
              <p className="text-sm text-blue-800">
                For additional resources or specific course materials, please contact your course instructor or visit the official CIMA website at{" "}
                <a href="https://thecima.org" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-950">
                  thecima.org
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

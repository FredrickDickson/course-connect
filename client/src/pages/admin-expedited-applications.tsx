import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter
} from "lucide-react";

interface Application {
  id: string;
  userId: string;
  targetLevel: "MEMBER" | "FELLOW";
  status: "pending" | "under_review" | "approved" | "rejected";
  experienceSummary: string;
  qualificationsSummary: string;
  submittedAt: string;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
  }>;
  assessments: Array<{
    id: string;
    assessmentType: string;
    submissionContent: string;
    completedAt: string;
  }>;
}

export default function AdminExpeditedApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComments, setReviewComments] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch applications from API
  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("sb-access-token");
      const url = filterStatus === "all"
        ? "/api/admin/expedited/applications"
        : `/api/admin/expedited/applications?status=${filterStatus}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
      console.error("Error fetching applications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => 
    filterStatus === "all" || app.status === filterStatus
  );

  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application);
  };

  const handleApprove = async () => {
    if (!selectedApplication) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("sb-access-token");
      const response = await fetch(`/api/admin/expedited/applications/${selectedApplication.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewComments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve application");
      }

      // Refresh applications list
      await fetchApplications();
      setShowReviewModal(false);
      setReviewComments("");
      setSelectedApplication(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve application");
      console.error("Error approving application:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApplication) return;

    setIsProcessing(true);
    try {
      const token = localStorage.getItem("sb-access-token");
      const response = await fetch(`/api/admin/expedited/applications/${selectedApplication.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewComments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject application");
      }

      // Refresh applications list
      await fetchApplications();
      setShowReviewModal(false);
      setReviewComments("");
      setSelectedApplication(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject application");
      console.error("Error rejecting application:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewModal = (action: "approve" | "reject") => {
    setActionType(action);
    setShowReviewModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "under_review":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "approved":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "under_review":
        return <Eye className="w-4 h-4" />;
      case "approved":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white py-12">
        <ScrollReveal direction="up" distance={40} duration={0.7}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/admin-dashboard">
              <Button variant="ghost" className="text-white/70 hover:text-white mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight mb-2">
              Expedited Applications
            </h1>
            <p className="text-lg text-white/70">
              Review and manage expedited membership and fellowship applications
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Applications List */}
              <div className="lg:col-span-2 space-y-4">
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search applications..."
                          className="flex-1 bg-transparent border-0 outline-none text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="bg-transparent border border-border rounded-md px-3 py-1.5 text-sm"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Applications List */}
                {isLoading ? (
                  <Card>
                    <CardContent className="p-12 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </CardContent>
                  </Card>
                ) : error ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-red-500 mb-4">{error}</p>
                      <Button onClick={fetchApplications} variant="outline">
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredApplications.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No applications found</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.map((application) => (
                      <Card
                        key={application.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedApplication?.id === application.id ? "border-primary" : ""
                        }`}
                        onClick={() => handleViewApplication(application)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-foreground">
                                  {application.targetLevel === "MEMBER" ? "Member (MCIMArb)" : "Fellow (FCIMArb)"}
                                </h3>
                                <Badge className={getStatusColor(application.status)}>
                                  <div className="flex items-center gap-1.5">
                                    {getStatusIcon(application.status)}
                                    <span className="capitalize">{application.status.replace("_", " ")}</span>
                                  </div>
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Submitted: {new Date(application.submittedAt).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {application.experienceSummary}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {application.documents.length} docs
                              </Badge>
                              {application.assessments.length > 0 && (
                                <Badge variant="outline">
                                  Assessment submitted
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Application Details */}
              <div className="lg:col-span-1">
                {selectedApplication ? (
                  <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Application Details</span>
                        <Badge className={getStatusColor(selectedApplication.status)}>
                          <div className="flex items-center gap-1.5">
                            {getStatusIcon(selectedApplication.status)}
                            <span className="capitalize">{selectedApplication.status.replace("_", " ")}</span>
                          </div>
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {selectedApplication.targetLevel === "MEMBER" ? "Member (MCIMArb)" : "Fellow (FCIMArb)"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Experience */}
                      <div>
                        <Label className="text-sm font-semibold">Experience</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedApplication.experienceSummary}
                        </p>
                      </div>

                      {/* Qualifications */}
                      <div>
                        <Label className="text-sm font-semibold">Qualifications</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedApplication.qualificationsSummary}
                        </p>
                      </div>

                      {/* Documents */}
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Documents</Label>
                        <div className="space-y-2">
                          {selectedApplication.documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{doc.fileName}</span>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assessment */}
                      {selectedApplication.assessments.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold mb-2 block">Assessment</Label>
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              {selectedApplication.assessments[0].submissionContent}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Submitted: {new Date(selectedApplication.assessments[0].completedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {selectedApplication.status === "pending" || selectedApplication.status === "under_review" ? (
                        <div className="space-y-2 pt-4 border-t">
                          <Button
                            className="w-full"
                            onClick={() => openReviewModal("approve")}
                            disabled={isProcessing}
                          >
                            {isProcessing && actionType === "approve" ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Approve Application
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => openReviewModal("reject")}
                            disabled={isProcessing}
                          >
                            {isProcessing && actionType === "reject" ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Application
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground text-center">
                            This application has been {selectedApplication.status}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="sticky top-4">
                    <CardContent className="p-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Select an application to view details
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>
                {actionType === "approve" ? "Approve Application" : "Reject Application"}
              </CardTitle>
              <CardDescription>
                {actionType === "approve"
                  ? "Confirm approval of this expedited application"
                  : "Provide reason for rejection"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="review-comments">Review Comments</Label>
                <Textarea
                  id="review-comments"
                  placeholder="Add your review comments here..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewComments("");
                    setActionType(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={actionType === "approve" ? "default" : "destructive"}
                  onClick={actionType === "approve" ? handleApprove : handleReject}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : actionType === "approve" ? (
                    "Confirm Approval"
                  ) : (
                    "Confirm Rejection"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}

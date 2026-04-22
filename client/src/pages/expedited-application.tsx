import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "wouter";
import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

interface DocumentUpload {
  file: File;
  type: "certificate" | "degree" | "transcript" | "cv" | "other";
  url?: string;
}

export default function ExpeditedApplication() {
  const [targetLevel, setTargetLevel] = useState<"MEMBER" | "FELLOW" | null>(null);
  const [experienceSummary, setExperienceSummary] = useState("");
  const [qualificationsSummary, setQualificationsSummary] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentUpload["type"]) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, you would upload to Supabase Storage here
      // For now, we'll store the file locally
      setDocuments([...documents, { file, type }]);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetLevel) {
      setErrorMessage("Please select a target level");
      return;
    }

    if (documents.length === 0) {
      setErrorMessage("Please upload at least one supporting document");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      // In production, this would call the API endpoints
      // 1. Create expedited application
      // 2. Upload documents to Supabase Storage
      // 3. Link documents to application
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage("Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Header */}
      <section className="bg-gradient-to-br from-slate-900 via-primary to-slate-900 text-white py-16">
        <ScrollReveal direction="up" distance={40} duration={0.7}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/qualification-pathway">
              <Button variant="ghost" className="text-white/70 hover:text-white mb-6">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Qualification Pathways
              </Button>
            </Link>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Expedited Application
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Apply for expedited membership or fellowship based on your professional experience and qualifications.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Application Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal direction="up" distance={25} duration={0.6}>
            {submitStatus === "success" ? (
              <Card className="border-green-500/20">
                <CardContent className="p-12 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted Successfully</h2>
                    <p className="text-muted-foreground">
                      Your expedited application has been submitted and is under review. 
                      You will be notified once a decision has been made.
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <Button size="lg">
                      Return to Dashboard
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Target Level Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Target Qualification Level</CardTitle>
                    <CardDescription>
                      Select the qualification level you are applying for
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={targetLevel === "MEMBER" ? "default" : "outline"}
                        className={`h-auto p-6 flex flex-col items-start gap-3 ${
                          targetLevel === "MEMBER" ? "border-primary" : ""
                        }`}
                        onClick={() => setTargetLevel("MEMBER")}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          <span className="font-bold">Member (MCIMArb)</span>
                        </div>
                        <p className="text-sm text-left opacity-70">
                          14-day assessment for experienced professionals with 3+ years ADR or legal experience
                        </p>
                      </Button>
                      <Button
                        type="button"
                        variant={targetLevel === "FELLOW" ? "default" : "outline"}
                        className={`h-auto p-6 flex flex-col items-start gap-3 ${
                          targetLevel === "FELLOW" ? "border-primary" : ""
                        }`}
                        onClick={() => setTargetLevel("FELLOW")}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          <span className="font-bold">Fellow (FCIMArb)</span>
                        </div>
                        <p className="text-sm text-left opacity-70">
                          48-hour assessment for senior professionals with 7+ years ADR or 10+ legal experience
                        </p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Experience Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Experience</CardTitle>
                    <CardDescription>
                      Provide a summary of your relevant professional experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="experience">Experience Summary</Label>
                      <Textarea
                        id="experience"
                        placeholder="Describe your years of experience in ADR, legal practice, or related fields..."
                        value={experienceSummary}
                        onChange={(e) => setExperienceSummary(e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Qualifications Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Qualifications</CardTitle>
                    <CardDescription>
                      List your relevant qualifications, certifications, and educational background
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="qualifications">Qualifications Summary</Label>
                      <Textarea
                        id="qualifications"
                        placeholder="List your degrees, certifications, professional designations..."
                        value={qualificationsSummary}
                        onChange={(e) => setQualificationsSummary(e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Document Uploads */}
                <Card>
                  <CardHeader>
                    <CardTitle>Supporting Documents</CardTitle>
                    <CardDescription>
                      Upload your CV, certificates, degrees, and other supporting documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cv-upload">CV / Resume *</Label>
                        <Input
                          id="cv-upload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, "cv")}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certificate-upload">Professional Certificates</Label>
                        <Input
                          id="certificate-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "certificate")}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="degree-upload">Degree Certificates</Label>
                        <Input
                          id="degree-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "degree")}
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transcript-upload">Academic Transcripts</Label>
                        <Input
                          id="transcript-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "transcript")}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    {documents.length > 0 && (
                      <div className="space-y-2">
                        <Label>Uploaded Documents</Label>
                        <div className="space-y-2">
                          {documents.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{doc.file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(doc.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {doc.type}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocument(index)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Error Message */}
                {errorMessage && (
                  <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

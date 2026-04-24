import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "wouter";
import { useState } from "react";
import { FileText, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocumentUpload {
  file: File;
  type: "certificate" | "degree" | "transcript" | "cv" | "other";
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ExpeditedApplication() {
  const [track, setTrack] = useState<"ARBITRATION" | "MEDIATION">("ARBITRATION");
  const [targetLevel, setTargetLevel] = useState<"MEMBER" | "FELLOW" | null>(null);
  const [experienceSummary, setExperienceSummary] = useState("");
  const [qualificationsSummary, setQualificationsSummary] = useState("");
  const [documents, setDocuments] = useState<DocumentUpload[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: DocumentUpload["type"],
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocuments((prev) => [...prev, { file, type }]);
    }
    // Reset the input so the same filename can be re-selected if removed
    e.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const hasCv = documents.some((d) => d.type === "cv");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setProgressMessage("");

    if (!targetLevel) {
      setErrorMessage("Please select a target level.");
      return;
    }
    if (!hasCv) {
      setErrorMessage("A CV / Resume is required.");
      return;
    }
    if (!experienceSummary.trim() || !qualificationsSummary.trim()) {
      setErrorMessage("Please fill in both experience and qualifications summaries.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) {
        throw new Error("You must be signed in to apply.");
      }
      const headers = { ...(await authHeader()), "Content-Type": "application/json" };

      // 1. Create application in DRAFT
      setProgressMessage("Creating application...");
      const applyResp = await fetch("/api/qualification/expedited/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({
          track,
          targetLevel,
          experienceSummary,
          qualificationsSummary,
        }),
      });
      const applyJson = await applyResp.json().catch(() => ({}));
      if (!applyResp.ok) {
        throw new Error(
          applyJson.reason || applyJson.error || "Failed to create application",
        );
      }
      const applicationId: string = applyJson.id;

      // 2. Upload each document to Supabase Storage, then register on the app
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setProgressMessage(
          `Uploading document ${i + 1} of ${documents.length}: ${doc.file.name}`,
        );
        const safeName = doc.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${applicationId}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from("expedited-documents")
          .upload(path, doc.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: doc.file.type || undefined,
          });
        if (uploadErr) {
          throw new Error(`Failed to upload ${doc.file.name}: ${uploadErr.message}`);
        }

        const regResp = await fetch(
          `/api/qualification/expedited/applications/${applicationId}/documents`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              documentType: doc.type,
              fileUrl: path,
              fileName: doc.file.name,
              fileSize: doc.file.size,
            }),
          },
        );
        if (!regResp.ok) {
          const errJson = await regResp.json().catch(() => ({}));
          throw new Error(
            errJson.error || `Failed to register ${doc.file.name} on application`,
          );
        }
      }

      // 3. Initialize Paystack payment and redirect
      setProgressMessage("Redirecting to secure checkout...");
      const payResp = await fetch(
        `/api/qualification/expedited/applications/${applicationId}/pay`,
        { method: "POST", headers },
      );
      const payJson = await payResp.json().catch(() => ({}));
      if (!payResp.ok || !payJson.authorization_url) {
        throw new Error(payJson.error || "Failed to initialize payment");
      }

      window.location.href = payJson.authorization_url;
    } catch (err: any) {
      console.error("Expedited submission failed:", err);
      setErrorMessage(err?.message || "Failed to submit application. Please try again.");
      setIsSubmitting(false);
      setProgressMessage("");
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
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Track Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Qualification Track</CardTitle>
                    <CardDescription>
                      Expedited applications are currently limited to the Arbitration pathway.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={track === "ARBITRATION" ? "default" : "outline"}
                        className={`h-auto p-6 flex flex-col items-start gap-2 ${
                          track === "ARBITRATION" ? "border-primary" : ""
                        }`}
                        onClick={() => setTrack("ARBITRATION")}
                      >
                        <span className="font-bold">Arbitration</span>
                        <p className="text-sm text-left opacity-70">
                          CIMArb pathway (ACIMArb → MCIMArb → FCIMArb)
                        </p>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-6 flex flex-col items-start gap-2 opacity-60 cursor-not-allowed"
                        disabled
                      >
                        <span className="font-bold">Mediation</span>
                        <p className="text-sm text-left opacity-70">
                          Expedited routes are not available for this track yet.
                        </p>
                      </Button>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-sm text-blue-900">
                        Need expedited consideration for Mediation? Our team can review exceptional cases manually. Contact admissions after submitting your standard application.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

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

                {progressMessage && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <p className="text-sm text-foreground">{progressMessage}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="min-w-[220px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit & Continue to Payment"
                    )}
                  </Button>
                </div>
              </form>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

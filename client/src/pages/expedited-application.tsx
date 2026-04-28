import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "wouter";
import { useCallback, useEffect, useState } from "react";
import { FileText, AlertCircle, ArrowLeft, Loader2, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

type ServerDocumentType = "CV" | "CERTIFICATE" | "LICENSE" | "PORTFOLIO" | "REFERENCE" | "AWARD" | "OTHER";
type DocumentUploadType = ServerDocumentType | "DEGREE" | "TRANSCRIPT";

interface DocumentUpload {
  file: File;
  type: DocumentUploadType;
}

interface ExistingDocument {
  id: string;
  documentType: ServerDocumentType;
  fileUrl: string;
  originalName?: string | null;
  fileSize?: number | null;
}

type ReviewStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "MORE_INFO_REQUIRED";

const DOCUMENT_LABELS: Record<DocumentUploadType | ServerDocumentType, string> = {
  CV: "CV / Resume",
  CERTIFICATE: "Professional Certificate",
  DEGREE: "Degree Certificate",
  TRANSCRIPT: "Academic Transcript",
  LICENSE: "License / Accreditation",
  PORTFOLIO: "Portfolio",
  REFERENCE: "Professional Reference",
  AWARD: "Award / Recognition",
  OTHER: "Supporting Document",
};

const DOCUMENT_TYPE_MAP: Record<DocumentUploadType, ServerDocumentType> = {
  CV: "CV",
  CERTIFICATE: "CERTIFICATE",
  DEGREE: "CERTIFICATE",
  TRANSCRIPT: "CERTIFICATE",
  LICENSE: "LICENSE",
  PORTFOLIO: "PORTFOLIO",
  REFERENCE: "REFERENCE",
  AWARD: "AWARD",
  OTHER: "OTHER",
};

const STATUS_MESSAGES: Partial<Record<ReviewStatus, { title: string; description: string; tone: "info" | "success" | "warning" }>> = {
  UNDER_REVIEW: {
    title: "Your profile is under review",
    description: "Our admissions team is validating your experience. You can continue learning while we finalize the upgrade.",
    tone: "info",
  },
  APPROVED: {
    title: "Profile approved",
    description: "Congrats! Your qualifications have been verified. Watch for an email confirming your upgraded level.",
    tone: "success",
  },
  MORE_INFO_REQUIRED: {
    title: "More information requested",
    description: "Check your email for the reviewer’s note and resubmit the requested details to continue.",
    tone: "warning",
  },
};

const STORAGE_BUCKET = "expedited-documents";

const PROFESSION_OPTIONS = [
  "Lawyer",
  "Judge",
  "Mediator / Arbitrator",
  "Academic",
  "Engineer",
  "Architect",
  "Business Executive",
  "Consultant",
  "Public Servant",
  "Other",
];

const POST_QUAL_EXPERIENCE_OPTIONS = [
  "0-2 years",
  "3-5 years",
  "5-10 years",
  "10-20 years",
  "20+ years",
];

function parseYearsFromBucket(bucket: string): number {
  const match = bucket.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
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
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [profileStatus, setProfileStatus] = useState<ReviewStatus | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Professional Identity
  const [primaryProfession, setPrimaryProfession] = useState("");
  const [currentOrganization, setCurrentOrganization] = useState("");
  const [yearsPostQualification, setYearsPostQualification] = useState("");
  const [countryOfPractice, setCountryOfPractice] = useState("");

  // Arbitration & Mediation Triage
  const [hasLawDegree, setHasLawDegree] = useState<boolean | null>(null);
  const [hasLlm, setHasLlm] = useState<boolean | null>(null);
  const [llmAdrFocus, setLlmAdrFocus] = useState<boolean | null>(null);
  const [hasPriorAdrTraining, setHasPriorAdrTraining] = useState<boolean | null>(null);
  const [adrTrainingInstitution, setAdrTrainingInstitution] = useState("");

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

  const hasCvOnFile =
    documents.some((d) => d.type === "CV") ||
    existingDocuments.some((doc) => doc.documentType === "CV");

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    setErrorMessage("");
    try {
      const headers = await authHeader();
      const response = await fetch("/api/qualification/professional-profile", { headers });

      if (!response.ok) {
        if (response.status === 404) {
          setProfileStatus(null);
          setExistingDocuments([]);
          return;
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load professional profile");
      }

      const profile = await response.json().catch(() => null);
      if (!profile) {
        setProfileStatus(null);
        setExistingDocuments([]);
        return;
      }

      setProfileStatus(profile.reviewStatus ?? null);
      if (profile.track === "MEDIATION" || profile.track === "ARBITRATION") {
        setTrack(profile.track);
      }
      setTargetLevel(profile.selfAssessedLevel ?? null);
      setExperienceSummary(profile.narrativeSummary ?? "");
      if (Array.isArray(profile.qualifications) && profile.qualifications.length > 0) {
        setQualificationsSummary(profile.qualifications.join("\n"));
      }
      setExistingDocuments(profile.documents ?? []);

      // Restore professional identity fields
      if (profile.submittedPayload?.primaryProfession) setPrimaryProfession(profile.submittedPayload.primaryProfession);
      if (profile.submittedPayload?.currentOrganization) setCurrentOrganization(profile.submittedPayload.currentOrganization);
      if (profile.submittedPayload?.yearsPostQualification) setYearsPostQualification(profile.submittedPayload.yearsPostQualification);
      if (profile.submittedPayload?.countryOfPractice) setCountryOfPractice(profile.submittedPayload.countryOfPractice);

      // Restore triage fields
      if (typeof profile.submittedPayload?.hasLawDegree === "boolean") setHasLawDegree(profile.submittedPayload.hasLawDegree);
      if (typeof profile.submittedPayload?.hasLlm === "boolean") setHasLlm(profile.submittedPayload.hasLlm);
      if (typeof profile.submittedPayload?.llmAdrFocus === "boolean") setLlmAdrFocus(profile.submittedPayload.llmAdrFocus);
      if (typeof profile.submittedPayload?.hasPriorAdrTraining === "boolean") setHasPriorAdrTraining(profile.submittedPayload.hasPriorAdrTraining);
      if (profile.submittedPayload?.adrTrainingInstitution) setAdrTrainingInstitution(profile.submittedPayload.adrTrainingInstitution);
    } catch (error: any) {
      console.error("Failed to load profile", error);
      setErrorMessage(error?.message || "Unable to load your professional profile.");
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRemoveExistingDocument = async (documentId: string) => {
    setErrorMessage("");
    try {
      const headers = await authHeader();
      const resp = await fetch(`/api/qualification/professional-profile/documents/${documentId}`, {
        method: "DELETE",
        headers,
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete document");
      }
      setExistingDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (error: any) {
      console.error("Failed to delete document", error);
      setErrorMessage(error?.message || "Could not delete the selected document.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setProgressMessage("");
    setSuccessMessage("");

    if (!targetLevel) {
      setErrorMessage("Please select a target level.");
      return;
    }
    if (!hasCvOnFile) {
      setErrorMessage("Please upload at least one CV / Resume.");
      return;
    }
    if (!experienceSummary.trim() || !qualificationsSummary.trim()) {
      setErrorMessage("Please fill in both experience and qualifications summaries.");
      return;
    }
    if (!primaryProfession.trim()) {
      setErrorMessage("Please select your primary profession.");
      return;
    }
    if (!currentOrganization.trim()) {
      setErrorMessage("Please enter your current organization.");
      return;
    }
    if (!yearsPostQualification) {
      setErrorMessage("Please select your years of post-qualification experience.");
      return;
    }
    if (!countryOfPractice) {
      setErrorMessage("Please select your country of practice.");
      return;
    }
    if (hasLawDegree === null) {
      setErrorMessage("Please indicate whether you hold a law degree.");
      return;
    }
    if (hasLlm === null) {
      setErrorMessage("Please indicate whether you hold an LLM.");
      return;
    }
    if (hasLlm && llmAdrFocus === null) {
      setErrorMessage("Please indicate if your LLM focused on ADR or International Arbitration.");
      return;
    }
    if (hasPriorAdrTraining === null) {
      setErrorMessage("Please indicate whether you have completed ADR training.");
      return;
    }
    if (hasPriorAdrTraining && !adrTrainingInstitution.trim()) {
      setErrorMessage("Please specify the institution where you completed ADR training.");
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

      setProgressMessage("Saving professional profile...");
      const profileResp = await fetch("/api/qualification/professional-profile", {
        method: "POST",
        headers,
        body: JSON.stringify({
          submit: true,
          track,
          narrativeSummary: experienceSummary,
          qualifications: qualificationsSummary ? [qualificationsSummary] : [],
          selfAssessedLevel: targetLevel,
          submittedPayload: {
            targetLevel,
            experienceSummary,
            qualificationsSummary,
            primaryProfession,
            currentOrganization,
            yearsPostQualification,
            countryOfPractice,
            hasLawDegree,
            hasLlm,
            llmAdrFocus,
            hasPriorAdrTraining,
            adrTrainingInstitution,
          },
        }),
      });
      const profileJson = await profileResp.json().catch(() => ({}));
      if (!profileResp.ok) {
        throw new Error(profileJson.reason || profileJson.error || "Failed to save profile");
      }

      // Upload new documents (existing ones stay on file)
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        setProgressMessage(
          `Uploading document ${i + 1} of ${documents.length}: ${doc.file.name}`,
        );
        const safeName = doc.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${Date.now()}_${safeName}`;

        const { error: uploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, doc.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: doc.file.type || undefined,
          });
        if (uploadErr) {
          throw new Error(`Failed to upload ${doc.file.name}: ${uploadErr.message}`);
        }
        const { data: publicUrlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(path);

        const docResp = await fetch(`/api/qualification/professional-profile/documents`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            documentType: DOCUMENT_TYPE_MAP[doc.type] ?? "OTHER",
            fileUrl: publicUrlData?.publicUrl || path,
            storagePath: path,
            originalName: doc.file.name,
            fileSize: doc.file.size,
          }),
        });
        const docJson = await docResp.json().catch(() => ({}));
        if (!docResp.ok) {
          throw new Error(docJson.error || `Failed to register ${doc.file.name}`);
        }
      }

      setSuccessMessage(
        "Profile submitted successfully! Our admissions team will review your experience and contact you shortly.",
      );
      setDocuments([]);
      setProgressMessage("");
      await loadProfile();
    } catch (err: any) {
      console.error("Expedited submission failed:", err);
      setErrorMessage(err?.message || "Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
      setProgressMessage("");
    }
  };

  const renderStatusBanner = () => {
    if (!profileStatus) return null;
    const config = STATUS_MESSAGES[profileStatus];
    if (!config) return null;

    const toneClasses =
      config.tone === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
        : config.tone === "warning"
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : "bg-blue-50 border-blue-200 text-blue-900";

    return (
      <Card className={`${toneClasses} border`}> 
        <CardContent className="p-4">
          <p className="text-sm font-semibold">{config.title}</p>
          <p className="text-sm mt-1 opacity-90">{config.description}</p>
        </CardContent>
      </Card>
    );
  };

  const renderExistingDocuments = () => {
    if (existingDocuments.length === 0) return null;
    return (
      <div className="space-y-2">
        <Label>Documents on file</Label>
        <div className="space-y-2">
          {existingDocuments.map((doc) => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted/70 rounded-lg">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.originalName || "Supporting document"}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_LABELS[doc.documentType]}
                    {doc.fileSize ? ` • ${(doc.fileSize / 1024).toFixed(1)} KB` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                    View <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveExistingDocument(doc.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header component hidden - navigation removed */}
      
      {/* Hero Section */}
      <section className="bg-[#8b0000] text-white py-12 relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#8b0000] to-[#410000] opacity-50" />
        <ScrollReveal direction="up" distance={40} duration={0.7}>
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/onboarding">
              <Button variant="ghost" className="text-white/70 hover:text-white mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>

            {/* Step indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white/80">Step 3 of 3</span>
                <span className="text-sm text-white/60">Detailed Application</span>
              </div>
              <div className="flex gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/80" />
                <div className="h-1.5 flex-1 rounded-full bg-white/80" />
                <div className="h-1.5 flex-1 rounded-full bg-white/80" />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 break-words">
              Detailed Application
            </h1>
            <p className="text-base sm:text-lg text-white/70 max-w-2xl">
              Submit these details so our admissions team can review you for Member or Fellow access. You'll keep your Associate access while we review.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Application Form */}
      <section className="py-10 sm:py-16">
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
                    {renderStatusBanner()}
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <Button
                        type="button"
                        variant={track === "ARBITRATION" ? "default" : "outline"}
                        className={`h-auto p-4 sm:p-6 flex flex-col items-start gap-2 whitespace-normal text-left ${
                          track === "ARBITRATION" ? "border-primary" : ""
                        }`}
                        onClick={() => setTrack("ARBITRATION")}
                      >
                        <span className="font-bold">Arbitration</span>
                        <p className="text-sm text-left opacity-70 break-words whitespace-normal">
                          CIMArb pathway (ACIMArb → MCIMArb → FCIMArb)
                        </p>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto p-4 sm:p-6 flex flex-col items-start gap-2 whitespace-normal text-left opacity-60 cursor-not-allowed"
                        disabled
                      >
                        <span className="font-bold">Mediation</span>
                        <p className="text-sm text-left opacity-70 break-words whitespace-normal">
                          Expedited routes are not available for this track yet.
                        </p>
                      </Button>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-sm text-blue-900">
                        Need expedited consideration for Mediation? Our team can review exceptional cases manually. Contact <a href="mailto:info@thecima.org" className="underline">info@thecima.org</a> after submitting your standard application.
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
                    <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                      <Button
                        type="button"
                        variant={targetLevel === "MEMBER" ? "default" : "outline"}
                        className={`h-auto p-4 sm:p-6 flex flex-col items-start gap-3 whitespace-normal text-left ${
                          targetLevel === "MEMBER" ? "border-primary" : ""
                        }`}
                        onClick={() => setTargetLevel("MEMBER")}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-5 h-5 flex-shrink-0" />
                          <span className="font-bold break-words">Member (MCIMArb)</span>
                        </div>
                        <p className="text-sm text-left opacity-70 break-words whitespace-normal">
                          14-day assessment for experienced professionals with 3+ years ADR or legal experience
                        </p>
                      </Button>
                      <Button
                        type="button"
                        variant={targetLevel === "FELLOW" ? "default" : "outline"}
                        className={`h-auto p-4 sm:p-6 flex flex-col items-start gap-3 whitespace-normal text-left ${
                          targetLevel === "FELLOW" ? "border-primary" : ""
                        }`}
                        onClick={() => setTargetLevel("FELLOW")}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-5 h-5 flex-shrink-0" />
                          <span className="font-bold break-words">Fellow (FCIMArb)</span>
                        </div>
                        <p className="text-sm text-left opacity-70 break-words whitespace-normal">
                          48-hour assessment for senior professionals with 7+ years ADR or 10+ legal experience
                        </p>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Identity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Identity</CardTitle>
                    <CardDescription>
                      Your basic professional background for jurisdictional context
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary-profession">Primary Profession *</Label>
                      <Select value={primaryProfession} onValueChange={setPrimaryProfession} disabled={isSubmitting}>
                        <SelectTrigger id="primary-profession">
                          <SelectValue placeholder="Select your profession" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROFESSION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current-organization">Current Firm / Organization *</Label>
                      <Input
                        id="current-organization"
                        placeholder="e.g., ABC Law Firm, XYZ University"
                        value={currentOrganization}
                        onChange={(e) => setCurrentOrganization(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="years-post-qual">Years of Post-Qualification Experience *</Label>
                      <Select value={yearsPostQualification} onValueChange={setYearsPostQualification} disabled={isSubmitting}>
                        <SelectTrigger id="years-post-qual">
                          <SelectValue placeholder="Select years of experience" />
                        </SelectTrigger>
                        <SelectContent>
                          {POST_QUAL_EXPERIENCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country-of-practice">Country of Practice *</Label>
                      <Select value={countryOfPractice} onValueChange={setCountryOfPractice} disabled={isSubmitting}>
                        <SelectTrigger id="country-of-practice">
                          <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.code} value={country.name}>{country.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Arbitration & Mediation Triage */}
                <Card>
                  <CardHeader>
                    <CardTitle>Arbitration & Mediation Triage</CardTitle>
                    <CardDescription>
                      Qualifications assessment for expedited placement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label>Do you hold a Law Degree (LLB, BL, or JD)? *</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={hasLawDegree === true ? "default" : "outline"}
                          onClick={() => setHasLawDegree(true)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={hasLawDegree === false ? "default" : "outline"}
                          onClick={() => setHasLawDegree(false)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          No
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Do you hold an LLM (Master of Laws)? *</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={hasLlm === true ? "default" : "outline"}
                          onClick={() => setHasLlm(true)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={hasLlm === false ? "default" : "outline"}
                          onClick={() => setHasLlm(false)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          No
                        </Button>
                      </div>
                      {hasLlm && (
                        <div className="space-y-3 mt-3 p-4 bg-muted/50 rounded-lg">
                          <Label>Was your LLM focused on ADR or International Arbitration?</Label>
                          <div className="flex gap-3">
                            <Button
                              type="button"
                              variant={llmAdrFocus === true ? "default" : "outline"}
                              onClick={() => setLlmAdrFocus(true)}
                              disabled={isSubmitting}
                              className="flex-1"
                            >
                              Yes
                            </Button>
                            <Button
                              type="button"
                              variant={llmAdrFocus === false ? "default" : "outline"}
                              onClick={() => setLlmAdrFocus(false)}
                              disabled={isSubmitting}
                              className="flex-1"
                            >
                              No
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label>Have you completed any previous ADR training? *</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={hasPriorAdrTraining === true ? "default" : "outline"}
                          onClick={() => setHasPriorAdrTraining(true)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant={hasPriorAdrTraining === false ? "default" : "outline"}
                          onClick={() => setHasPriorAdrTraining(false)}
                          disabled={isSubmitting}
                          className="flex-1"
                        >
                          No
                        </Button>
                      </div>
                      {hasPriorAdrTraining && (
                        <div className="space-y-2 mt-3">
                          <Label htmlFor="adr-institution">Please specify the institution *</Label>
                          <Input
                            id="adr-institution"
                            placeholder="e.g., CIArb, AAA, LCIA"
                            value={adrTrainingInstitution}
                            onChange={(e) => setAdrTrainingInstitution(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
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
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cv-upload">CV / Resume *</Label>
                        <Input
                          id="cv-upload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => handleFileUpload(e, "CV")}
                          className="cursor-pointer"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="certificate-upload">Professional Certificates</Label>
                        <Input
                          id="certificate-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "CERTIFICATE")}
                          className="cursor-pointer"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="degree-upload">Degree Certificates</Label>
                        <Input
                          id="degree-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "DEGREE")}
                          className="cursor-pointer"
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="transcript-upload">Academic Transcripts</Label>
                        <Input
                          id="transcript-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload(e, "TRANSCRIPT")}
                          className="cursor-pointer"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {renderExistingDocuments()}

                    {documents.length > 0 && (
                      <div className="space-y-2">
                        <Label>Documents to upload ({documents.length})</Label>
                        <div className="space-y-2">
                          {documents.map((doc, index) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(doc.file.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {DOCUMENT_LABELS[doc.type]}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDocument(index)}
                                  disabled={isSubmitting}
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

                {successMessage && (
                  <Card className="border-emerald-500/20 bg-emerald-500/5">
                    <CardContent className="p-4 text-sm text-emerald-800">
                      {successMessage}
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
                    disabled={isSubmitting || isLoadingProfile}
                    className="w-full sm:w-auto sm:min-w-[220px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit for Review"
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

import { useCallback, useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  EligibilityStateCard,
  ProgressionDetailsCard,
} from "@/components/enrollment/eligibility-state-card";
import type {
  EligibilityAction,
  EligibilityActionType,
  EligibilityResponse,
} from "@shared/eligibility-engine";

export default function EnrollmentStatusPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEligibility = useCallback(async () => {
    if (!courseId) {
      setError("Course not found");
      setIsLoading(false);
      return;
    }

    if (!user) {
      setLocation(`/login?redirect=/enroll/${courseId}/status`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/enrollments/check-eligibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ courseId }),
      });

      if (response.status === 401) {
        setLocation(`/login?redirect=/enroll/${courseId}/status`);
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || "Unable to verify eligibility");
      }

      const dataJson: EligibilityResponse = await response.json();
      setEligibility(dataJson);
    } catch (err: any) {
      setError(err.message || "Unable to verify eligibility");
    } finally {
      setIsLoading(false);
    }
  }, [courseId, user, setLocation]);

  useEffect(() => {
    fetchEligibility();
  }, [fetchEligibility]);

  const handleAction = (action?: EligibilityAction) => {
    if (!action) return;
    const destination = action.actionTarget || fallbackTarget(action.actionType);
    if (!destination) return;
    setLocation(destination);
  };

  const fallbackTarget = (type: EligibilityActionType) => {
    if (!courseId) return null;
    switch (type) {
      case "ENROLL":
        return `/checkout/${courseId}`;
      case "APPLY":
        return `/enroll/${courseId}/status?mode=apply`;
      case "VIEW_ENROLLMENT":
        return "/dashboard";
      default:
        return "/courses";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Checking your progression...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-16">
          <Card>
            <CardContent className="flex flex-col gap-4 py-10 text-center">
              <p className="text-lg text-destructive">{error}</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setLocation(`/course/${courseId}`)}>
                  Back to course
                </Button>
                <Button onClick={fetchEligibility}>
                  <RefreshCcw data-icon="inline-start" className="size-4" />Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!eligibility) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enrollment guidance</p>
            <h1 className="text-3xl font-bold tracking-tight">
              Your path to {formatLevel(eligibility.progression.targetLevel)}
            </h1>
            <p className="text-muted-foreground">
              We analyzed your current standing and mapped the fastest way to continue your CIMA journey.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <EligibilityStateCard
                response={eligibility}
                onAction={handleAction}
                onSecondaryAction={handleAction}
              />

              {eligibility.progression.expeditedAvailable && (
                <Alert>
                  <AlertTitle>Expedited pathway available</AlertTitle>
                  <AlertDescription>
                    You qualify via {formatEligibilityType(eligibility.progression.expeditedType)}. Use the application button
                    above to start the accelerated assessment and reserve your cohort seat.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <ProgressionDetailsCard progression={eligibility.progression} />

              <Card>
                <CardContent className="flex flex-col gap-4 py-6">
                  <h3 className="text-lg font-semibold">Prefer to browse other courses?</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore the catalogue to choose a different pathway, or return to your dashboard to continue ongoing
                    training.
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button className="w-full" variant="secondary" onClick={() => setLocation(`/course/${courseId}`)}>
                      Back to course
                    </Button>
                    <Button className="w-full" variant="outline" onClick={() => setLocation("/courses")}>Browse catalog</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function formatLevel(level: string) {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

function formatEligibilityType(type?: string) {
  if (!type) return "your professional credentials";
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

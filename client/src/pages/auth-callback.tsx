import { useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Auth callback: Starting...");
        
        // Handle the OAuth callback - get session after redirect
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        console.log("Auth callback: Session data:", sessionData);
        console.log("Auth callback: Session error:", sessionError);
        
        if (sessionError) {
          console.error("Auth callback error:", sessionError);
          toast({
            title: "Authentication Error",
            description: "There was an error signing you in. Please try again.",
            variant: "destructive",
          });
          setLocation("/login");
          return;
        }

        if (sessionData.session) {
          console.log("Auth callback: User authenticated:", sessionData.session.user.id);
          const role = (sessionData.session.user.user_metadata?.role ?? "student").toLowerCase();

          if (role === "admin") {
            console.log("Auth callback: Admin detected, redirecting to admin dashboard");
            setLocation("/admin");
            return;
          }
          
          // Check if onboarding is completed
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("profile_completed")
            .eq("user_id", sessionData.session.user.id)
            .maybeSingle();

          console.log("Auth callback: Profile data:", profileData);
          console.log("Auth callback: Profile error:", profileError);

          // If no profile exists or profile is not completed, go to onboarding
          const profileComplete = profileData?.profile_completed ?? false;

          console.log("Auth callback: Profile complete:", profileComplete);

          if (!profileData || !profileComplete) {
            console.log("Auth callback: Redirecting to onboarding");
            setLocation("/onboarding");
          } else {
            console.log("Auth callback: Redirecting to dashboard");
            setLocation("/dashboard");
          }
        } else {
          // No session, redirect to login
          setLocation("/login");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        toast({
          title: "Authentication Error",
          description: "There was an error signing you in. Please try again.",
          variant: "destructive",
        });
        setLocation("/login");
      }
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

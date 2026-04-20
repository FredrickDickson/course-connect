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
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth callback error:", error);
          toast({
            title: "Authentication Error",
            description: "There was an error signing you in. Please try again.",
            variant: "destructive",
          });
          setLocation("/login");
          return;
        }

        if (data.session) {
          // Check if onboarding is completed
          const { data: profileData } = await supabase
            .from("profiles")
            .select("bio_data_completed")
            .eq("id", data.session.user.id)
            .single();

          const bioComplete = (profileData as any)?.bio_data_completed ?? false;

          if (!bioComplete) {
            setLocation("/onboarding");
          } else {
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

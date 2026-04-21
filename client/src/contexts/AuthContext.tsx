import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  role: string;
  bio?: string;
  country?: string;
  timezone?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  authUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  isInstructor: () => boolean;
  isAdmin: () => boolean;
  isStudent: () => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchUserProfile = useCallback(async (currentAuthUser: User): Promise<UserProfile> => {
    const { data: profile, error } = await supabase
      .from("users")
      .select("role, first_name, last_name, profile_image_url, bio, country, timezone, created_at")
      .eq("id", currentAuthUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile fetch error:", error);
    }

    const profileData = profile as any;

    return {
      id: currentAuthUser.id,
      email: currentAuthUser.email || "",
      firstName: profileData?.first_name || currentAuthUser.user_metadata?.first_name || currentAuthUser.email?.split("@")[0] || "",
      lastName: profileData?.last_name || currentAuthUser.user_metadata?.last_name || "",
      profileImageUrl: profileData?.profile_image_url || currentAuthUser.user_metadata?.avatar_url || "",
      role: profileData?.role || "student",
      bio: profileData?.bio || "",
      country: profileData?.country || "",
      timezone: profileData?.timezone || "",
      createdAt: profileData?.created_at || "",
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authInitialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      console.log("Auth event:", event, "User:", session?.user?.id);
      setAuthUser(session?.user ?? null);
      setIsAuthReady(true);
      authInitialized = true;
    });

    const getInitialSession = async () => {
      try {
        // If onAuthStateChange already fired, we don't need to manually get session
        if (authInitialized) return;

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;
        if (error) throw error;

        if (session) {
          setAuthUser(session.user);
        }
        setIsAuthReady(true);
      } catch (err) {
        if (!isMounted) return;
        setAuthUser(null);
        setIsAuthReady(true);
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isAuthReady) {
      return () => {
        isMounted = false;
      };
    }

    if (!authUser) {
      setUser(null);
      setIsProfileLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsProfileLoading(true);

    void fetchUserProfile(authUser)
      .then((nextUser) => {
        if (!isMounted) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsProfileLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authUser, fetchUserProfile, isAuthReady]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
    setIsProfileLoading(false);
    setIsAuthReady(true);
  }, []);

  const isLoading = !isAuthReady || (!!authUser && (isProfileLoading || !user));

  const hasRole = (role: string) => user?.role === role;
  const isInstructor = () => hasRole("instructor") || hasRole("admin");
  const isAdmin = () => hasRole("admin");
  const isStudent = () => hasRole("student");

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        isLoading,
        isAuthenticated: !!user,
        hasRole,
        isInstructor,
        isAdmin,
        isStudent,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

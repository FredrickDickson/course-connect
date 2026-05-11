import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  profileImageUrl: string;
  role: string;
  membershipLevel: string | null;
  assignedLevel: string | null;
  currentLevel: string | null;
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
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const profileFetchedRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (currentAuthUser: User): Promise<UserProfile> => {
    console.log("Fetching profile for user:", currentAuthUser.id);
    const [{ data: profile, error: profileError }, { data: userRow, error: userError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("status, full_name, part, avatar_url, country, timezone, created_at")
        .eq("user_id", currentAuthUser.id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("role, assigned_level, current_level, first_name, middle_name, last_name")
        .eq("id", currentAuthUser.id)
        .maybeSingle(),
    ]);

    if (profileError) {
      console.error("Profile fetch error:", profileError);
    }

    if (userError) {
      console.error("User role fetch error:", userError);
    }

    console.log("[Auth] users query result:", { userRow, userError });

    // Fallback: if direct query fails (RLS), fetch from server endpoint
    // which uses service-role key and bypasses RLS
    let serverUser: any = null;
    if (userError && !userRow) {
      try {
        const res = await fetch("/api/auth/user", {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });
        if (res.ok) {
          serverUser = await res.json();
          console.log("[Auth] Server fallback user:", serverUser);
        }
      } catch (e) {
        console.error("[Auth] Server fallback failed:", e);
      }
    }

    const profileData = profile as any;
    const nameParts = (profileData?.full_name || "").split(" ");
    const metadataRole = currentAuthUser.user_metadata?.role
      ? String(currentAuthUser.user_metadata.role).toLowerCase()
      : null;
    const userTableRole = userRow?.role
      ? String(userRow.role).toLowerCase()
      : serverUser?.role
        ? String(serverUser.role).toLowerCase()
        : null;
    // Database role is source of truth; metadata is fallback
    const derivedRole = userTableRole || metadataRole || profileData?.status || "student";

    console.log("[Auth] Role resolution:", {
      userId: currentAuthUser.id,
      userTableRole,
      metadataRole,
      profileStatus: profileData?.status,
      derivedRole,
    });

    return {
      id: currentAuthUser.id,
      email: currentAuthUser.email || "",
      firstName: userRow?.first_name || serverUser?.first_name || nameParts[0] || currentAuthUser.user_metadata?.first_name || currentAuthUser.email?.split("@")[0] || "",
      middleName: userRow?.middle_name || serverUser?.middle_name || currentAuthUser.user_metadata?.middle_name || "",
      lastName: userRow?.last_name || serverUser?.last_name || nameParts.slice(1).join(" ") || currentAuthUser.user_metadata?.last_name || "",
      profileImageUrl: profileData?.avatar_url || currentAuthUser.user_metadata?.avatar_url || "",
      role: derivedRole,
      membershipLevel: profileData?.part || null,
      assignedLevel: userRow?.assigned_level || serverUser?.assigned_level || null,
      currentLevel: userRow?.current_level || serverUser?.current_level || null,
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
      
      // Only update authUser if it actually changed to avoid downstream re-renders
      setAuthUser(prev => {
        if (prev?.id === session?.user?.id) return prev;
        return session?.user ?? null;
      });
      
      setIsAuthReady(true);
      authInitialized = true;
    });

    const getInitialSession = async () => {
      try {
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

    if (!isAuthReady || !authUser) {
      if (!authUser) {
        setUser(null);
        profileFetchedRef.current = null;
      }
      return;
    }

    // Prevent redundant fetches for the same user ID within this session
    if (profileFetchedRef.current === authUser.id) {
      return;
    }

    const loadProfile = async () => {
      setIsProfileLoading(true);
      try {
        const nextUser = await fetchUserProfile(authUser);
        if (isMounted) {
          setUser(nextUser);
          profileFetchedRef.current = authUser.id;
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authUser, fetchUserProfile, isAuthReady]);

  const refreshUser = useCallback(async () => {
    if (!authUser) return;
    profileFetchedRef.current = null;
    setIsProfileLoading(true);
    try {
      const nextUser = await fetchUserProfile(authUser);
      setUser(nextUser);
      profileFetchedRef.current = authUser.id;
    } finally {
      setIsProfileLoading(false);
    }
  }, [authUser, fetchUserProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setUser(null);
    setIsProfileLoading(false);
    setIsAuthReady(true);
    profileFetchedRef.current = null;
  }, []);

  const isLoading = !isAuthReady || isProfileLoading || (!!authUser && !user);

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
        refreshUser,
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

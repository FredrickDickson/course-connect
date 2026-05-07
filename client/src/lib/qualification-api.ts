import type {
  Track,
  TrackLevel,
  EnrollmentLevel,
  PathwayType,
  PathwayAction,
} from "@/types/qualification";
import { supabase } from "@/integrations/supabase/client";

export interface QualificationTrackProgress {
  track: Track;
  level: TrackLevel;
  pathway?: "STANDARD" | "EXPEDITED" | "HYBRID" | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserQualificationState {
  tracks: {
    arbitration: QualificationTrackProgress;
    mediation: QualificationTrackProgress;
  };
  yearsAdrExperience?: number;
  yearsLegalExperience?: number;
}

export interface TrackEligibility {
  canTakeAssociate: boolean;
  canTakeMember: boolean;
  canApplyFellow: boolean;
  canUseExpedited?: boolean;
}

export interface EligibilityResponse {
  arbitration: TrackEligibility;
  mediation: TrackEligibility;
}

export interface ApiPathwayOption {
  type: PathwayType;
  level: EnrollmentLevel;
  name: string;
  description: string;
  action: PathwayAction;
}

export interface Certificate {
  id: string;
  user_id: string;
  track: "ARBITRATION" | "MEDIATION";
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  pathway?: "STANDARD" | "EXPEDITED" | "HYBRID";
  post_nominal: string;
  certificate_number: string;
  certificate_url?: string;
  issued_at: string;
  valid_until?: string;
  verification_url?: string;
  is_revoked: boolean;
}

export interface ProgressionHistory {
  id: string;
  course_id: string;
  track: "ARBITRATION" | "MEDIATION";
  level_achieved?: "ASSOCIATE" | "MEMBER" | "FELLOW";
  assessment_passed: boolean;
  assessment_score?: number;
  completed_at: string;
}

// Fetch user's qualification state
async function fetchWithAuth(path: string): Promise<Response | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(path, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`Qualification API error for ${path}`, response.statusText);
      return null;
    }

    return response;
  } catch (error) {
    console.error(`Qualification API request failed for ${path}`, error);
    return null;
  }
}

export async function getQualificationState(): Promise<UserQualificationState | null> {
  const response = await fetchWithAuth("/api/qualification/state");
  if (!response) return null;
  return response.json();
}

export async function getEligibility(): Promise<EligibilityResponse | null> {
  const response = await fetchWithAuth("/api/qualification/eligibility");
  if (!response) return null;
  return response.json();
}

export async function getTrackPathways(track: Track): Promise<ApiPathwayOption[] | null> {
  const response = await fetchWithAuth(`/api/qualification/pathways/${track}`);
  if (!response) return null;

  const payload = await response.json();
  if (Array.isArray(payload?.pathways)) {
    return payload.pathways as ApiPathwayOption[];
  }

  return [];
}

// Fetch user's certificates
export async function getUserCertificates(): Promise<Certificate[] | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const token = await supabase.auth.getSession();
    const response = await fetch('/api/qualification/certificates', {
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch certificates');

    return await response.json();
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return null;
  }
}

// Fetch user's progression history
export async function getProgressionHistory(): Promise<ProgressionHistory[] | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const token = await supabase.auth.getSession();
    const response = await fetch('/api/qualification/progression/history', {
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch progression history');

    return await response.json();
  } catch (error) {
    console.error('Error fetching progression history:', error);
    return null;
  }
}

// Submit course completion
export async function submitCourseCompletion(
  courseId: string,
  score: number,
  passed: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const token = await supabase.auth.getSession();
    const response = await fetch('/api/qualification/progression/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courseId, score, passed }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to submit completion' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting course completion:', error);
    return { success: false, error: 'Network error' };
  }
}

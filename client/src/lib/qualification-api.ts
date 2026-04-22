import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export interface TrackProgress {
  track: "ARBITRATION" | "MEDIATION";
  level: "NONE" | "STUDENT" | "ASSOCIATE" | "MEMBER" | "FELLOW";
  pathway?: "STANDARD" | "EXPEDITED" | "HYBRID";
  created_at: string;
  updated_at: string;
}

export interface QualificationState {
  arbitration: TrackProgress;
  mediation: TrackProgress;
  yearsAdrExperience: number;
  yearsLegalExperience: number;
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

export interface PathwayOption {
  type: "STANDARD" | "EXPEDITED";
  level: "ASSOCIATE" | "MEMBER" | "FELLOW";
  name: string;
  description: string;
  action: "enroll" | "apply";
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
export async function getQualificationState(): Promise<QualificationState | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const token = await supabase.auth.getSession();
    const response = await fetch('/api/qualification/state', {
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch qualification state');

    return await response.json();
  } catch (error) {
    console.error('Error fetching qualification state:', error);
    return null;
  }
}

// Fetch user's eligibility for each track
export async function getEligibility(): Promise<EligibilityResponse | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const token = await supabase.auth.getSession();
    const response = await fetch('/api/qualification/eligibility', {
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch eligibility');

    return await response.json();
  } catch (error) {
    console.error('Error fetching eligibility:', error);
    return null;
  }
}

// Fetch available pathways for a specific track
export async function getTrackPathways(track: "ARBITRATION" | "MEDIATION"): Promise<PathwayOption[] | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const token = await supabase.auth.getSession();
    const response = await fetch(`/api/qualification/pathways/${track}`, {
      headers: {
        'Authorization': `Bearer ${token.data.session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch pathways');

    return await response.json();
  } catch (error) {
    console.error('Error fetching pathways:', error);
    return null;
  }
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

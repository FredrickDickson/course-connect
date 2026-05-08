export interface LearnLesson {
  id: string;
  title: string;
  description: string | null;
  content_type: string | null;
  video_url: string | null;
  video_platform: string | null;
  video_id: string | null;
  duration_seconds: number | null;
  order: number | null;
  content?: string | null;
  is_preview?: boolean | null;
}
export interface LearnModule {
  id: string;
  title: string;
  order: number | null;
  lessons?: LearnLesson[];
}
export interface LearnCourse {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  track: string | null;
  thumbnail_url: string | null;
  instructor_id: string | null;
  modules?: LearnModule[];
}
export interface ProgressRow {
  lesson_id: string | null;
  completed: boolean | null;
  watch_time_seconds: number | null;
}
export const formatDuration = (s?: number | null) => {
  if (!s) return "0min";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm ? `${h}h ${rm}min` : `${h}h`;
};
export const formatTimeStamp = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};
export const levelToPostNominal = (level?: string | null, track?: string | null) => {
  const L = (level || "").toLowerCase(); const T = (track || "").toLowerCase();
  const suffix = T === "mediation" ? "CIMed" : "CIMArb";
  if (L === "associate") return `A${suffix}`;
  if (L === "member") return `M${suffix}`;
  if (L === "fellow") return `F${suffix}`;
  return level || "";
};

/**
 * CIMA Qualification Pathways
 * Shared constants and utilities for arbitration and mediation pathways
 */

export const PATHWAY_TYPES = {
  ARBITRATION: "arbitration",
  MEDIATION: "mediation"
} as const;

export type PathwayType = typeof PATHWAY_TYPES[keyof typeof PATHWAY_TYPES];

export const QUALIFICATION_LEVELS = ["associate", "member", "fellow"] as const;
export type QualificationLevel = typeof QUALIFICATION_LEVELS[number];

// Arbitration pathway configuration
export const ARBITRATION_PATHWAY = {
  name: "Arbitration",
  postNominals: {
    associate: "ACIMArb",
    member: "MCIMArb", 
    fellow: "FCIMArb"
  },
  labels: {
    associate: "Part I (Associate)",
    member: "Part II (Member)",
    fellow: "Part III (Fellow)"
  },
  colors: {
    primary: "#1e40af", // Blue
    secondary: "#3b82f6"
  }
} as const;

// Mediation pathway configuration
export const MEDIATION_PATHWAY = {
  name: "Mediation",
  postNominals: {
    associate: "ACIMed",
    member: "MCIMed",
    fellow: "FCIMed"
  },
  labels: {
    associate: "Part I (Associate)",
    member: "Part II (Member)",
    fellow: "Part III (Fellow)"
  },
  colors: {
    primary: "#059669", // Green
    secondary: "#10b981"
  }
} as const;

// Pathway configuration mapping
export const PATHWAY_CONFIG = {
  [PATHWAY_TYPES.ARBITRATION]: ARBITRATION_PATHWAY,
  [PATHWAY_TYPES.MEDIATION]: MEDIATION_PATHWAY
} as const;

// Utility functions
export function getPathwayConfig(pathway: PathwayType) {
  return PATHWAY_CONFIG[pathway];
}

export function getPostNominal(pathway: PathwayType, level: QualificationLevel) {
  return getPathwayConfig(pathway).postNominals[level];
}

export function getLevelLabel(pathway: PathwayType, level: QualificationLevel) {
  return getPathwayConfig(pathway).labels[level];
}

export function getPostNominalWithLevel(pathway: PathwayType, level: QualificationLevel) {
  const label = getLevelLabel(pathway, level);
  const postNominal = getPostNominal(pathway, level);
  return `${label} (${postNominal})`;
}

// Course pathway detection
export function isMediationCourse(course: {
  title?: string;
  category?: string;
  tags?: string[];
}): boolean {
  const title = course.title?.toLowerCase() || '';
  const category = course.category?.toLowerCase() || '';
  const tags = course.tags?.map(tag => tag.toLowerCase()) || [];

  return (
    title.includes('mediation') ||
    category.includes('mediation') ||
    tags.some(tag => tag.includes('mediation'))
  );
}

export function isArbitrationCourse(course: {
  title?: string;
  category?: string;
  tags?: string[];
}): boolean {
  const title = course.title?.toLowerCase() || '';
  const category = course.category?.toLowerCase() || '';
  const tags = course.tags?.map(tag => tag.toLowerCase()) || [];

  return (
    title.includes('arbitration') ||
    category.includes('arbitration') ||
    tags.some(tag => tag.includes('arbitration'))
  );
}

export function detectCoursePathway(course: {
  title?: string;
  category?: string;
  tags?: string[];
}): PathwayType {
  if (isMediationCourse(course)) {
    return PATHWAY_TYPES.MEDIATION;
  }
  return PATHWAY_TYPES.ARBITRATION; // Default to arbitration
}

// User pathway detection based on enrollments
export async function detectUserPathway(
  enrollments: Array<{
    courses?: {
      title?: string;
      category?: string;
      tags?: string[];
    };
  }>
): Promise<PathwayType> {
  if (!enrollments || enrollments.length === 0) {
    return PATHWAY_TYPES.ARBITRATION; // Default to arbitration
  }

  // Check if any enrolled course is mediation-focused
  const hasMediationCourse = enrollments.some(enrollment => {
    const course = enrollment.courses;
    return course && isMediationCourse(course);
  });

  return hasMediationCourse ? PATHWAY_TYPES.MEDIATION : PATHWAY_TYPES.ARBITRATION;
}

// Progress calculation
export function calculateProgress(level: QualificationLevel): number {
  const levelIndex = QUALIFICATION_LEVELS.indexOf(level);
  return ((levelIndex + 1) / QUALIFICATION_LEVELS.length) * 100;
}

export function getNextLevel(currentLevel: QualificationLevel): QualificationLevel | null {
  const currentIndex = QUALIFICATION_LEVELS.indexOf(currentLevel);
  const nextIndex = currentIndex + 1;
  
  return nextIndex < QUALIFICATION_LEVELS.length ? QUALIFICATION_LEVELS[nextIndex] : null;
}

// Validation
export function isValidPathway(pathway: string): pathway is PathwayType {
  return Object.values(PATHWAY_TYPES).includes(pathway as PathwayType);
}

export function isValidLevel(level: string): level is QualificationLevel {
  return QUALIFICATION_LEVELS.includes(level as QualificationLevel);
}


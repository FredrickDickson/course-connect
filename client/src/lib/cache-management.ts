// Cache management utilities for React Query

import { QueryClient, QueryKey } from "@tanstack/react-query";

export class CacheManager {
  private static instance: CacheManager;
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  static getInstance(queryClient?: QueryClient): CacheManager {
    if (!CacheManager.instance) {
      if (!queryClient) {
        throw new Error("QueryClient is required for first initialization");
      }
      CacheManager.instance = new CacheManager(queryClient);
    }
    return CacheManager.instance;
  }

  // Invalidate all user-related queries
  invalidateUserData(userId: string) {
    const patterns = [
      ["user-profile"],
      ["enrollments", userId],
      ["course-enrollments", userId],
      ["learn-progress", userId],
      ["certificates", userId],
      ["favorites", userId],
      ["user-dashboard-stats", userId],
      ["my-profile"],
    ];

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate course-related queries
  invalidateCourseData(courseId: string) {
    const patterns = [
      ["course", courseId],
      ["course-with-enrollment", courseId],
      ["courses"],
      ["course-catalog"],
      ["learn-progress", courseId],
      ["course-reviews", courseId],
    ];

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate enrollment-related queries
  invalidateEnrollmentData(userId?: string, courseId?: string) {
    const patterns = [
      ["enrollments"],
      ["course-enrollments"],
      ["user-dashboard-stats"],
    ];

    if (userId) {
      patterns.push(["enrollments", userId]);
      patterns.push(["course-enrollments", userId]);
    }

    if (courseId) {
      patterns.push(["course-enrollments", courseId]);
      patterns.push(["enrollments", courseId]);
    }

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate progress data
  invalidateProgressData(userId: string, courseId?: string) {
    const basePattern = ["learn-progress"];
    const patterns = [basePattern];

    if (userId && courseId) {
      patterns.push(["learn-progress", courseId, userId]);
    } else if (userId) {
      // Invalidate all progress for user
      this.queryClient.invalidateQueries({ 
        queryKey: basePattern,
        predicate: (query) => {
          const key = query.queryKey;
          return key.length >= 3 && key[0] === "learn-progress" && key[2] === userId;
        }
      });
      return;
    }

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate certificate data
  invalidateCertificateData(userId: string) {
    const patterns = [
      ["certificates", userId],
      ["certificates"],
      ["user-dashboard-stats", userId],
    ];

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate all dashboard-related queries
  invalidateDashboardData(userId: string) {
    const patterns = [
      ["user-dashboard-stats", userId],
      ["enrollments", userId],
      ["course-enrollments", userId],
      ["certificates", userId],
      ["favorites", userId],
    ];

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Invalidate all course catalog data
  invalidateCourseCatalog() {
    const patterns = [
      ["courses"],
      ["course-catalog"],
      ["categories"],
      ["instructors"],
    ];

    patterns.forEach(pattern => {
      this.queryClient.invalidateQueries({ queryKey: pattern });
    });
  }

  // Clear all cache (useful for logout)
  clearAllCache() {
    this.queryClient.clear();
  }

  // Remove specific query from cache
  removeQuery(queryKey: QueryKey) {
    this.queryClient.removeQueries({ queryKey });
  }

  // Prefetch data for better UX
  async prefetchCourseData(courseId: string) {
    await this.queryClient.prefetchQuery({
      queryKey: ["course", courseId],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  // Batch invalidate multiple related queries
  batchInvalidate(queries: Array<{ type: string; id?: string }>) {
    queries.forEach(({ type, id }) => {
      switch (type) {
        case "user":
          if (id) this.invalidateUserData(id);
          break;
        case "course":
          if (id) this.invalidateCourseData(id);
          break;
        case "enrollment":
          this.invalidateEnrollmentData();
          break;
        case "progress":
          if (id) this.invalidateProgressData(id);
          break;
        case "certificate":
          if (id) this.invalidateCertificateData(id);
          break;
        case "dashboard":
          if (id) this.invalidateDashboardData(id);
          break;
        case "catalog":
          this.invalidateCourseCatalog();
          break;
      }
    });
  }
}

// React hook for cache management
export function useCacheManager() {
  // This would typically get the queryClient from context
  // For now, we'll return a placeholder that needs to be initialized
  const getCacheManager = (queryClient: QueryClient) => {
    return CacheManager.getInstance(queryClient);
  };

  return {
    getCacheManager,
    // Convenience methods that can be used with a queryClient instance
    invalidateUserData: (queryClient: QueryClient, userId: string) => {
      return getCacheManager(queryClient).invalidateUserData(userId);
    },
    invalidateCourseData: (queryClient: QueryClient, courseId: string) => {
      return getCacheManager(queryClient).invalidateCourseData(courseId);
    },
    invalidateEnrollmentData: (queryClient: QueryClient, userId?: string, courseId?: string) => {
      return getCacheManager(queryClient).invalidateEnrollmentData(userId, courseId);
    },
    invalidateProgressData: (queryClient: QueryClient, userId: string, courseId?: string) => {
      return getCacheManager(queryClient).invalidateProgressData(userId, courseId);
    },
    invalidateCertificateData: (queryClient: QueryClient, userId: string) => {
      return getCacheManager(queryClient).invalidateCertificateData(userId);
    },
    invalidateDashboardData: (queryClient: QueryClient, userId: string) => {
      return getCacheManager(queryClient).invalidateDashboardData(userId);
    },
    invalidateCourseCatalog: (queryClient: QueryClient) => {
      return getCacheManager(queryClient).invalidateCourseCatalog();
    },
    clearAllCache: (queryClient: QueryClient) => {
      return getCacheManager(queryClient).clearAllCache();
    },
    batchInvalidate: (queryClient: QueryClient, queries: Array<{ type: string; id?: string }>) => {
      return getCacheManager(queryClient).batchInvalidate(queries);
    },
  };
}

// Cache invalidation presets for common actions
export const CacheInvalidationPresets = {
  // When user enrolls in a course
  onEnrollment: (userId: string, courseId: string) => [
    { type: "user", id: userId },
    { type: "course", id: courseId },
    { type: "enrollment" },
    { type: "dashboard", id: userId },
  ],

  // When user completes a lesson
  onLessonComplete: (userId: string, courseId: string) => [
    { type: "progress", id: userId },
    { type: "course", id: courseId },
    { type: "dashboard", id: userId },
  ],

  // When user completes a course
  onCourseComplete: (userId: string, courseId: string) => [
    { type: "progress", id: userId },
    { type: "certificate", id: userId },
    { type: "course", id: courseId },
    { type: "enrollment" },
    { type: "dashboard", id: userId },
  ],

  // When user updates profile
  onProfileUpdate: (userId: string) => [
    { type: "user", id: userId },
    { type: "dashboard", id: userId },
  ],

  // When course is updated (admin action)
  onCourseUpdate: (courseId: string) => [
    { type: "course", id: courseId },
    { type: "catalog" },
  ],
};

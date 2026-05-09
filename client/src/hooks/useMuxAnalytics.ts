import { useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AnalyticsEvent {
  lessonId: string;
  userId: string;
  event: 'play' | 'pause' | 'seek' | 'complete' | 'progress';
  timestamp: number;
  data?: {
    currentTime?: number;
    duration?: number;
    watchTime?: number;
  };
}

export function useMuxAnalytics(lessonId: string, userId: string) {
  const queryClient = useQueryClient();
  const startTimeRef = useRef<number>(0);
  const totalWatchTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());

  const sendAnalytics = useCallback(async (event: AnalyticsEvent['event'], data?: AnalyticsEvent['data']) => {
    try {
      await fetch('/api/analytics/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          userId,
          event,
          watchTimeSeconds: data?.watchTime || totalWatchTimeRef.current,
          completed: event === 'complete',
          currentTime: data?.currentTime,
          duration: data?.duration,
        }),
      });

      // Invalidate analytics queries
      queryClient.invalidateQueries({ queryKey: ['analytics', 'course'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'video', lessonId] });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  }, [lessonId, userId, queryClient]);

  const trackPlay = useCallback(() => {
    startTimeRef.current = Date.now();
    lastUpdateRef.current = Date.now();
    sendAnalytics('play');
  }, [sendAnalytics]);

  const trackPause = useCallback(() => {
    const now = Date.now();
    const sessionTime = (now - startTimeRef.current) / 1000;
    totalWatchTimeRef.current += Math.max(0, sessionTime);
    
    sendAnalytics('pause', {
      watchTime: totalWatchTimeRef.current,
    });
  }, [sendAnalytics]);

  const trackSeek = useCallback((currentTime: number) => {
    sendAnalytics('seek', { currentTime });
  }, [sendAnalytics]);

  const trackProgress = useCallback((currentTime: number, duration: number) => {
    const now = Date.now();
    
    // Update watch time every 10 seconds
    if (now - lastUpdateRef.current > 10000) {
      const sessionTime = (now - lastUpdateRef.current) / 1000;
      totalWatchTimeRef.current += sessionTime;
      lastUpdateRef.current = now;
      
      sendAnalytics('progress', {
        currentTime,
        duration,
        watchTime: totalWatchTimeRef.current,
      });
    }
  }, [sendAnalytics]);

  const trackComplete = useCallback((duration: number) => {
    const now = Date.now();
    const sessionTime = (now - startTimeRef.current) / 1000;
    totalWatchTimeRef.current += Math.max(0, sessionTime);
    
    sendAnalytics('complete', {
      duration,
      watchTime: totalWatchTimeRef.current,
    });
  }, [sendAnalytics]);

  const getTotalWatchTime = useCallback(() => {
    return totalWatchTimeRef.current;
  }, []);

  return {
    trackPlay,
    trackPause,
    trackSeek,
    trackProgress,
    trackComplete,
    getTotalWatchTime,
  };
}

export default useMuxAnalytics;

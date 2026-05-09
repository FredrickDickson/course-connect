"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Activity,
  AlertCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface CourseAnalytics {
  course: {
    id: string;
    totalMuxVideos: number;
    totalViews: number;
    completedLessons: number;
    totalWatchTime: number;
    averageWatchTime: number;
    completionRate: number;
  };
  lessons: Array<{
    id: string;
    title: string;
    muxPlaybackId: string;
    views: number;
    avgWatchTime: number;
  }>;
}

interface VideoAnalytics {
  lesson: {
    id: string;
    title: string;
    muxPlaybackId: string;
    muxAssetId: string;
  };
  analytics: any; // Mux insights data
}

function formatTime(seconds: number): string {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function MuxAnalyticsDashboard({ courseId }: { courseId: string }) {
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  const { data: courseAnalytics, isLoading: courseLoading } = useQuery<CourseAnalytics>({
    queryKey: ['analytics', 'course', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/course/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course analytics');
      return response.json();
    },
  });

  const { data: videoAnalytics, isLoading: videoLoading } = useQuery<VideoAnalytics>({
    queryKey: ['analytics', 'video', selectedLesson],
    queryFn: async () => {
      if (!selectedLesson) return null;
      const response = await fetch(`/api/analytics/video/${selectedLesson}`);
      if (!response.ok) throw new Error('Failed to fetch video analytics');
      return response.json();
    },
    enabled: !!selectedLesson,
  });

  if (courseLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const course = courseAnalytics?.course;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Video Analytics</h2>
          <p className="text-muted-foreground">Track engagement and performance of Mux videos</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{formatNumber(course?.totalViews || 0)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{course?.completionRate || 0}%</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Watch Time</p>
                <p className="text-2xl font-bold">{formatTime(course?.averageWatchTime || 0)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Watch Time</p>
                <p className="text-2xl font-bold">{formatTime(course?.totalWatchTime || 0)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lessons Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lesson Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courseAnalytics?.lessons?.map((lesson, index) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedLesson === lesson.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setSelectedLesson(
                  selectedLesson === lesson.id ? null : lesson.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{lesson.title}</h4>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {lesson.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(lesson.avgWatchTime)} avg
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min((lesson.views / (course?.totalViews || 1)) * 100, 100)} 
                    className="w-24" 
                  />
                </div>

                {/* Expanded Video Analytics */}
                <AnimatePresence>
                  {selectedLesson === lesson.id && videoAnalytics && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-4 pt-4 border-t border-border"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Mux Playback ID</p>
                          <p className="font-mono text-sm">{lesson.muxPlaybackId}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                      
                      {videoLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-muted-foreground">Detailed analytics from Mux Data will appear here.</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}

            {(!courseAnalytics?.lessons || courseAnalytics.lessons.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No Mux videos found for this course</p>
                <p className="text-sm">Upload Mux videos to see analytics</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MuxAnalyticsDashboard;

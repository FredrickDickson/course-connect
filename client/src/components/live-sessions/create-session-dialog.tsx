/**
 * Create Live Session Dialog
 * Form for instructors/admins to schedule new Zoom meetings
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']),
  scheduled_date: z.date({
    required_error: "Please select a date",
  }),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  scheduled_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  instructor_id: z.string().uuid().optional(),
  course_id: z.string().optional(),
  is_public: z.boolean().default(false),
  max_participants: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

const SESSION_TYPES = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'office_hours', label: 'Office Hours' },
  { value: 'q_a', label: 'Q&A Session' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'group_study', label: 'Group Study' },
];

interface CreateSessionDialogProps {
  courseId?: string;
  onSuccess?: () => void;
}

export default function CreateSessionDialog({ courseId, onSuccess }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user role
  const { data: currentUser } = useQuery({
    queryKey: ['current_user_role'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      
      return { role: userProfile?.role || 'student' };
    },
  });

  const isAdmin = currentUser?.role === 'admin';

  // Fetch instructors (only for admins)
  const { data: instructors = [], isLoading: instructorsLoading } = useQuery<any[]>({
    queryKey: ['instructors_list'],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_image_url')
        .eq('role', 'instructor')
        .order('first_name');
      
      if (error) {
        console.error('Error fetching instructors:', error);
        return [];
      }
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch ALL courses from platform (admin sees all, instructor sees their own)
  const { data: courses = [], isLoading: coursesLoading } = useQuery<any[]>({
    queryKey: ['all_courses_for_sessions'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      // Check if user is admin
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      
      let query = supabase
        .from('courses')
        .select('id, title, thumbnail_url')
        .order('title');
      
      // If not admin, only show instructor's courses
      if (userProfile?.role !== 'admin') {
        query = query.eq('instructor_id', userData.user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }
      return data || [];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      session_type: "lecture",
      scheduled_time: "10:00",
      scheduled_end_time: "12:00",
      instructor_id: undefined,
      course_id: courseId || undefined,
      is_public: false,
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Combine date and time into ISO string for start
      const [startHours, startMinutes] = data.scheduled_time.split(':').map(Number);
      const scheduled_start = new Date(data.scheduled_date);
      scheduled_start.setHours(startHours, startMinutes, 0, 0);
      
      // Combine date and time into ISO string for end
      const [endHours, endMinutes] = data.scheduled_end_time.split(':').map(Number);
      const scheduled_end = new Date(data.scheduled_date);
      scheduled_end.setHours(endHours, endMinutes, 0, 0);

      // If end time is before start time, add one day (crosses midnight)
      if (scheduled_end <= scheduled_start) {
        scheduled_end.setDate(scheduled_end.getDate() + 1);
      }

      const payload = {
        title: data.title,
        description: data.description,
        session_type: data.session_type,
        scheduled_start: scheduled_start.toISOString(),
        scheduled_end: scheduled_end.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(data.instructor_id ? { instructor_id: data.instructor_id } : {}),
        ...(data.course_id ? { course_id: data.course_id } : {}),
        is_public: data.is_public,
        max_participants: data.max_participants,
      };

      const response = await apiRequest('POST', '/api/sessions', payload);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Live session scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['live_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['instructor_sessions'] });
      setOpen(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createSessionMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#610000] hover:bg-[#7d0000]">
          <Video className="h-4 w-4" />
          Schedule Live Session
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-sf-pro-display text-[#2c2015]">
            Schedule Live Session
          </DialogTitle>
          <DialogDescription className="text-[#6b5d4f]">
            Create a Zoom meeting for your students. They'll receive reminders and can join directly from their dashboard.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#2c2015] font-semibold">Session Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Advanced Mediation Techniques" 
                      className="h-11 border-[#d4c5b0]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#2c2015] font-semibold">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What will be covered in this session?"
                      rows={3}
                      className="border-[#d4c5b0] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-[#6b5d4f]">
                    This will be shown to students when they view the session details
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={cn("grid gap-6", isAdmin ? "md:grid-cols-3" : "md:grid-cols-2")}>
              <FormField
                control={form.control}
                name="session_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#2c2015] font-semibold">Session Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 border-[#d4c5b0]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SESSION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isAdmin && (
                <FormField
                  control={form.control}
                  name="instructor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#2c2015] font-semibold">Instructor (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                        value={field.value || "none"}
                        disabled={instructorsLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-[#d4c5b0]">
                            <SelectValue placeholder={instructorsLoading ? "Loading instructors..." : "Select instructor"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-[#6b5d4f]">You (Admin)</span>
                          </SelectItem>
                          {instructors.map((instructor) => (
                            <SelectItem key={instructor.id} value={instructor.id}>
                              {instructor.first_name} {instructor.last_name}
                            </SelectItem>
                          ))}
                          {instructors.length === 0 && !instructorsLoading && (
                            <SelectItem value="empty" disabled>
                              No instructors available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs text-[#6b5d4f]">
                        Choose which instructor will be shown as the session host
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#2c2015] font-semibold">Link to Course (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                      value={field.value || "none"}
                      disabled={coursesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-[#d4c5b0]">
                          <SelectValue placeholder={coursesLoading ? "Loading courses..." : "Select course"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-[#6b5d4f]">No course (Standalone session)</span>
                        </SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                        {courses.length === 0 && !coursesLoading && (
                          <SelectItem value="empty" disabled>
                            No courses available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs text-[#6b5d4f]">
                      Only enrolled students can join if linked to a course
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#2c2015]">When is this session?</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-[#2c2015]">Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-11 pl-3 text-left font-normal border-[#d4c5b0] hover:bg-[#faf9f6]",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM dd, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#2c2015]">Start Time *</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="h-11 border-[#d4c5b0]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#2c2015]">End Time *</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="h-11 border-[#d4c5b0]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-[#6b5d4f]">
                        Duration calculated automatically
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 border-t border-[#d4c5b0] pt-6">
              <h3 className="text-sm font-semibold text-[#2c2015]">Additional Options</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-[#d4c5b0] p-4 bg-[#faf9f6]">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base text-[#2c2015]">Public Session</FormLabel>
                        <FormDescription className="text-xs">
                          Anyone can join without enrolling
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_participants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[#2c2015]">Max Participants</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Unlimited"
                          min="1"
                          max="1000"
                          className="h-11 border-[#d4c5b0]"
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : undefined)
                          }
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-[#6b5d4f]">
                        Leave blank for no limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#d4c5b0]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createSessionMutation.isPending}
                className="border-[#d4c5b0]"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSessionMutation.isPending}
                className="bg-[#610000] hover:bg-[#7d0000] gap-2"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4" />
                    Schedule Session
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

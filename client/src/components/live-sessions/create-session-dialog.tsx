/**
 * Create Live Session Dialog WITH Assignments & Resources
 * Form for instructors/admins to schedule new Zoom meetings with materials
 */

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Video, Loader2, FileText, Upload, X, Plus, File, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMON_TIMEZONES, zonedWallTimeToUtc } from "@shared/timezone";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(2000).optional(),
  session_type: z.enum(['lecture', 'workshop', 'office_hours', 'q_a', 'webinar', 'group_study']),
  scheduled_date: z.date({
    required_error: "Please select a date",
  }),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  scheduled_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  timezone: z.string().min(1, "Please select a time zone"),
  instructor_id: z.string().uuid().optional(),
  course_id: z.string().optional(),
  is_public: z.boolean().default(false),
  max_participants: z.number().optional(),
  recurrence_count: z.number().int().min(1).max(365).default(1),
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

interface Assignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  due_date: string;
  max_score: number;
  allow_late_submission: boolean;
}

interface Resource {
  id: string;
  title: string;
  file: File;
  file_name: string;
  file_size: number;
}

interface CreateSessionDialogProps {
  courseId?: string;
  existingSession?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
  onSuccess?: () => void;
}

export default function CreateSessionDialog({ 
  courseId, 
  existingSession,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  triggerButton,
  onSuccess 
}: CreateSessionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  const isEditMode = !!existingSession;

  // Materials state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

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
  const { data: instructors = [] } = useQuery<any[]>({
    queryKey: ['instructors_list'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'instructor')
        .order('first_name');
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch courses
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['all_courses_for_sessions'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userData.user.id)
        .single();
      
      let query = supabase
        .from('courses')
        .select('id, title')
        .order('title');
      
      if (userProfile?.role !== 'admin') {
        query = query.eq('instructor_id', userData.user.id);
      }
      
      const { data } = await query;
      return data || [];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: existingSession ? {
      title: existingSession.title,
      description: existingSession.description || "",
      session_type: existingSession.session_type,
      scheduled_date: new Date(existingSession.scheduled_start),
      scheduled_time: format(new Date(existingSession.scheduled_start), "HH:mm"),
      scheduled_end_time: format(new Date(existingSession.scheduled_end), "HH:mm"),
      timezone: existingSession.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      instructor_id: existingSession.instructor_id,
      course_id: existingSession.course_id || undefined,
      is_public: existingSession.is_public || false,
      max_participants: existingSession.max_participants || undefined,
      recurrence_count: 1,
    } : {
      title: "",
      description: "",
      session_type: "lecture",
      scheduled_time: "10:00",
      scheduled_end_time: "12:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      instructor_id: undefined,
      course_id: courseId || undefined,
      is_public: false,
      recurrence_count: 1,
    },
  });

  // Load existing assignments and resources in edit mode
  useEffect(() => {
    if (isEditMode && existingSession?.id && open) {
      loadExistingMaterials(existingSession.id);
    }
  }, [isEditMode, existingSession?.id, open]);

  const loadExistingMaterials = async (sessionId: string) => {
    try {
      // Load assignments
      const assignmentsRes = await apiRequest('GET', `/api/sessions/${sessionId}/assignments`);
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.map((a: any) => ({
          ...a,
          id: a.id || crypto.randomUUID(),
        })));
      }

      // Load resources (just show, files already uploaded)
      const resourcesRes = await apiRequest('GET', `/api/sessions/${sessionId}/resources`);
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        // Convert to display format (files already uploaded, so no File object)
        setResources(resourcesData.map((r: any) => ({
          id: r.id,
          title: r.title,
          file_name: r.file_name,
          file_size: r.file_size,
          file_url: r.file_url,
          // No file object since it's already uploaded
        })));
      }
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  // Assignment functions
  const addAssignment = () => {
    setAssignments([...assignments, {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      instructions: '',
      due_date: '',
      max_score: 100,
      allow_late_submission: true,
    }]);
  };

  const updateAssignment = (id: string, field: string, value: any) => {
    setAssignments(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const removeAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  // Resource functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setResources([...resources, {
      id: crypto.randomUUID(),
      title: file.name,
      file: file,
      file_name: file.name,
      file_size: file.size,
    }]);

    e.target.value = ''; // Reset input
  };

  const removeResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const createSessionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const scheduled_start = zonedWallTimeToUtc(data.scheduled_date, data.scheduled_time, data.timezone);
      let scheduled_end = zonedWallTimeToUtc(data.scheduled_date, data.scheduled_end_time, data.timezone);

      if (scheduled_end <= scheduled_start) {
        scheduled_end = new Date(scheduled_end.getTime() + 24 * 60 * 60000);
      }

      const payload = {
        title: data.title,
        ...(data.description ? { description: data.description } : {}),
        session_type: data.session_type,
        scheduled_start: scheduled_start.toISOString(),
        scheduled_end: scheduled_end.toISOString(),
        timezone: data.timezone,
        ...(data.instructor_id ? { instructor_id: data.instructor_id } : {}),
        ...(data.course_id ? { course_id: data.course_id } : {}),
        is_public: data.is_public,
        ...(data.max_participants ? { max_participants: data.max_participants } : {}),
        recurrence_count: data.recurrence_count,
      };

      const method = isEditMode ? 'PATCH' : 'POST';
      const url = isEditMode ? `/api/sessions/${existingSession.id}` : '/api/sessions';
      
      const response = await apiRequest(method, url, payload);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} session`);
      }

      const session = await response.json();

      // Now save assignments and resources
      const sessionIds = session.recurring_session_ids || [session.id];

      if (assignments.length > 0) {
        for (const assignment of assignments) {
          if (assignment.title && assignment.instructions) {
            for (const sessionId of sessionIds) {
              await apiRequest('POST', `/api/sessions/${sessionId}/assignments`, {
                title: assignment.title,
                description: assignment.description || '',
                instructions: assignment.instructions,
                due_date: assignment.due_date || null,
                max_score: assignment.max_score,
                allow_late_submission: assignment.allow_late_submission,
              });
            }
          }
        }
      }

      // Upload resources
      if (resources.length > 0) {
        for (const resource of resources) {
          if (resource.file) {
            for (const sessionId of sessionIds) {
            const formData = new FormData();
            formData.append('resource', resource.file);
            formData.append('title', resource.title);

            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const resourceResponse = await fetch(`/api/sessions/${sessionId}/resources`, {
              method: 'POST',
              body: formData,
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!resourceResponse.ok) {
              const errorBody = await resourceResponse.json().catch(() => null);
              throw new Error(errorBody?.message || 'Failed to upload resource');
            }
            }
          }
        }
      }

      return session;
    },
    onSuccess: (session: any) => {
      toast({
        title: "Success!",
        description: isEditMode
          ? "Live session updated successfully"
          : session.recurring_session_ids?.length > 1
            ? `${session.recurring_session_ids.length} daily live sessions scheduled successfully`
            : "Live session scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['live_sessions'] });
      queryClient.invalidateQueries({ queryKey: ['instructor_sessions'] });
      if (session.id) {
        queryClient.invalidateQueries({ queryKey: ['session', session.id] });
        queryClient.invalidateQueries({ queryKey: ['session_assignments', session.id] });
        queryClient.invalidateQueries({ queryKey: ['session_resources', session.id] });
      }
      setOpen(false);
      form.reset();
      setAssignments([]);
      setResources([]);
      setActiveTab("details");
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
      {triggerButton ? (
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="gap-2 bg-[#610000] hover:bg-[#7d0000]">
            <Video className="h-4 w-4" />
            Schedule Live Session
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-sf-pro-display text-[#2c2015]">
            {isEditMode ? 'Edit Live Session' : 'Schedule Live Session'}
          </DialogTitle>
          <DialogDescription className="text-[#6b5d4f]">
            {isEditMode 
              ? 'Update the session details, assignments, and resources.'
              : "Create a Zoom meeting with optional assignments and resources."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#faf9f6]">
            <TabsTrigger value="details">Session Details</TabsTrigger>
            <TabsTrigger value="assignments">
              Assignments
              {assignments.length > 0 && (
                <Badge className="ml-2 bg-[#610000]">{assignments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resources">
              Resources
              {resources.length > 0 && (
                <Badge className="ml-2 bg-[#610000]">{resources.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              {/* TAB 1: Session Details */}
              <TabsContent value="details" className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Advanced Mediation Techniques" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What will be covered?" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="session_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
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
                          <FormLabel>Instructor</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : v)} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">You (Admin)</SelectItem>
                              {instructors.map((i) => (
                                <SelectItem key={i.id} value={i.id}>
                                  {i.first_name} {i.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        <FormLabel>Link to Course</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : v)} value={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No course</SelectItem>
                            {courses.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recurrence_count"
                  render={({ field }) => (
                    <FormItem className="max-w-sm rounded-xl border border-[#d8cabb] bg-[#fffdf9] p-4">
                      <FormLabel>{isEditMode ? "Recurring session series" : "Repeat for how many days?"}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={field.value}
                          onChange={(event) => field.onChange(Number(event.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        {isEditMode
                          ? existingSession.recurrence_total_days
                            ? `This is day ${existingSession.recurrence_day_number} of a ${existingSession.recurrence_total_days}-day series. You can edit this occurrence while it is scheduled or live.`
                            : "Set this above 1 to keep this session as day 1 and add daily occurrences. Students register once for the full series."
                          : "One session is scheduled each day. Students register once for the full series."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn(!field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "MMM dd, yyyy") : "Pick date"}
                                <CalendarIcon className="ml-auto h-4 w-4" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            sideOffset={8}
                            className="w-auto overflow-hidden rounded-xl border-[#d8cabb] bg-[#fffdf9] p-0 shadow-xl"
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              className="p-4"
                              classNames={{
                                caption: "mb-2 flex items-center justify-center",
                                caption_label: "text-sm font-semibold text-[#2c2015]",
                                head_cell: "w-9 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-[#8b6f47]",
                                cell: "h-9 w-9 p-0 text-center",
                                day: "h-9 w-9 rounded-lg p-0 text-sm text-[#2c2015] transition-colors hover:bg-[#f2e7d8] focus-visible:ring-2 focus-visible:ring-[#610000]",
                                day_selected: "bg-[#610000] text-white hover:bg-[#7d0000] hover:text-white focus:bg-[#610000] focus:text-white",
                                day_today: "border border-[#610000] bg-transparent font-semibold text-[#610000]",
                                day_outside: "text-[#b9aa99] opacity-60",
                                day_disabled: "text-[#c7bbae] opacity-50",
                              }}
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
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
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
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMMON_TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="is_public"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Public Session</FormLabel>
                          <FormDescription className="text-xs">Anyone can join</FormDescription>
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
                        <FormLabel>Max Participants</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Unlimited"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* TAB 2: Assignments */}
              <TabsContent value="assignments" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Session Assignments</h3>
                    <p className="text-sm text-[#6b5d4f]">Add optional assignments for this session</p>
                  </div>
                  <Button type="button" onClick={addAssignment} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Assignment
                  </Button>
                </div>

                {assignments.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-[#8b6f47] opacity-50 mb-4" />
                      <p className="text-sm text-[#6b5d4f]">No assignments added yet</p>
                      <p className="text-xs text-[#8b6f47] mt-1">Click "Add Assignment" to create one</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment, index) => (
                      <Card key={assignment.id} className="border-[#d4c5b0]/30">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>Assignment {index + 1}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAssignment(assignment.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Assignment Title *</Label>
                            <Input
                              value={assignment.title}
                              onChange={(e) => updateAssignment(assignment.id, 'title', e.target.value)}
                              placeholder="e.g., Case Study Analysis"
                            />
                          </div>

                          <div>
                            <Label>Brief Description</Label>
                            <Input
                              value={assignment.description}
                              onChange={(e) => updateAssignment(assignment.id, 'description', e.target.value)}
                              placeholder="One-line summary"
                            />
                          </div>

                          <div>
                            <Label>Instructions *</Label>
                            <Textarea
                              value={assignment.instructions}
                              onChange={(e) => updateAssignment(assignment.id, 'instructions', e.target.value)}
                              placeholder="Detailed instructions for students"
                              rows={4}
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Due Date (Optional)</Label>
                              <Input
                                type="datetime-local"
                                value={assignment.due_date}
                                onChange={(e) => updateAssignment(assignment.id, 'due_date', e.target.value)}
                              />
                            </div>

                            <div>
                              <Label>Max Points</Label>
                              <Input
                                type="number"
                                value={assignment.max_score}
                                onChange={(e) => updateAssignment(assignment.id, 'max_score', Number(e.target.value))}
                                min="1"
                              />
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={assignment.allow_late_submission}
                              onCheckedChange={(checked) => updateAssignment(assignment.id, 'allow_late_submission', checked)}
                            />
                            <Label>Allow late submissions</Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: Resources */}
              <TabsContent value="resources" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Session Resources</h3>
                    <p className="text-sm text-[#6b5d4f]">Upload files for students to download</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="resource-upload"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
                    />
                    <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById('resource-upload')?.click()}>
                      <Upload className="h-4 w-4" />
                      Upload File
                    </Button>
                  </div>
                </div>

                {resources.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Upload className="h-12 w-12 text-[#8b6f47] opacity-50 mb-4" />
                      <p className="text-sm text-[#6b5d4f]">No resources uploaded yet</p>
                      <p className="text-xs text-[#8b6f47] mt-1">Click "Upload File" to add resources</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {resources.map((resource) => (
                      <Card key={resource.id} className="border-[#d4c5b0]/30">
                        <CardContent className="flex items-center gap-4 p-4">
                          <File className="h-10 w-10 text-[#610000] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Input
                              value={resource.title}
                              onChange={(e) => {
                                setResources(prev => prev.map(r => 
                                  r.id === resource.id ? { ...r, title: e.target.value } : r
                                ));
                              }}
                              placeholder="Resource title"
                              className="mb-2"
                            />
                            <div className="flex items-center gap-2 text-xs text-[#6b5d4f]">
                              <span className="truncate">{resource.file_name}</span>
                              <Badge variant="secondary">{formatFileSize(resource.file_size)}</Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeResource(resource.id)}
                            className="text-red-600 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-[#6b5d4f]">
                  {assignments.length > 0 && <span>{assignments.length} assignment(s)</span>}
                  {assignments.length > 0 && resources.length > 0 && <span> • </span>}
                  {resources.length > 0 && <span>{resources.length} resource(s)</span>}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={createSessionMutation.isPending}
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
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        {isEditMode ? 'Update Session' : 'Schedule Session'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

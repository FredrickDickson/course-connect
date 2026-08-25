import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shuffle, Plus, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sb: any = supabase;

interface RosterEntry {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  groupId: string | null;
  groupName: string | null;
}

interface Props {
  assignmentId: string;
  allowGroupMeetings: boolean;
}

// No cap on group count or roster size here -- auto-split accepts any N, and the
// roster list below renders however many enrolled students there are.
export function ManageGroupsPanel({ assignmentId, allowGroupMeetings }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [groupCount, setGroupCount] = useState("4");
  const [meetingGroupId, setMeetingGroupId] = useState<string>("");
  const [meetingStart, setMeetingStart] = useState("");
  const [meetingEnd, setMeetingEnd] = useState("");

  const { data: roster, isLoading } = useQuery<RosterEntry[]>({
    queryKey: ["assignment-roster", assignmentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/assignments-ext/assignments/${assignmentId}/roster`);
      return res.json();
    },
  });

  const { data: groups } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["assignment-groups", assignmentId],
    queryFn: async () => {
      const { data, error } = await sb.from("assignment_groups").select("id, name").eq("assignment_id", assignmentId).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: meetings } = useQuery<any[]>({
    queryKey: ["assignment-group-meetings", assignmentId],
    enabled: allowGroupMeetings,
    queryFn: async () => {
      const { data, error } = await sb
        .from("assignment_group_meetings")
        .select("*")
        .eq("assignment_id", assignmentId)
        .eq("status", "scheduled");
      if (error) throw error;
      return data || [];
    },
  });

  const autoSplit = useMutation({
    mutationFn: async () => {
      const n = Math.max(1, parseInt(groupCount, 10) || 1);
      const res = await apiRequest("POST", `/api/assignments-ext/assignments/${assignmentId}/groups/auto-split`, { groupCount: n });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment-roster", assignmentId] });
      qc.invalidateQueries({ queryKey: ["assignment-groups", assignmentId] });
      toast({ title: "Groups created" });
    },
    onError: (e: any) => toast({ title: "Failed to split into groups", description: e?.message, variant: "destructive" }),
  });

  const addGroup = useMutation({
    mutationFn: async () => {
      const name = `Group ${(groups?.length || 0) + 1}`;
      const { error } = await sb.from("assignment_groups").insert({ assignment_id: assignmentId, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignment-groups", assignmentId] }),
  });

  const assignToGroup = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string | null }) => {
      await sb.from("assignment_group_members").delete().eq("assignment_id", assignmentId).eq("user_id", userId);
      if (groupId) {
        const { error } = await sb.from("assignment_group_members").insert({ assignment_id: assignmentId, group_id: groupId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignment-roster", assignmentId] }),
    onError: (e: any) => toast({ title: "Failed to update group", description: e?.message, variant: "destructive" }),
  });

  const scheduleMeeting = useMutation({
    mutationFn: async () => {
      if (!meetingGroupId || !meetingStart || !meetingEnd) throw new Error("Pick a group and a start/end time");
      const res = await apiRequest("POST", `/api/assignments-ext/assignments/${assignmentId}/groups/${meetingGroupId}/meeting`, {
        scheduledStart: new Date(meetingStart).toISOString(),
        scheduledEnd: new Date(meetingEnd).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignment-group-meetings", assignmentId] });
      setMeetingGroupId("");
      setMeetingStart("");
      setMeetingEnd("");
      toast({ title: "Meeting scheduled" });
    },
    onError: (e: any) => toast({ title: "Failed to schedule meeting", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Split into groups</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input type="number" min={1} className="w-24" value={groupCount} onChange={(e) => setGroupCount(e.target.value)} />
          <Button size="sm" onClick={() => autoSplit.mutate()} disabled={autoSplit.isPending}>
            <Shuffle className="h-4 w-4 mr-1" />
            {autoSplit.isPending ? "Splitting..." : "Auto-split roster"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => addGroup.mutate()} disabled={addGroup.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Add empty group
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {roster?.length ?? 0} enrolled student(s), {groups?.length ?? 0} group(s)
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(roster || []).map((r) => (
            <div key={r.userId} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-sm">
              <div>
                <div className="font-medium">
                  {r.firstName} {r.lastName}
                </div>
                <div className="text-muted-foreground text-xs">
                  {r.email}
                  {(r.whatsapp || r.phone) && ` · WhatsApp: ${r.whatsapp || r.phone}`}
                </div>
              </div>
              <Select
                value={r.groupId ?? "__none__"}
                onValueChange={(v) => assignToGroup.mutate({ userId: r.userId, groupId: v === "__none__" ? null : v })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {(groups || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {(roster || []).length === 0 && <p className="text-sm text-muted-foreground">No enrolled students found.</p>}
        </CardContent>
      </Card>

      {allowGroupMeetings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Group meetings (Zoom)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={meetingGroupId} onValueChange={setMeetingGroupId}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  {(groups || []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="datetime-local" value={meetingStart} onChange={(e) => setMeetingStart(e.target.value)} />
              <Input type="datetime-local" value={meetingEnd} onChange={(e) => setMeetingEnd(e.target.value)} />
              <Button size="sm" onClick={() => scheduleMeeting.mutate()} disabled={scheduleMeeting.isPending}>
                <Video className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
            <div className="space-y-1">
              {(meetings || []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>
                    {(groups || []).find((g) => g.id === m.group_id)?.name || "Group"} — {new Date(m.scheduled_start).toLocaleString()}
                  </span>
                  <a href={m.zoom_start_url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">
                    Start URL
                  </a>
                </div>
              ))}
              {(meetings || []).length === 0 && <p className="text-xs text-muted-foreground">No meetings scheduled yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

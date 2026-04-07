/**
 * Admin Course Templates & Cohort System
 * Create reusable templates and spawn yearly editions with auto-generated cohort IDs
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Layers,
  CalendarPlus,
  BookOpen,
} from "lucide-react";

interface CourseTemplate {
  id: string;
  name: string;
  short_code: string;
  description: string | null;
  banner_image_url: string | null;
  duration_hours: number | null;
  format: string | null;
  default_capacity: number | null;
  default_ticket_types: any;
  default_price: number | null;
  default_currency: string | null;
  enquiry_phone_1: string | null;
  enquiry_phone_2: string | null;
  created_at: string;
}

interface TemplateForm {
  name: string;
  short_code: string;
  description: string;
  duration_hours: string;
  format: string;
  default_capacity: string;
  default_price: string;
  default_currency: string;
  enquiry_phone_1: string;
  enquiry_phone_2: string;
  ticket_types: { name: string; price: string }[];
}

const emptyForm: TemplateForm = {
  name: "",
  short_code: "",
  description: "",
  duration_hours: "",
  format: "hybrid",
  default_capacity: "30",
  default_price: "5500",
  default_currency: "GHS",
  enquiry_phone_1: "0536735535",
  enquiry_phone_2: "0241022964",
  ticket_types: [
    { name: "Associate", price: "5500" },
    { name: "Fellow", price: "8500" },
    { name: "Member", price: "7000" },
  ],
};

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return "SPR";
  if (month >= 6 && month <= 8) return "SUM";
  if (month >= 9 && month <= 11) return "AUT";
  return "WIN";
}

function generateCohortId(shortCode: string, year: number, month: number): string {
  return `${shortCode}-${year}-${getSeason(month)}`;
}

export default function AdminCourseTemplates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [showNewEdition, setShowNewEdition] = useState<CourseTemplate | null>(null);
  const [editionForm, setEditionForm] = useState({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    start_date: "",
    end_date: "",
    venue: "",
    capacity: "",
    title_override: "",
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["course-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("course_templates")
        .select("*")
        .order("short_code");
      if (error) throw error;
      return (data || []) as CourseTemplate[];
    },
  });

  // Fetch courses with template_id to show edition count
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-with-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, template_id, cohort_id, course_status, start_date, title");
      if (error) throw error;
      return data || [];
    },
  });

  // Save template
  const saveTemplate = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        name: form.name,
        short_code: form.short_code.toUpperCase(),
        description: form.description || null,
        duration_hours: form.duration_hours ? parseInt(form.duration_hours) : null,
        format: form.format,
        default_capacity: parseInt(form.default_capacity) || 30,
        default_price: parseFloat(form.default_price) || 0,
        default_currency: form.default_currency,
        enquiry_phone_1: form.enquiry_phone_1 || null,
        enquiry_phone_2: form.enquiry_phone_2 || null,
        default_ticket_types: form.ticket_types
          .filter((t) => t.name)
          .map((t) => ({ name: t.name, price: parseFloat(t.price) || 0 })),
      };

      if (isEdit && editingId) {
        const { error } = await (supabase as any)
          .from("course_templates")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("course_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-templates"] });
      toast({ title: editingId ? "Template updated" : "Template created" });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("course_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  // Spawn new edition
  const spawnEdition = useMutation({
    mutationFn: async (template: CourseTemplate) => {
      const year = parseInt(editionForm.year);
      const month = parseInt(editionForm.month);
      const cohortId = generateCohortId(template.short_code, year, month);

      // Check for duplicate cohort
      const { data: existing } = await (supabase as any)
        .from("courses")
        .select("id")
        .eq("cohort_id", cohortId)
        .maybeSingle();
      if (existing) throw new Error(`Cohort ${cohortId} already exists`);

      const ticketTypes = template.default_ticket_types || [];
      const title = editionForm.title_override || `${template.name} — ${cohortId}`;

      const { error } = await (supabase as any).from("courses").insert({
        title,
        description: template.description,
        thumbnail_url: template.banner_image_url,
        duration_hours: template.duration_hours,
        total_capacity: parseInt(editionForm.capacity) || template.default_capacity,
        price: template.default_price || 0,
        currency: template.default_currency || "GHS",
        ticket_types: ticketTypes,
        enquiry_phone_1: template.enquiry_phone_1,
        enquiry_phone_2: template.enquiry_phone_2,
        template_id: template.id,
        cohort_id: cohortId,
        course_status: "draft",
        start_date: editionForm.start_date || null,
        end_date: editionForm.end_date || null,
        venue: editionForm.venue || null,
        is_published: false,
        level: "professional",
      });
      if (error) throw error;
      return cohortId;
    },
    onSuccess: (cohortId) => {
      qc.invalidateQueries({ queryKey: ["courses-with-templates"] });
      qc.invalidateQueries({ queryKey: ["admin-courses-enhanced"] });
      toast({ title: "New edition created", description: `Cohort: ${cohortId}` });
      setShowNewEdition(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (t: CourseTemplate) => {
    setEditingId(t.id);
    const tickets = Array.isArray(t.default_ticket_types)
      ? t.default_ticket_types.map((tt: any) => ({
          name: tt.name || "",
          price: String(tt.price || 0),
        }))
      : emptyForm.ticket_types;
    setForm({
      name: t.name,
      short_code: t.short_code,
      description: t.description || "",
      duration_hours: t.duration_hours?.toString() || "",
      format: t.format || "hybrid",
      default_capacity: t.default_capacity?.toString() || "30",
      default_price: t.default_price?.toString() || "0",
      default_currency: t.default_currency || "GHS",
      enquiry_phone_1: t.enquiry_phone_1 || "",
      enquiry_phone_2: t.enquiry_phone_2 || "",
      ticket_types: tickets,
    });
    setShowForm(true);
  };

  const openNewEdition = (t: CourseTemplate) => {
    setEditionForm({
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString(),
      start_date: "",
      end_date: "",
      venue: "",
      capacity: t.default_capacity?.toString() || "30",
      title_override: "",
    });
    setShowNewEdition(t);
  };

  const editionsForTemplate = (templateId: string) =>
    courses.filter((c: any) => c.template_id === templateId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Templates</h2>
          <p className="text-sm text-muted-foreground">
            Reusable templates for recurring annual courses. Spawn new editions each year.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <Card className="animate-pulse">
          <CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent>
        </Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course template to get started.</p>
            <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const editions = editionsForTemplate(t.id);
            return (
              <Card key={t.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2 font-mono text-xs">
                        {t.short_code}
                      </Badge>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openNewEdition(t)}>
                          <CalendarPlus className="h-4 w-4 mr-2" /> New Edition
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(t)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Template
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (editions.length > 0) {
                              toast({
                                title: "Cannot delete",
                                description: "Template has existing editions. Remove them first.",
                                variant: "destructive",
                              });
                              return;
                            }
                            deleteTemplate.mutate(t.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">{t.format || "hybrid"}</Badge>
                    {t.duration_hours && (
                      <Badge variant="secondary">{t.duration_hours}h</Badge>
                    )}
                    <Badge variant="secondary">Cap: {t.default_capacity || "—"}</Badge>
                  </div>

                  {/* Ticket types preview */}
                  {Array.isArray(t.default_ticket_types) && t.default_ticket_types.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {t.default_ticket_types.map((tt: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{tt.name}</span>
                          <span className="font-mono">
                            {t.default_currency} {Number(tt.price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Editions list */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Editions ({editions.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => openNewEdition(t)}
                      >
                        <CalendarPlus className="h-3 w-3 mr-1" /> New
                      </Button>
                    </div>
                    {editions.length > 0 ? (
                      <div className="space-y-1">
                        {editions.slice(0, 4).map((e: any) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="font-mono">{e.cohort_id || "—"}</span>
                            <Badge
                              variant="outline"
                              className={
                                e.course_status === "live"
                                  ? "border-green-300 text-green-700"
                                  : e.course_status === "completed"
                                    ? "border-muted text-muted-foreground"
                                    : "border-blue-300 text-blue-700"
                              }
                            >
                              {e.course_status || "draft"}
                            </Badge>
                          </div>
                        ))}
                        {editions.length > 4 && (
                          <p className="text-xs text-muted-foreground">
                            +{editions.length - 4} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No editions yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Template" : "New Course Template"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Training I — Law, Practice & Procedure"
                />
              </div>
              <div>
                <Label>Short Code *</Label>
                <Input
                  value={form.short_code}
                  onChange={(e) => setForm((f) => ({ ...f, short_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. T1, T2, EXP-F"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used in cohort IDs: {form.short_code || "T1"}-2026-SPR
                </p>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Default course description..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  value={form.duration_hours}
                  onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))}
                />
              </div>
              <div>
                <Label>Default Capacity</Label>
                <Input
                  type="number"
                  value={form.default_capacity}
                  onChange={(e) => setForm((f) => ({ ...f, default_capacity: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Currency</Label>
                <Select value={form.default_currency} onValueChange={(v) => setForm((f) => ({ ...f, default_currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GHS">GHS</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default Price</Label>
                <Input
                  type="number"
                  value={form.default_price}
                  onChange={(e) => setForm((f) => ({ ...f, default_price: e.target.value }))}
                />
              </div>
            </div>

            {/* Ticket types */}
            <div>
              <Label>Default Ticket Types</Label>
              <div className="space-y-2 mt-1">
                {form.ticket_types.map((tt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={tt.name}
                      onChange={(e) => {
                        const updated = [...form.ticket_types];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setForm((f) => ({ ...f, ticket_types: updated }));
                      }}
                      placeholder="Ticket name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={tt.price}
                      onChange={(e) => {
                        const updated = [...form.ticket_types];
                        updated[i] = { ...updated[i], price: e.target.value };
                        setForm((f) => ({ ...f, ticket_types: updated }));
                      }}
                      placeholder="Price"
                      className="w-28"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          ticket_types: f.ticket_types.filter((_, idx) => idx !== i),
                        }));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      ticket_types: [...f.ticket_types, { name: "", price: "0" }],
                    }))
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Ticket Type
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Enquiry Phone 1</Label>
                <Input
                  value={form.enquiry_phone_1}
                  onChange={(e) => setForm((f) => ({ ...f, enquiry_phone_1: e.target.value }))}
                />
              </div>
              <div>
                <Label>Enquiry Phone 2</Label>
                <Input
                  value={form.enquiry_phone_2}
                  onChange={(e) => setForm((f) => ({ ...f, enquiry_phone_2: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              onClick={() => saveTemplate.mutate(!!editingId)}
              disabled={!form.name || !form.short_code || saveTemplate.isPending}
            >
              {saveTemplate.isPending ? "Saving..." : editingId ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Edition Dialog */}
      <Dialog open={!!showNewEdition} onOpenChange={() => setShowNewEdition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <CalendarPlus className="h-5 w-5 inline mr-2" />
              New Edition — {showNewEdition?.name}
            </DialogTitle>
          </DialogHeader>
          {showNewEdition && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="font-medium mb-1">Cohort ID Preview:</p>
                <p className="font-mono text-lg">
                  {generateCohortId(
                    showNewEdition.short_code,
                    parseInt(editionForm.year),
                    parseInt(editionForm.month)
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={editionForm.year}
                    onChange={(e) => setEditionForm((f) => ({ ...f, year: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Season Month</Label>
                  <Select
                    value={editionForm.month}
                    onValueChange={(v) => setEditionForm((f) => ({ ...f, month: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        { v: "1", l: "Jan (WIN)" }, { v: "2", l: "Feb (WIN)" },
                        { v: "3", l: "Mar (SPR)" }, { v: "4", l: "Apr (SPR)" },
                        { v: "5", l: "May (SPR)" }, { v: "6", l: "Jun (SUM)" },
                        { v: "7", l: "Jul (SUM)" }, { v: "8", l: "Aug (SUM)" },
                        { v: "9", l: "Sep (AUT)" }, { v: "10", l: "Oct (AUT)" },
                        { v: "11", l: "Nov (AUT)" }, { v: "12", l: "Dec (WIN)" },
                      ].map((m) => (
                        <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editionForm.start_date}
                    onChange={(e) => setEditionForm((f) => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editionForm.end_date}
                    onChange={(e) => setEditionForm((f) => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Venue / Zoom Link</Label>
                <Input
                  value={editionForm.venue}
                  onChange={(e) => setEditionForm((f) => ({ ...f, venue: e.target.value }))}
                  placeholder="e.g. CIMA HQ, Accra / Zoom"
                />
              </div>

              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={editionForm.capacity}
                  onChange={(e) => setEditionForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>

              <div>
                <Label>Title Override (optional)</Label>
                <Input
                  value={editionForm.title_override}
                  onChange={(e) => setEditionForm((f) => ({ ...f, title_override: e.target.value }))}
                  placeholder={`${showNewEdition.name} — ${generateCohortId(showNewEdition.short_code, parseInt(editionForm.year), parseInt(editionForm.month))}`}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use template name + cohort ID
                </p>
              </div>

              <div className="p-3 border rounded-lg text-xs space-y-1">
                <p className="font-medium">Pre-filled from template:</p>
                <p>Description, ticket types, pricing, enquiry contacts</p>
                <p>Status: <Badge variant="outline" className="text-xs">Draft</Badge> — publish when ready</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEdition(null)}>Cancel</Button>
            <Button
              onClick={() => showNewEdition && spawnEdition.mutate(showNewEdition)}
              disabled={spawnEdition.isPending}
            >
              {spawnEdition.isPending ? "Creating..." : "Create Edition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Personal Notes Forms Management Component
 * 
 * Admin interface to view, search, and export employee personal notes forms
 * Version: 1.0.1
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Download,
  Search,
  Eye,
  Calendar,
  User,
  Phone,
  MapPin,
  Heart,
  Shield,
  FileCheck,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PersonalNotesForm {
  id: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  age: number;
  nationality: string;
  hometown: string;
  region: string;
  languages_spoken: string[];
  ghana_card_no?: string;
  passport_no?: string;
  voter_id_no?: string;
  nhis_no?: string;
  tin?: string;
  street_area: string;
  town_city: string;
  gps_address?: string;
  nok_name: string;
  nok_relationship: string;
  nok_telephone: string;
  emergency_name: string;
  emergency_telephone: string;
  blood_group?: string;
  medical_conditions?: string[];
  submitted_at: string;
  reviewed_at?: string;
  review_notes?: string;
  [key: string]: any;
}

export default function PersonalNotesFormsManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForm, setSelectedForm] = useState<PersonalNotesForm | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch all forms
  const { data: formsData, isLoading } = useQuery({
    queryKey: ["personal-notes-forms"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/personal-notes-forms");
      if (!res.ok) throw new Error("Failed to fetch forms");
      return await res.json();
    },
  });

  const forms: PersonalNotesForm[] = formsData?.forms || [];

  // Filter forms based on search
  const filteredForms = forms.filter((form) => {
    const query = searchQuery.toLowerCase();
    return (
      form.full_name?.toLowerCase().includes(query) ||
      form.ghana_card_no?.toLowerCase().includes(query) ||
      form.nok_telephone?.includes(query) ||
      form.town_city?.toLowerCase().includes(query)
    );
  });

  // Add review notes
  const addReview = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PUT", `/api/personal-notes-forms/${id}/review`, {
        notes,
      });
      if (!res.ok) throw new Error("Failed to add review");
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-notes-forms"] });
      toast({ title: "Review Added", description: "Form review notes saved successfully" });
      setReviewNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete form
  const deleteForm = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/personal-notes-forms/${id}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Delete failed:", errorText);
        throw new Error("Failed to delete form");
      }
      // Check if response has content before parsing JSON
      const text = await res.text();
      return text ? JSON.parse(text) : { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal-notes-forms"] });
      toast({ 
        title: "Form Deleted", 
        description: "Form submission has been permanently deleted" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Delete Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  // Export to CSV
  const exportToCSV = () => {
    if (forms.length === 0) {
      toast({ title: "No Data", description: "No forms to export", variant: "destructive" });
      return;
    }

    const exportData = forms.map((form) => ({
      "Submission Date": format(new Date(form.submitted_at), "MMM dd, yyyy HH:mm"),
      "Full Name": form.full_name,
      "Gender": form.gender,
      "Date of Birth": form.date_of_birth,
      "Age": form.age,
      "Nationality": form.nationality,
      "Hometown": form.hometown,
      "Region": form.region,
      "Languages": form.languages_spoken?.join(", "),
      "Ghana Card": form.ghana_card_no || "",
      "Passport": form.passport_no || "",
      "Voter ID": form.voter_id_no || "",
      "NHIS": form.nhis_no || "",
      "TIN": form.tin || "",
      "Address": `${form.street_area}, ${form.town_city}`,
      "GPS Address": form.gps_address || "",
      "Next of Kin": form.nok_name,
      "NOK Relationship": form.nok_relationship,
      "NOK Phone": form.nok_telephone,
      "Emergency Contact": form.emergency_name,
      "Emergency Phone": form.emergency_telephone,
      "Blood Group": form.blood_group || "",
      "Medical Conditions": form.medical_conditions?.join(", ") || "",
      "Reviewed": form.reviewed_at ? "Yes" : "No",
      "Review Notes": form.review_notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personal Notes Forms");
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.min(maxWidth, Math.max(key.length, 10)),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `CIMA_Personal_Notes_Forms_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Export Successful",
      description: `${forms.length} forms exported to Excel`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[#610000] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#2c2015] font-sf-pro-display flex items-center gap-2 sm:gap-3">
            <img src="/uploads/logo.png" alt="CIMA Logo" className="h-6 sm:h-8 w-auto" />
            <span className="leading-tight">Personal Notes Forms</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6b5d4f] mt-1 font-sf-pro-text">
            Confidential employee information records
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="border-[#610000] text-[#610000] hover:bg-[#610000]/5 text-xs sm:text-sm"
            disabled={forms.length === 0}
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Export to Excel</span>
            <span className="xs:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-[#d4c5b0]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[#6b5d4f]">Total Submissions</p>
                <p className="text-2xl sm:text-3xl font-bold text-[#610000]">{forms.length}</p>
              </div>
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-[#610000]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d4c5b0]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[#6b5d4f]">Reviewed</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {forms.filter((f) => f.reviewed_at).length}
                </p>
              </div>
              <FileCheck className="w-8 h-8 sm:w-10 sm:h-10 text-green-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#d4c5b0]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-[#6b5d4f]">Pending Review</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {forms.filter((f) => !f.reviewed_at).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-[#d4c5b0]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6b5d4f]" />
            <Input
              placeholder="Search by name, ID, phone, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card className="border-[#d4c5b0]">
        <CardHeader>
          <CardTitle className="font-sf-pro-display">All Submissions</CardTitle>
          <CardDescription>
            {filteredForms.length} form{filteredForms.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-[#6b5d4f]/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#2c2015] mb-2">
                {searchQuery ? "No forms found" : "No submissions yet"}
              </h3>
              <p className="text-[#6b5d4f]">
                {searchQuery
                  ? "Try adjusting your search criteria"
                  : "Forms will appear here once employees submit their information"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="text-sm">
                        {format(new Date(form.submitted_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{form.full_name}</TableCell>
                      <TableCell className="capitalize">{form.gender}</TableCell>
                      <TableCell className="text-sm">
                        {form.town_city}, {form.region}
                      </TableCell>
                      <TableCell className="text-sm">{form.nok_telephone}</TableCell>
                      <TableCell>
                        {form.reviewed_at ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Reviewed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedForm(form)}
                                className="text-[#610000] hover:text-[#7d0000] hover:bg-[#610000]/5"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-4 sm:p-6">
                              <DialogHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div className="flex-1">
                                    <DialogTitle className="font-sf-pro-display flex items-center gap-2 text-base sm:text-lg">
                                      <img src="/uploads/logo.png" alt="CIMA" className="h-5 sm:h-6 w-auto" />
                                      <span className="line-clamp-1">Personal Notes - {form.full_name}</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs sm:text-sm">
                                      Confidential employee information record
                                    </DialogDescription>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm w-full sm:w-auto"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle className="text-base sm:text-lg">Delete Form Submission</AlertDialogTitle>
                                        <AlertDialogDescription className="text-xs sm:text-sm">
                                          Are you sure you want to permanently delete this form submission for <strong>{form.full_name}</strong>? 
                                          This action cannot be undone and all associated data will be removed.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                        <AlertDialogCancel className="m-0 w-full sm:w-auto">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteForm.mutate(form.id)}
                                          className="bg-red-600 hover:bg-red-700 m-0 w-full sm:w-auto"
                                        >
                                          {deleteForm.isPending ? "Deleting..." : "Delete Form"}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </DialogHeader>

                              <ScrollArea className="max-h-[calc(90vh-120px)] pr-2 sm:pr-4">
                                <div className="space-y-4 sm:space-y-6">
                                {/* Personal Details */}
                                <div>
                                  <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                    <User className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Personal Details
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Full Name</Label>
                                      <p className="font-medium">{form.full_name}</p>
                                    </div>
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Gender</Label>
                                      <p className="font-medium capitalize">{form.gender}</p>
                                    </div>
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Date of Birth</Label>
                                      <p className="font-medium">{form.date_of_birth} (Age: {form.age})</p>
                                    </div>
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Nationality</Label>
                                      <p className="font-medium">{form.nationality}</p>
                                    </div>
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Hometown</Label>
                                      <p className="font-medium">{form.hometown}</p>
                                    </div>
                                    <div>
                                      <Label className="text-[#6b5d4f] text-xs">Region</Label>
                                      <p className="font-medium">{form.region}</p>
                                    </div>
                                    <div className="col-span-1 sm:col-span-2">
                                      <Label className="text-[#6b5d4f] text-xs">Languages Spoken</Label>
                                      <p className="font-medium">{form.languages_spoken?.join(", ")}</p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Identification */}
                                <div>
                                  <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 text-sm sm:text-base">Identification</h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                    {form.ghana_card_no && (
                                      <div>
                                        <Label className="text-[#6b5d4f] text-xs">Ghana Card</Label>
                                        <p className="font-medium">{form.ghana_card_no}</p>
                                      </div>
                                    )}
                                    {form.passport_no && (
                                      <div>
                                        <Label className="text-[#6b5d4f] text-xs">Passport</Label>
                                        <p className="font-medium">{form.passport_no}</p>
                                      </div>
                                    )}
                                    {form.voter_id_no && (
                                      <div>
                                        <Label className="text-[#6b5d4f] text-xs">Voter ID</Label>
                                        <p className="font-medium">{form.voter_id_no}</p>
                                      </div>
                                    )}
                                    {form.nhis_no && (
                                      <div>
                                        <Label className="text-[#6b5d4f] text-xs">NHIS</Label>
                                        <p className="font-medium">{form.nhis_no}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Address */}
                                <div>
                                  <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Current Address
                                  </h3>
                                  <div className="text-xs sm:text-sm">
                                    <p className="font-medium">
                                      {form.house_no && `${form.house_no}, `}
                                      {form.street_area}
                                    </p>
                                    <p className="font-medium">{form.town_city}</p>
                                    {form.gps_address && (
                                      <p className="text-[#6b5d4f]">GPS: {form.gps_address}</p>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Emergency Contacts */}
                                <div>
                                  <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                    <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Emergency Contacts
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                    <div className="border-l-2 border-[#610000] pl-3">
                                      <Label className="text-[#6b5d4f] text-xs">Next of Kin</Label>
                                      <p className="font-medium">{form.nok_name}</p>
                                      <p className="text-[#6b5d4f]">{form.nok_relationship}</p>
                                      <p className="text-[#6b5d4f]">{form.nok_telephone}</p>
                                    </div>
                                    <div className="border-l-2 border-orange-500 pl-3">
                                      <Label className="text-[#6b5d4f] text-xs">Emergency Contact</Label>
                                      <p className="font-medium">{form.emergency_name}</p>
                                      <p className="text-[#6b5d4f]">{form.emergency_telephone}</p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Health Information */}
                                {(form.blood_group || (form.medical_conditions && form.medical_conditions.length > 0)) && (
                                  <>
                                    <div>
                                      <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
                                        <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                                        Health Information
                                      </h3>
                                      <div className="space-y-2 text-xs sm:text-sm">
                                        {form.blood_group && (
                                          <div>
                                            <Label className="text-[#6b5d4f] text-xs">Blood Group</Label>
                                            <p className="font-medium">{form.blood_group}</p>
                                          </div>
                                        )}
                                        {form.medical_conditions && form.medical_conditions.length > 0 && (
                                          <div>
                                            <Label className="text-[#6b5d4f] text-xs">Medical Conditions</Label>
                                            <p className="font-medium">{form.medical_conditions.join(", ")}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <Separator />
                                  </>
                                )}

                                {/* Review Section */}
                                <div className="bg-[#faf9f6] border border-[#d4c5b0] rounded-lg p-3 sm:p-4">
                                  <h3 className="font-semibold text-[#610000] mb-2 sm:mb-3 text-sm sm:text-base">Admin Review</h3>
                                  {form.reviewed_at ? (
                                    <div className="space-y-2 text-xs sm:text-sm">
                                      <div className="flex items-center gap-2 text-green-600">
                                        <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                                        <span>Reviewed on {format(new Date(form.reviewed_at), "MMM dd, yyyy HH:mm")}</span>
                                      </div>
                                      {form.review_notes && (
                                        <div>
                                          <Label className="text-[#6b5d4f] text-xs">Notes</Label>
                                          <p className="mt-1">{form.review_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <Textarea
                                        placeholder="Add review notes..."
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        rows={3}
                                        className="text-xs sm:text-sm"
                                      />
                                      <Button
                                        onClick={() => addReview.mutate({ id: form.id, notes: reviewNotes })}
                                        disabled={addReview.isPending || !reviewNotes.trim()}
                                        className="bg-[#610000] text-white hover:bg-[#7d0000] w-full sm:w-auto text-xs sm:text-sm"
                                      >
                                        {addReview.isPending ? "Saving..." : "Mark as Reviewed"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete form"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base sm:text-lg">Delete Form Submission</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                Are you sure you want to permanently delete the form submission for <strong>{form.full_name}</strong>? 
                                This action cannot be undone and all associated data will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="m-0 w-full sm:w-auto">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteForm.mutate(form.id)}
                                className="bg-red-600 hover:bg-red-700 m-0 w-full sm:w-auto"
                              >
                                {deleteForm.isPending ? "Deleting..." : "Delete Form"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-[#610000]/20 bg-[#610000]/5">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#610000] mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-[#2c2015]">
              <p className="font-semibold mb-1">Confidentiality Notice</p>
              <p className="text-[#6b5d4f]">
                All information displayed here is confidential and protected under Ghana's Data
                Protection Act, 2012 (Act 843). Access is restricted to authorized administrators only.
                Do not share this information without proper authorization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

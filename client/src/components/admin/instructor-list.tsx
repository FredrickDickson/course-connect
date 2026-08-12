/**
 * Instructor List Component
 * Shows all instructors with management actions for admins
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Edit,
  BookOpen,
  Users,
  Plus,
  Eye,
  Shield,
  CheckCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Instructor {
  id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  profile_image_url?: string;
  bio?: string;
  title?: string;
  is_verified?: boolean;
  course_count: number;
  total_students: number;
  created_at: string;
}

export default function InstructorList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddInstructor, setShowAddInstructor] = useState(false);
  const [newInstructor, setNewInstructor] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: instructorsData, isLoading } = useQuery({
    queryKey: ["admin-instructors", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "100");

      const res = await apiRequest("GET", `/api/admin/instructors?${params}`);
      return await res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const instructors = instructorsData?.instructors || [];

  const createInstructor = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/instructors", newInstructor);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create instructor");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-instructors"] });
      toast({ title: "Instructor created" });
      setNewInstructor({ firstName: "", lastName: "", email: "", password: "" });
      setShowAddInstructor(false);
    },
    onError: (e: Error) => {
      toast({ title: "Failed to create instructor", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2c2015]">Instructor Management</h2>
          <p className="text-sm text-[#6b5d4f] mt-1">
            Manage instructor profiles and create content on their behalf
          </p>
        </div>
        <Dialog open={showAddInstructor} onOpenChange={setShowAddInstructor}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#610000] to-[#8b0000] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Instructor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Instructor</DialogTitle>
              <DialogDescription>
                Creates an instructor account directly. They can sign in with the email and password below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="instFirstName">First Name</Label>
                  <Input
                    id="instFirstName"
                    value={newInstructor.firstName}
                    onChange={(e) => setNewInstructor((p) => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="instLastName">Last Name</Label>
                  <Input
                    id="instLastName"
                    value={newInstructor.lastName}
                    onChange={(e) => setNewInstructor((p) => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="instEmail">Email</Label>
                <Input
                  id="instEmail"
                  type="email"
                  value={newInstructor.email}
                  onChange={(e) => setNewInstructor((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="instPassword">Password</Label>
                <Input
                  id="instPassword"
                  type="password"
                  value={newInstructor.password}
                  onChange={(e) => setNewInstructor((p) => ({ ...p, password: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters.</p>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-[#610000] to-[#8b0000] text-white"
                disabled={
                  createInstructor.isPending ||
                  !newInstructor.firstName ||
                  !newInstructor.lastName ||
                  !newInstructor.email ||
                  newInstructor.password.length < 8
                }
                onClick={() => createInstructor.mutate()}
              >
                {createInstructor.isPending ? "Creating..." : "Create Instructor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search instructors by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructor Cards */}
      {!isLoading && instructors.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No instructors found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Add your first instructor to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && instructors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructors.map((instructor: Instructor) => (
            <Card 
              key={instructor.id} 
              className="hover:shadow-lg transition-all duration-300 border-2 border-[#d4c5b0]/20 hover:border-[#8b6f47]/30"
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-14 w-14 border-2 border-[#d4c5b0]">
                    <AvatarImage src={instructor.profile_image_url} />
                    <AvatarFallback className="bg-gradient-to-br from-[#610000] to-[#8b0000] text-white font-semibold">
                      {instructor.first_name[0]}
                      {instructor.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[#2c2015] truncate">
                        {instructor.first_name} {instructor.last_name}
                      </h3>
                      {instructor.is_verified && (
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-[#8b6f47] truncate">
                      {instructor.title || instructor.email}
                    </p>
                  </div>
                </div>

                {/* Bio Preview */}
                {instructor.bio && (
                  <p className="text-sm text-[#6b5d4f] line-clamp-2 mb-4">
                    {instructor.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between mb-4 p-3 bg-[#faf9f6] rounded-lg">
                  <div className="text-center flex-1">
                    <div className="text-xl font-bold text-[#610000]">
                      {instructor.course_count}
                    </div>
                    <div className="text-xs text-[#6b5d4f]">Courses</div>
                  </div>
                  <div className="w-px h-8 bg-[#d4c5b0]" />
                  <div className="text-center flex-1">
                    <div className="text-xl font-bold text-[#8b6f47]">
                      {instructor.total_students}
                    </div>
                    <div className="text-xs text-[#6b5d4f]">Students</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-[#d4c5b0] hover:bg-[#f5f3ed]"
                    asChild
                  >
                    <Link href={`/admin/instructors/${instructor.id}/profile`}>
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-[#d4c5b0] hover:bg-[#f5f3ed]"
                    asChild
                  >
                    <Link href={`/admin?tab=courses&instructor=${instructor.id}`}>
                      <BookOpen className="w-3 h-3 mr-1" />
                      Courses
                    </Link>
                  </Button>
                </div>

                {/* Quick Actions */}
                <div className="mt-3 pt-3 border-t border-[#d4c5b0]/30">
                  <Button 
                    size="sm" 
                    className="w-full bg-gradient-to-r from-[#610000] to-[#8b0000] text-white"
                    asChild
                  >
                    <Link href={`/admin/courses/new?instructorId=${instructor.id}`}>
                      <Plus className="w-3 h-3 mr-1" />
                      Create Course
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && instructors.length > 0 && (
        <Card className="bg-gradient-to-r from-[#faf9f6] to-white border-[#d4c5b0]/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6b5d4f]">
                Showing {instructors.length} instructor{instructors.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-4 text-xs text-[#8b6f47]">
                <span>
                  {instructors.reduce((sum: number, i: Instructor) => sum + i.course_count, 0)} total courses
                </span>
                <span>•</span>
                <span>
                  {instructors.reduce((sum: number, i: Instructor) => sum + i.total_students, 0)} total students
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

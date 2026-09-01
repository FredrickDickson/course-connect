/**
 * Instructor Selector Component
 * Dropdown for admins to select an instructor when creating content on their behalf
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Instructor {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
  is_verified?: boolean;
  course_count: number;
  total_students: number;
}

interface InstructorSelectorProps {
  value?: string;
  onChange: (instructorId: string, instructor?: Instructor) => void;
  label?: string;
  placeholder?: string;
}

export default function InstructorSelector({
  value,
  onChange,
  label = "Select Instructor",
  placeholder = "Choose an instructor...",
}: InstructorSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: instructors = [], isLoading } = useQuery<Instructor[]>({
    queryKey: ["admin-instructors", searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      params.append("limit", "100");
      
      const res = await apiRequest("GET", `/api/admin/instructors?${params}`);
      const data = await res.json();
      return data.instructors || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const selectedInstructor = instructors.find(i => i.id === value);

  const handleValueChange = (instructorId: string) => {
    const instructor = instructors.find(i => i.id === instructorId);
    onChange(instructorId, instructor);
  };

  return (
    <div className="space-y-2">
      <Label className="text-[#2c2015] font-semibold">{label}</Label>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-4 border border-[#d4c5b0]/30 rounded-lg bg-white">
          <Loader2 className="w-5 h-5 animate-spin text-[#5A2633]" />
          <span className="ml-2 text-sm text-[#6b5d4f]">Loading instructors...</span>
        </div>
      ) : (
        <>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b6f47]" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 border-[#d4c5b0]/50 focus:border-[#5A2633]"
            />
          </div>

          {/* Instructor Selector */}
          <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className="w-full border-[#d4c5b0]/50 focus:border-[#5A2633]">
              <SelectValue placeholder={placeholder}>
                {selectedInstructor && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={selectedInstructor.profile_image_url} />
                      <AvatarFallback className="text-xs bg-[#5A2633] text-white">
                        {selectedInstructor.first_name[0]}
                        {selectedInstructor.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[#2c2015]">
                      {selectedInstructor.first_name} {selectedInstructor.last_name}
                    </span>
                    {selectedInstructor.is_verified && (
                      <Badge variant="secondary" className="h-4 text-[10px] px-1 bg-[#5A2633]/10 text-[#5A2633]">
                        Verified
                      </Badge>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {instructors.length === 0 ? (
                <div className="p-4 text-center text-sm text-[#6b5d4f]">
                  {searchTerm ? `No instructors found matching "${searchTerm}"` : 'No instructors found'}
                </div>
              ) : (
                instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    <div className="flex items-center gap-3 py-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={instructor.profile_image_url} />
                        <AvatarFallback className="text-xs bg-[#5A2633] text-white">
                          {instructor.first_name[0]}
                          {instructor.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate text-[#2c2015]">
                            {instructor.first_name} {instructor.last_name}
                          </span>
                          {instructor.is_verified && (
                            <Badge variant="secondary" className="h-4 text-[10px] px-1 bg-[#5A2633]/10 text-[#5A2633]">
                              ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-[#6b5d4f] truncate">
                          {instructor.email}
                        </p>
                        <p className="text-xs text-[#8b6f47]">
                          {instructor.course_count} courses • {instructor.total_students} students
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          {/* Selected Instructor Info */}
          {selectedInstructor && (
            <div className="mt-2 p-3 bg-[#faf9f6] rounded-lg border border-[#d4c5b0]/30">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-[#d4c5b0]">
                  <AvatarImage src={selectedInstructor.profile_image_url} />
                  <AvatarFallback className="bg-[#5A2633] text-white">
                    {selectedInstructor.first_name[0]}
                    {selectedInstructor.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#2c2015]">
                      {selectedInstructor.first_name} {selectedInstructor.last_name}
                    </p>
                    {selectedInstructor.is_verified && (
                      <Badge variant="secondary" className="h-5 text-xs bg-[#5A2633] text-white">
                        Verified Instructor
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#6b5d4f]">{selectedInstructor.email}</p>
                  <div className="flex gap-4 mt-1 text-xs text-[#8b6f47]">
                    <span>{selectedInstructor.course_count} courses</span>
                    <span>•</span>
                    <span>{selectedInstructor.total_students} total students</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

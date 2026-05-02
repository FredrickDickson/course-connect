import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Compass, FolderOpen, GraduationCap } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PATHWAY_TYPES } from "../../../shared/pathways";

export default function ExploreDropdown() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      return data;
    },
  });

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 px-3">
          <Compass className="w-4 h-4 mr-2" />
          Explore
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Browse by</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Courses */}
        <DropdownMenuItem asChild>
          <Link
            href="/course-catalog"
            onClick={() => setOpen(false)}
            className="cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            All Courses
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Categories
        </DropdownMenuLabel>

        {/* Categories */}
        {categories.map((category: any) => (
          <DropdownMenuItem key={category.id} asChild>
            <Link
              href={`/course-catalog?category=${category.id}`}
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              {category.name}
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Pathways
        </DropdownMenuLabel>

        {/* Pathways */}
        <DropdownMenuItem asChild>
          <Link
            href="/course-catalog"
            onClick={() => setOpen(false)}
            className="cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            All Pathways
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/course-catalog"
            onClick={() => setOpen(false)}
            className="cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Arbitration (ACIMArb)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/course-catalog"
            onClick={() => setOpen(false)}
            className="cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Mediation (ACIMed)
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

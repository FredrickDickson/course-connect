import { useState } from "react";
import StudentSidebar from "@/components/student-sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

export default function StudentLayout({
  children,
  fullWidth = false,
  noPadding = false,
}: StudentLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-[#f5f3ed]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <StudentSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-[#faf9f6]">
          <StudentSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#d4c5b0]/30 bg-white">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="w-5 h-5 text-[#610000]" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <h1 className="text-lg font-bold text-[#610000] font-sf-pro-display">CIMA Learn</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* Page Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto bg-white",
            !noPadding && "p-6 lg:p-8"
          )}
        >
          <div className={cn(!fullWidth && "max-w-[1600px] mx-auto")}>{children}</div>
        </main>
      </div>
    </div>
  );
}

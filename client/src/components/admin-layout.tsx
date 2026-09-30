import { useState } from "react";
import AdminSidebar from "@/components/admin-sidebar";
import AdminTopNav from "@/components/admin-top-nav";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  noPadding?: boolean;
}

export default function AdminLayout({
  children,
  fullWidth = false,
  noPadding = false,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-[#f5f3ed] overflow-hidden">
      {/* Desktop Sidebar - Fixed position */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <AdminSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-[#faf9f6]">
          <AdminSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area - Takes remaining space with proper margin for sidebar */}
      <div 
        className={cn(
          "flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300",
          "lg:ml-[280px]", // Default sidebar width
          sidebarCollapsed && "lg:ml-[80px]" // Collapsed sidebar width
        )}
      >
        {/* Top Navbar - Scrolls with content */}
        <div className="flex-shrink-0">
          <AdminTopNav onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </div>

        {/* Page Content - Scrollable area */}
        <main
          className={cn(
            "flex-1 bg-white overflow-y-auto overflow-x-hidden",
            !noPadding && "p-4 sm:p-6 lg:p-8"
          )}
        >
          <div className={cn(!fullWidth && "max-w-[1600px] mx-auto w-full")}>{children}</div>
        </main>
      </div>
    </div>
  );
}

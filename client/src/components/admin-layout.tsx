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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f5f3ed]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block sticky top-0 self-start h-screen">
        <AdminSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-[#faf9f6]">
          <AdminSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <AdminTopNav onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Page Content */}
        <main
          className={cn(
            "flex-1 bg-white",
            !noPadding && "p-6 lg:p-8"
          )}
        >
          <div className={cn(!fullWidth && "max-w-[1600px] mx-auto")}>{children}</div>
        </main>
      </div>
    </div>
  );
}

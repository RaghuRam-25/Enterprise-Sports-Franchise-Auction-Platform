import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-dvh flex flex-col bg-darkBg text-primaryText font-sans antialiased overflow-hidden">
      {/* Top Navbar (hamburger shown only on small screens) */}
      <Navbar onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        {/* Left Sidebar — desktop: in-flow; mobile: slide-in overlay drawer */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          mobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Mobile overlay backdrop behind the drawer */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Main Content View Container */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-darkBg p-4 md:p-6">
          {/* key on pathname → content fades up on every route change */}
          <div key={location.pathname} className="ui-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

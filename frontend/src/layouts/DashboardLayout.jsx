import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

// Routes whose page is a true full-screen dashboard: they fill the viewport
// exactly (100dvh chain) and NEVER scroll as a page — their internal sections
// scroll instead. Every other route keeps classic document scrolling.
const FULL_FIT_ROUTES = new Set([
  '/manager/dashboard',
  '/manager/budget',
  '/manager/history',
  '/manager/podium',
  '/manager/bid-center',
  '/podium/dashboard',
  '/podium/unsold',
  '/podium/launchpad',
  '/podium/control-deck',
  '/podium/history',
  '/podium/monitor',
  '/podium/settings',
  '/player/live',
]);

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const isFullFit = FULL_FIT_ROUTES.has(location.pathname);

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

        {/* Main Content View Container — full-fit routes become a fixed-height
            flex column (no page scroll); others keep document scrolling. */}
        <main
          className={`flex-1 min-w-0 bg-darkBg ${
            isFullFit
              ? 'flex flex-col overflow-hidden p-3 sm:p-4 lg:p-5'
              : 'overflow-y-auto p-4 md:p-6'
          }`}
        >
          {/* key on pathname → content fades up on every route change */}
          <div
            key={location.pathname}
            className={`ui-fade-up ${isFullFit ? 'flex-1 min-h-0 flex flex-col' : ''}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

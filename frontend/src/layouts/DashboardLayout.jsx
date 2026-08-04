import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main Content View Container */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-950 p-4 md:p-6">
          {/* key on pathname → content fades up on every route change */}
          <div key={location.pathname} className="ui-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

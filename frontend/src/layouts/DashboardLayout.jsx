import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Breadcrumb from '../components/Breadcrumb';

export default function DashboardLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden">
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
        <main className="flex-1 min-w-0 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div>
            <Breadcrumb />
            <Outlet />
          </div>

          <footer className="mt-8 pt-4 border-t border-slate-900 text-center text-xs text-slate-500 font-medium">
            Enterprise Sports Franchise Auction Platform &copy; {new Date().getFullYear()} — Powered by High-Performance Event Architecture
          </footer>
        </main>
      </div>
    </div>
  );
}

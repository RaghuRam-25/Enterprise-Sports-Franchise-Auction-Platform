import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Sliders, ShieldCheck, Users, User, UserCheck, Database, Eye, BarChart3, Gavel } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user } = useAuth();

  const adminNavItems = [
    { path: '/admin/dashboard', label: 'System Overview', icon: LayoutDashboard },
    { path: '/podium/dashboard', label: 'Podium Control Room', icon: Gavel, tag: 'LIVE' },
    { path: '/admin/configurations/sessions', label: 'Dynamic Enums', icon: Sliders },
    { path: '/admin/teams', label: 'Franchise Teams', icon: ShieldCheck },
    { path: '/admin/managers', label: 'Podium & Manager Creds', icon: Users },
    { path: '/admin/players', label: 'Player Management', icon: UserCheck },
    { path: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-darkBg text-slate-100">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="glass-card rounded-2xl p-4 sticky top-24 space-y-6 border border-slate-800">
            <div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                <Database className="w-4 h-4" /> Admin & Registry
              </div>
              <h2 className="px-3 text-lg font-extrabold text-white">Event Architect</h2>
            </div>

            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.tag && (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">
                        {item.tag}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">Role Authority Level</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Scope:</span>
                  <span className="text-blue-400 font-semibold">Super Admin</span>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>

      </div>
    </div>
  );
}

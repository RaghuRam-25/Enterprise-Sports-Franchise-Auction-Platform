import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sliders,
  ShieldCheck,
  Users,
  UserCheck,
  BarChart3,
  Gavel,
  Radio,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  List,
  Rocket,
  SlidersHorizontal,
  History,
  UserX,
  UserCheck2,
  ShieldAlert,
  Coins,
  Activity,
  DollarSign,
  User,
  Award,
  ChevronLeft,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Expanded submenus state
  const [openSubmenus, setOpenSubmenus] = useState({
    configurations: true,
    podiumControl: true,
    playerStatus: false,
    teamStatus: false,
  });

  const toggleSubmenu = (key) => {
    setOpenSubmenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const role = user.role;

  // ── SUPER ADMIN NAV CONFIG ──────────────────────────────────────────────
  const superAdminNav = [
    { type: 'item', path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      type: 'group',
      key: 'configurations',
      label: 'Configurations',
      icon: Sliders,
      children: [
        { path: '/admin/configurations/sessions', label: 'Sessions' },
        { path: '/admin/configurations/positions', label: 'Positions' },
        { path: '/admin/configurations/categories', label: 'Categories' },
        { path: '/admin/configurations/bidding-tiers', label: 'Bidding Tiers' },
      ],
    },
    { type: 'item', path: '/podium/dashboard', label: 'Podium Control', icon: ShieldCheck },
    { type: 'item', path: '/admin/teams', label: 'Teams', icon: ShieldCheck },
    { type: 'item', path: '/admin/managers', label: 'Managers', icon: Users },
    { type: 'item', path: '/admin/players', label: 'Players', icon: UserCheck },
    { type: 'item', path: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { type: 'item', path: '/live', label: 'Live Auction', icon: Radio, highlight: true },
    { type: 'item', path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  // ── PODIUM ADMIN NAV CONFIG ─────────────────────────────────────────────
  const podiumAdminNav = [
    { type: 'item', path: '/podium/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/podium/teams/bought', label: 'Team Purchases', icon: ShieldCheck },
    { type: 'item', path: '/podium/settings', label: 'Settings', icon: Settings },
  ];

  // ── TEAM MANAGER NAV CONFIG ─────────────────────────────────────────────
  const teamManagerNav = [
    { type: 'item', path: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/manager/roster', label: 'Roster', icon: Users },
    { type: 'item', path: '/manager/my-team', label: 'My Team', icon: ShieldCheck },
    { type: 'item', path: '/manager/history', label: 'Auction History', icon: History },
    { type: 'item', path: '/manager/settings', label: 'Settings', icon: Settings },
    { type: 'item', path: '/live', label: 'Live Podium', icon: Radio, highlight: true },
  ];

  // ── PLAYER NAV CONFIG ───────────────────────────────────────────────────
  const playerNav = [
    { type: 'item', path: '/player/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/teams', label: 'Teams', icon: ShieldCheck },
    { type: 'item', path: '/live', label: 'Live Auction', icon: Radio, highlight: true },
    { type: 'item', path: '/player/results', label: 'Results', icon: Award },
    { type: 'item', path: '/player/settings', label: 'Settings', icon: Settings },
  ];

  let currentNavConfig = [];
  let roleTitle = 'Platform User';
  let roleBadgeColor = 'bg-slate-800 text-slate-300';

  if (role === 'SUPER_ADMIN') {
    currentNavConfig = superAdminNav;
    roleTitle = 'Super Admin';
    roleBadgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  } else if (role === 'PODIUM_ADMIN') {
    currentNavConfig = podiumAdminNav;
    roleTitle = 'Podium Admin';
    roleBadgeColor = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  } else if (role === 'TEAM_MANAGER') {
    currentNavConfig = teamManagerNav;
    roleTitle = 'Team Manager';
    roleBadgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (role === 'PLAYER') {
    currentNavConfig = playerNav;
    roleTitle = 'Player Portal';
    roleBadgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }

  return (
    <aside
      className={`relative h-full flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 z-30 select-none ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4 text-blue-400" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-extrabold text-white leading-none">Enterprise</h2>
              <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">
                {roleTitle}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mx-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {currentNavConfig.map((item, index) => {
          if (item.type === 'item') {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition group relative ${isActive
                    ? item.highlight
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-900/20'
                      : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${item.highlight ? 'text-emerald-400 animate-pulse' : ''
                    }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-xs font-semibold rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            );
          }

          if (item.type === 'group') {
            const Icon = item.icon;
            const isOpen = openSubmenus[item.key];

            return (
              <div key={item.key} className="space-y-1">
                <button
                  onClick={() => !isCollapsed && toggleSubmenu(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 group relative`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-slate-200 text-xs font-semibold rounded-md shadow-xl border border-slate-800 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </button>

                {!isCollapsed && isOpen && (
                  <div className="pl-7 pr-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-2 rounded-lg text-xs font-medium transition ${isActive
                            ? 'bg-blue-600/20 text-blue-400 font-semibold border-l-2 border-blue-500'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Sidebar Footer User Info & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                {user.name?.[0] || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-200 truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border uppercase ${roleBadgeColor}`}>
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}

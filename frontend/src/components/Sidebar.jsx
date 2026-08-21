import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sliders,
  ShieldCheck,
  Users,
  UserCheck,
  Radio,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Award,
  ChevronLeft,
  Crown,
  Calendar,
  Video,
  Trophy,
  ClipboardList,
  X,
  Volleyball,
  ListOrdered,
  Bell,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isCollapsed, setIsCollapsed, mobileOpen = false, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Expanded submenus state
  const [openSubmenus, setOpenSubmenus] = useState({
    configurations: true,
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
    { type: 'item', path: '/admin/teams', label: 'Team Management', icon: ShieldCheck },
    { type: 'item', path: '/admin/players', label: 'Players', icon: UserCheck },
    { type: 'item', path: '/admin/fixtures', label: 'Fixtures & Scheduling', icon: Calendar },
    { type: 'item', path: '/admin/match-results', label: 'Match Results', icon: Trophy },
    { type: 'item', path: '/admin/requests', label: 'Manager Requests', icon: ClipboardList }
  ];

  // ── PODIUM ADMIN NAV CONFIG ─────────────────────────────────────────────
  const podiumAdminNav = [
    { type: 'item', path: '/podium/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/podium/video-control', label: 'Video Control', icon: Video },
  ];

  // ── TEAM MANAGER NAV CONFIG ─────────────────────────────────────────────
  const teamManagerNav = [
    { type: 'item', path: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/manager/target-players', label: 'Target Players', icon: Crown, highlight: true },
    { type: 'item', path: '/manager/my-team', label: 'My Team', icon: ShieldCheck },
    { type: 'item', path: '/manager/matches', label: 'Tournament', icon: Trophy },
    { type: 'item', path: '/manager/settings', label: 'Team Settings', icon: Settings },
    { type: 'item', path: '/manager/teams', label: 'All Teams', icon: ShieldCheck }
  ];

  // ── PLAYER NAV CONFIG ───────────────────────────────────────────────────
  const playerNav = [
    { type: 'item', path: '/player/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/player/live', label: 'Live Auction', icon: Radio, highlight: true },
    { type: 'item', path: '/player/my-team', label: 'My Team', icon: Users },
    { type: 'item', path: '/player/teams', label: 'All Teams', icon: ShieldCheck },
    { type: 'item', path: '/player/matches', label: 'Tournament', icon: Trophy },
    { type: 'item', path: '/player/results', label: 'Results', icon: Award },
    { type: 'item', path: '/player/settings', label: 'Settings', icon: Settings }
  ];

  // ── GENERAL USER (Spectator / Fan) NAV CONFIG ───────────────────────────
  const generalUserNav = [
    { type: 'header', label: 'Main' },
    { type: 'item', path: '/general/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'item', path: '/general/live', label: 'Live Auction', icon: Radio, highlight: true },
    { type: 'item', path: '/general/matches', label: 'Tournament', icon: Trophy },
    { type: 'item', path: '/general/teams', label: 'Teams', icon: ShieldCheck },
    { type: 'header', label: 'Account' },
    { type: 'item', path: '/general/profile', label: 'My Profile', icon: User },
    { type: 'item', path: '/general/notifications', label: 'Notifications', icon: Bell },
    { type: 'item', path: '/general/settings', label: 'Settings', icon: Settings }
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
  } else if (role === 'GENERAL_USER') {
    currentNavConfig = generalUserNav;
    roleTitle = 'Fan Zone';
    roleBadgeColor = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  }

  // Mobile nav builds a linear list (groups flattened so children are reachable
  // without hover) — the same items as desktop, so mobile shows the same links.
  const mobileNav = [];
  currentNavConfig.forEach((item) => {
    if (item.type === 'item') {
      mobileNav.push(item);
    } else if (item.type === 'group') {
      item.children.forEach((child) => {
        mobileNav.push({ type: 'item', path: child.path, label: child.label, icon: item.icon });
      });
    }
  });

  return (
    <>
      {/* Desktop: always visible on lg+ */}
      <aside
        className={`hidden lg:flex relative h-full flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 z-30 select-none ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <SidebarBody
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          currentNavConfig={currentNavConfig}
          roleTitle={roleTitle}
          roleBadgeColor={roleBadgeColor}
          user={user}
          onLogout={handleLogout}
          openSubmenus={openSubmenus}
          toggleSubmenu={toggleSubmenu}
          isMobile={false}
          onCloseMobile={onCloseMobile}
        />
      </aside>

      {/* Mobile: slide-in overlay drawer */}
      <aside
        className={`fixed lg:hidden top-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 shadow-2xl transition-transform duration-300 select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarBody
          isCollapsed={false}
          setIsCollapsed={setIsCollapsed}
          currentNavConfig={mobileNav}
          roleTitle={roleTitle}
          roleBadgeColor={roleBadgeColor}
          user={user}
          onLogout={handleLogout}
          openSubmenus={openSubmenus}
          toggleSubmenu={toggleSubmenu}
          isMobile={true}
          onCloseMobile={onCloseMobile}
        />
      </aside>
    </>
  );
}

/* Shared sidebar body — reused by both desktop rail and mobile drawer. */
function SidebarBody({
  isCollapsed,
  setIsCollapsed,
  currentNavConfig,
  roleBadgeColor,
  user,
  onLogout,
  openSubmenus,
  toggleSubmenu,
  isMobile,
  onCloseMobile,
}) {
  return (
    <>
      {/* Sidebar Navigation Items — Starts at the very top */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        {isMobile && (
          <div className="flex items-center justify-end pb-2 mb-2 border-b border-slate-800">
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ui-focus"
              title="Close Sidebar"
              aria-label="Close Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {currentNavConfig.map((item) => {
          if (item.type === 'header') {
            if (isCollapsed) return null;
            return (
              <p key={`header-${item.label}`} className="px-3 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 select-none">
                {item.label}
              </p>
            );
          }

          if (item.type === 'item') {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition group relative ${isActive
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 group relative`}
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
                </button>

                {!isCollapsed && isOpen && (
                  <div className="pl-7 pr-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive
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

      {/* Sidebar Footer User Info, Logout & Collapse Toggle */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex-shrink-0">
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
            <div className="flex items-center gap-1">
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition ui-focus"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ui-focus"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onLogout}
              className="w-full flex justify-center py-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex justify-center py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Expand Sidebar"
              aria-label="Expand Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
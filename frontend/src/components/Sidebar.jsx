import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LayoutGrid,
  Sliders,
  ShieldCheck,
  Users,
  UserCheck,
  Radio,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
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
  let roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';

  if (role === 'SUPER_ADMIN') {
    currentNavConfig = superAdminNav;
    roleTitle = 'Super Admin';
    roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';
  } else if (role === 'PODIUM_ADMIN') {
    currentNavConfig = podiumAdminNav;
    roleTitle = 'Podium Admin';
    roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';
  } else if (role === 'TEAM_MANAGER') {
    currentNavConfig = teamManagerNav;
    roleTitle = 'Team Manager';
    roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';
  } else if (role === 'PLAYER') {
    currentNavConfig = playerNav;
    roleTitle = 'Player Portal';
    roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';
  } else if (role === 'GENERAL_USER') {
    currentNavConfig = generalUserNav;
    roleTitle = 'Fan Zone';
    roleBadgeColor = 'bg-[#0B2B26] text-white border-[#222222]';
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
      {/* Desktop: always visible on md+ */}
      <aside
        className={`hidden md:flex relative h-full flex-col bg-[#0B0B0B] border-r border-[#222222] transition-all duration-300 z-30 select-none ${isCollapsed ? 'w-20' : 'w-64'
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
        className={`fixed md:hidden top-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-[#0B0B0B] border-r border-[#222222] shadow-2xl transition-transform duration-300 select-none ${
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
          <div className="flex items-center justify-end pb-2 mb-2 border-b border-[#222222]">
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] transition ui-focus"
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
              <p key={`header-${item.label}`} className="px-3 pt-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-[#666666] select-none">
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
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition group relative ${isActive
                    ? 'bg-[#0B2B26] text-white border border-[#0B2B26]/40 shadow-sm'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : item.highlight ? 'text-white animate-pulse' : 'text-[#A3A3A3]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#101010] text-[#F5F5F5] text-xs font-semibold rounded-md shadow-xl border border-[#222222] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.label}
                      </div>
                    )}
                  </>
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] group relative`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform text-[#A3A3A3]" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#666666]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#666666]" />
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
                          `block px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isActive
                            ? 'bg-[#0B2B26] text-white border-l-2 border-[#0B2B26]'
                            : 'text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515]'
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
      <div className="p-3 border-t border-[#222222] bg-[#050505] flex-shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0B2B26] border border-[#0B2B26]/40 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                {user.name?.[0] || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#F5F5F5] truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border uppercase ${roleBadgeColor}`}>
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onLogout}
                className="p-1.5 text-[#A3A3A3] hover:text-[#B00012] hover:bg-[#151515] rounded-lg transition ui-focus"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] rounded-lg transition ui-focus"
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
              className="w-full flex justify-center py-1.5 text-[#A3A3A3] hover:text-[#B00012] hover:bg-[#151515] rounded-lg transition"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex justify-center py-1.5 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#151515] rounded-lg transition"
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

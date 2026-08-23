import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const PATH_LABELS = {
  admin: 'Super Admin',
  manager: 'Team Manager',
  player: 'Player Portal',
  dashboard: 'Dashboard',
  configurations: 'Configurations',
  sessions: 'Sessions',
  positions: 'Positions',
  categories: 'Categories',
  'bidding-tiers': 'Bidding Tiers',
  teams: 'Teams',
  managers: 'Managers',
  players: 'Players',
  reports: 'Reports',
  podium: 'Podium Control',
  unsold: 'Unsold Pool',
  launchpad: 'Launchpad',
  live: 'Live Auction',
  'control-deck': 'Control Deck',
  history: 'Auction History',
  sold: 'Sold Players',
  empty: 'Teams Without Players',
  budgets: 'Team Budgets',
  monitor: 'Live Monitor',
  settings: 'Settings',
  'podium-live': 'Live Podium',
  'bid-center': 'Bid Center',
  roster: 'Roster',
  'my-team': 'My Team',
  budget: 'Budget',
  profile: 'My Profile',
  results: 'Results',
};

// Routes where the breadcrumb bar should not render at all
// (immersive/live pages — the top navbar already gives enough context)
const HIDE_BREADCRUMB_PREFIXES = ['podium/live', 'podium/launchpad'];

export default function Breadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  const currentPath = pathnames.join('/');
  if (HIDE_BREADCRUMB_PREFIXES.some((prefix) => currentPath.startsWith(prefix))) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-xs font-semibold text-secondaryText mb-4 overflow-x-auto py-1">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-primaryText transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-white" />
        <span>Home</span>
      </Link>

      {pathnames.map((value, index) => {
        // Prevent duplicate rendering like "Super Admin > Super Admin" when root section matches section name
        if (index === 0 && pathnames.length > 1 && value === 'admin') {
          return null;
        }

        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = PATH_LABELS[value] || value.replace('-', ' ').toUpperCase();

        return (
          <React.Fragment key={to}>
            <ChevronRight className="w-3.5 h-3.5 text-mutedText flex-shrink-0" />
            {isLast ? (
              <span className="text-white font-bold capitalize truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-primaryText transition-colors capitalize truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

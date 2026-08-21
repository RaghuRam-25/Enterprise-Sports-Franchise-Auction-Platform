import { Link, useLocation } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────
// CompetitionHeader — sticky competition header shared by the Matches Hub
// and the full Match Schedule view, so navigating between them never drops
// the "Championship / Overview / Matches / Table / Stats / Players" bar.
// ─────────────────────────────────────────────────────────────────────────
const NAV_PILLS = [
  { id: 'overview', label: 'Overview', to: '/matches' },
  { id: 'matches', label: 'Matches', to: '/matches/schedule' },
  { id: 'table', label: 'Table', to: '/matches/table' },
  { id: 'stats', label: 'Stats', to: '/matches/stats' },
  { id: 'players', label: 'Players', to: '/players' },
];

export default function CompetitionHeader({ competitionName, sessionName, user, active = 'matches' }) {
  const { pathname } = useLocation();
  // Inside role layouts (/manager, /player, /general) keep pill navigation
  // inside the layout so the sidebar never drops — mirrors the public routes.
  const prefix = pathname.startsWith('/manager')
    ? '/manager'
    : pathname.startsWith('/player')
      ? '/player'
      : pathname.startsWith('/general')
        ? '/general'
        : '';
  const hrefFor = (to) => (prefix ? `${prefix}${to}` : to);

  return (
    <header className={`ui-fade-up sticky z-30 flex flex-col gap-2 rounded-2xl border border-cardBorder/90 bg-darkBg/90 backdrop-blur-md p-2.5 sm:p-3 shadow-lg shadow-black/30 ${user ? 'top-0' : 'top-16'}`}>
      {/* Pill navigation — single row, scrollable on small screens */}
      <nav className="flex items-center gap-1.5 w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {NAV_PILLS.map(pill => {
          if (pill.disabled) {
            return (
              <span
                key={pill.id}
                title="Statistics will light up once the tournament phase begins"
                className="px-4 py-2 rounded-xl text-xs font-bold text-mutedText opacity-50 cursor-not-allowed select-none"
              >
                {pill.label}
              </span>
            );
          }
          if (pill.id === active) {
            return (
              <span
                key={pill.id}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide bg-gradient-to-r from-neonGreen to-successGreen text-darkBg border border-neonGreen/50 shadow-lg shadow-neonGreen/30"
              >
                {pill.label}
              </span>
            );
          }
          const cls = "px-4 py-2 rounded-xl text-xs font-bold text-secondaryText hover:text-white hover:bg-surfaceHover/80 transition";
          if (pill.to) {
            return <Link key={pill.id} to={hrefFor(pill.to)} className={cls}>{pill.label}</Link>;
          }
          return null;
        })}
      </nav>
    </header>
  );
}
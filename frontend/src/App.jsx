import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Toast from './components/Toast';

/* ────────────────────────────────────────────────────────────────────────────
 * Phase 9 — Route-based code splitting.
 * Structural wrappers (Router, ProtectedRoute, DashboardLayout, Toast) stay
 * eager because they are needed on every render. Every page is lazy-loaded so
 * each role's bundle is fetched on demand, shrinking the initial payload.
 * Named-export pages are unwrapped to a default in the import() thenable, since
 * React.lazy requires a module whose `default` is the component.
 * All route paths, RBAC guards, and element mappings are UNCHANGED.
 * ────────────────────────────────────────────────────────────────────────── */

// ── Spectator / Public Views ─────────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/spectator/LandingPage'));
const PublicLiveView = lazy(() => import('./pages/spectator/PublicLiveView'));
const PublicTeamsView = lazy(() => import('./pages/spectator/PublicTeamsView'));
const PublicAboutView = lazy(() => import('./pages/spectator/PublicAboutView'));
const PublicPlayersView = lazy(() => import('./pages/spectator/PublicPlayersView'));

// ── Auth (Universal) ──────────────────────────────────────────────────────────
const ManagerLogin = lazy(() => import('./pages/manager/ManagerLogin'));
const PlayerRegister = lazy(() => import('./pages/player/PlayerRegister'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// ── Player Portal ─────────────────────────────────────────────────────────────
const PlayerDashboard = lazy(() => import('./pages/player/PlayerDashboard'));
const PlayerResults = lazy(() => import('./pages/player/PlayerResults'));
const PlayerSettings = lazy(() => import('./pages/player/PlayerSettings'));
const PlayerMyTeam = lazy(() => import('./pages/player/PlayerMyTeam'));
// Full-bleed reveal — rendered INSIDE DashboardLayout so the sidebar stays.
const FieldPositionReveal = lazy(() => import('./pages/player/FieldPositionReveal'));

// ── Manager War Room ──────────────────────────────────────────────────────────
// NOTE: ManagerDashboard is a NAMED export → unwrap to default for lazy().
const ManagerDashboard = lazy(() =>
  import('./pages/manager/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard }))
);
const ManagerMyTeamView = lazy(() => import('./pages/manager/ManagerMyTeamView'));
const ManagerMyTeam = lazy(() => import('./pages/manager/ManagerMyTeam'));
const TargetPlayersView = lazy(() => import('./pages/manager/TargetPlayersView'));


// ── Podium Admin Control Room ─────────────────────────────────────────────────
// NOTE: PodiumDashboard is a NAMED export → unwrap to default for lazy().
const PodiumDashboard = lazy(() =>
  import('./pages/podium/PodiumDashboard').then((m) => ({ default: m.PodiumDashboard }))
);
const PodiumPlayersView = lazy(() => import('./pages/podium/PodiumPlayersView'));
const PodiumTeamsView = lazy(() => import('./pages/podium/PodiumTeamsView'));

// ── Admin Panel ───────────────────────────────────────────────────────────────
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const AdminConfigurationsLayout = lazy(() => import('./pages/admin/AdminConfigurationsLayout'));
const AdminConfigurations = lazy(() => import('./pages/admin/AdminConfigurations'));
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'));
const AdminPlayers = lazy(() => import('./pages/admin/AdminPlayers'));
const AdminManagerRequests = lazy(() => import('./pages/admin/AdminManagerRequests'));

// ── Error Pages ───────────────────────────────────────────────────────────────
const AccessDenied = lazy(() => import('./pages/AccessDenied'));

// Branded fallback shown while a route chunk is fetched.
function RouteFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-300">
      <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
      <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Loading</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toast />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Public Spectator Routes (Top Navbar Only, No Sidebar) ─────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<PublicLiveView />} />
        <Route path="/teams" element={<PublicTeamsView />} />
        <Route path="/about" element={<PublicAboutView />} />
        <Route path="/players" element={<PublicPlayersView />} />

        {/* ── Universal Auth Routes ─────────────────────────────────────────── */}
        <Route path="/login" element={<ManagerLogin />} />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/player/login" element={<ManagerLogin />} />
        <Route path="/player/register" element={<PlayerRegister />} />
        <Route path="/register" element={<PlayerRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Authenticated Enterprise Dashboard Layout (Sidebar + Top Navbar) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >

          {/* ── SUPER ADMIN ROUTES ────────────────────────────────────────── */}
          <Route path="/admin">
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="configurations"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminConfigurationsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/configurations/sessions" replace />} />
              <Route path=":subtab" element={<AdminConfigurations />} />
            </Route>

            <Route
              path="teams"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminTeams />
                </ProtectedRoute>
              }
            />
            <Route
              path="players"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminPlayers />
                </ProtectedRoute>
              }
            />
            <Route
              path="requests"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminManagerRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── PODIUM ADMIN PANEL ────────────────────────────────────────── */}
          <Route path="/podium">
            <Route index element={<Navigate to="/podium/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="unsold"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="launchpad"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="live"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PublicLiveView />
                </ProtectedRoute>
              }
            />
            <Route
              path="control-deck"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="history"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="players/:filter"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumPlayersView />
                </ProtectedRoute>
              }
            />
            <Route
              path="teams/:filter"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumTeamsView />
                </ProtectedRoute>
              }
            />
            <Route
              path="monitor"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── TEAM MANAGER ROUTES ───────────────────────────────────────── */}
          <Route path="/manager">
            <Route index element={<Navigate to="/manager/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="target-players"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <TargetPlayersView />
                </ProtectedRoute>
              }
            />

            <Route
              path="podium"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <PublicLiveView />
                </ProtectedRoute>
              }
            />
            <Route
              path="bid-center"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <PublicLiveView />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-team"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerMyTeamView />
                </ProtectedRoute>
              }
            />
            <Route
              path="budget"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="history"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerMyTeam />
                </ProtectedRoute>
              }
            />
            <Route
              path="players"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <PublicPlayersView />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── PLAYER ROUTES ────────────────────────────────────────────── */}
          <Route path="/player">
            <Route index element={<Navigate to="/player/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PlayerDashboard />
                </ProtectedRoute>
              }
            />
            {/* Live auction — in-layout so the sidebar stays. PublicLiveView
                hides its own Navbar when a user is logged in. */}
            <Route
              path="live"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PublicLiveView />
                </ProtectedRoute>
              }
            />
            {/* Field position reveal — immersive but kept INSIDE the layout so
                the sidebar/navbar remain (fills the main content area). */}
            <Route
              path="field-position"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <FieldPositionReveal />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PlayerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="results"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PlayerResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PlayerSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-team"
              element={
                <ProtectedRoute allowedRoles={['PLAYER']}>
                  <PlayerMyTeam />
                </ProtectedRoute>
              }
            />
          </Route>

        </Route>

        {/* ── Error Pages ────────────────────────────────────────────────── */}
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* ── Catch-all ──────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

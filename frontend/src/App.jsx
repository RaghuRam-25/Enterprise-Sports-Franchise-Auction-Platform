import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Toast from './components/Toast';

// ── Spectator / Public Views ─────────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/spectator/LandingPage'));
const PublicLiveView = lazy(() => import('./pages/spectator/PublicLiveView'));
const TeamsScudle = lazy(() => import('./pages/spectator/TeamsScudle'));
const LeagueTable = lazy(() => import('./pages/spectator/LeagueTable'));
const LeagueStats = lazy(() => import('./pages/spectator/LeagueStats'));
const MatchesHub = lazy(() => import('./pages/spectator/MatchesHub'));
const PublicAboutView = lazy(() => import('./pages/spectator/PublicAboutView'));
const PublicPlayersView = lazy(() => import('./pages/spectator/PublicPlayersView'));
const SoldPlayersView = lazy(() => import('./pages/spectator/SoldPlayersView'));
const PublicTeamsView = lazy(() => import('./pages/spectator/PublicTeamsView'));

// ── Auth (Universal) ──────────────────────────────────────────────────────────
const ManagerLogin = lazy(() => import('./pages/manager/ManagerLogin'));
const PlayerRegister = lazy(() => import('./pages/player/PlayerRegister'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// ── General User (Spectator / Fan Portal) ─────────────────────────────────────
const GeneralUserRegister = lazy(() => import('./pages/general/GeneralUserRegister'));
const GeneralDashboard = lazy(() => import('./pages/general/GeneralDashboard'));
const GeneralTournaments = lazy(() => import('./pages/general/GeneralTournaments'));
const GeneralTeamProfile = lazy(() => import('./pages/general/GeneralTeamProfile'));
const GeneralPlayerProfile = lazy(() => import('./pages/general/GeneralPlayerProfile'));
const GeneralResults = lazy(() => import('./pages/general/GeneralResults'));
const GeneralNotifications = lazy(() => import('./pages/general/GeneralNotifications'));
const GeneralSettings = lazy(() => import('./pages/general/GeneralSettings'));

// ── Player Portal ─────────────────────────────────────────────────────────────
const PlayerDashboard = lazy(() => import('./pages/player/PlayerDashboard'));
const PlayerSettings = lazy(() => import('./pages/player/PlayerSettings'));
const PlayerMyTeam = lazy(() => import('./pages/player/PlayerMyTeam'));
const FieldPositionReveal = lazy(() => import('./pages/player/FieldPositionReveal'));

// ── Manager War Room ──────────────────────────────────────────────────────────
// NOTE: ManagerDashboard is a NAMED export → unwrap to default for lazy().
const ManagerDashboard = lazy(() =>
  import('./pages/manager/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard }))
);
const ManagerMyTeamView = lazy(() => import('./pages/manager/ManagerMyTeamView'));
const TargetPlayersView = lazy(() => import('./pages/manager/TargetPlayersView'));

// ── Podium Admin Control Room ─────────────────────────────────────────────────
// NOTE: PodiumDashboard is a NAMED export → unwrap to default for lazy().
const PodiumDashboard = lazy(() =>
  import('./pages/podium/PodiumDashboard').then((m) => ({ default: m.PodiumDashboard }))
);
const PodiumPlayersView = lazy(() => import('./pages/podium/PodiumPlayersView'));
const PodiumTeamsView = lazy(() => import('./pages/podium/PodiumTeamsView'));
const PodiumVideoControl = lazy(() => import('./pages/podium/PodiumVideoControl'));

// ── Admin Panel ───────────────────────────────────────────────────────────────
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const AdminConfigurationsLayout = lazy(() => import('./pages/admin/AdminConfigurationsLayout'));
const AdminConfigurations = lazy(() => import('./pages/admin/AdminConfigurations'));
const AdminTeams = lazy(() => import('./pages/admin/AdminTeams'));
const AdminPlayers = lazy(() => import('./pages/admin/AdminPlayers'));
const AdminManagerRequests = lazy(() => import('./pages/admin/AdminManagerRequests'));
const AdminFixtures = lazy(() => import('./pages/admin/AdminFixtures'));
const AdminMatchResults = lazy(() => import('./pages/admin/AdminMatchResults'));

// ── Error Pages ───────────────────────────────────────────────────────────────
const AccessDenied = lazy(() => import('./pages/AccessDenied'));

// Branded fallback shown while a route chunk is fetched.
function RouteFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span>Loading…</span>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toast />
      <Suspense fallback={<RouteFallback />}>
        <Routes>

          {/* ── Public Spectator Routes (No Sidebar) ──────────────────────────── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/live" element={<PublicLiveView />} />
          <Route path="/matches" element={<MatchesHub />} />
          <Route path="/matches/schedule" element={<TeamsScudle />} />
          <Route path="/matches/table" element={<LeagueTable />} />
          <Route path="/matches/stats" element={<LeagueStats />} />
          <Route path="/teams" element={<PublicTeamsView />} />
          <Route path="/about" element={<PublicAboutView />} />
          <Route path="/players" element={<PublicPlayersView />} />
          <Route path="/players/sold" element={<SoldPlayersView />} />

          {/* ── Universal Auth Routes ──────────────────────────────────────────── */}
          <Route path="/login" element={<ManagerLogin />} />
          <Route path="/manager/login" element={<ManagerLogin />} />
          <Route path="/player/login" element={<ManagerLogin />} />
          <Route path="/player/register" element={<PlayerRegister />} />
          <Route path="/register" element={<PlayerRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ── General User public auth ───────────────────────────────────────── */}
          <Route path="/general/login" element={<Navigate to="/login" replace />} />
          <Route path="/general/register" element={<GeneralUserRegister />} />

          {/* ── Authenticated Dashboard Layout (Sidebar + Top Navbar) ─────────── */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER', 'PLAYER', 'GENERAL_USER']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >

            {/* ── SUPER ADMIN ───────────────────────────────────────────────── */}
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
                path="fixtures"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AdminFixtures />
                  </ProtectedRoute>
                }
              />
              <Route
                path="match-results"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <AdminMatchResults />
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

            {/* ── PODIUM ADMIN ──────────────────────────────────────────────── */}
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
                path="video-control"
                element={
                  <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                    <PodiumVideoControl />
                  </ProtectedRoute>
                }
              />
              <Route
                path="live"
                element={
                  <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                    <PublicLiveView embedded />
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

            {/* ── TEAM MANAGER ──────────────────────────────────────────────── */}
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
                    <PublicLiveView embedded />
                  </ProtectedRoute>
                }
              />
              <Route
                path="bid-center"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                    <PublicLiveView embedded />
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
                path="teams"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN', 'PODIUM_ADMIN']}>
                    <PublicTeamsView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN', 'PODIUM_ADMIN']}>
                    <MatchesHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/schedule"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN', 'PODIUM_ADMIN']}>
                    <TeamsScudle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/table"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN', 'PODIUM_ADMIN']}>
                    <LeagueTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/stats"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN', 'PODIUM_ADMIN']}>
                    <LeagueStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                    <PlayerSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* ── PLAYER ────────────────────────────────────────────────────── */}
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
              <Route
                path="live"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER']}>
                    <PublicLiveView embedded />
                  </ProtectedRoute>
                }
              />
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
              <Route
                path="teams"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER']}>
                    <PublicTeamsView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="players"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER']}>
                    <PublicPlayersView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER']}>
                    <MatchesHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/schedule"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER']}>
                    <TeamsScudle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/table"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER']}>
                    <LeagueTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/stats"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN', 'PODIUM_ADMIN', 'TEAM_MANAGER']}>
                    <LeagueStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="results"
                element={
                  <ProtectedRoute allowedRoles={['PLAYER']}>
                    <Navigate to="/player/dashboard" replace />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* ── GENERAL USER (Fan Zone) ───────────────────────────────────── */}
            <Route path="/general">
              <Route index element={<Navigate to="/general/dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="live"
                element={<PublicLiveView embedded />}
              />
              <Route
                path="tournaments"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralTournaments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <MatchesHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/schedule"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <TeamsScudle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/table"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <LeagueTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="matches/stats"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <LeagueStats />
                  </ProtectedRoute>
                }
              />
              <Route
                path="teams"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <PublicTeamsView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="teams/:id"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralTeamProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="players"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <PublicPlayersView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="players/:id"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralPlayerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="schedule"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <TeamsScudle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="results"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralResults />
                  </ProtectedRoute>
                }
              />
              <Route
                path="standings"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <LeagueTable />
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralNotifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['GENERAL_USER']}>
                    <GeneralSettings />
                  </ProtectedRoute>
                }
              />
            </Route>

          </Route>{/* end DashboardLayout */}

          {/* ── Error Pages ──────────────────────────────────────────────────── */}
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* ── Catch-all ────────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

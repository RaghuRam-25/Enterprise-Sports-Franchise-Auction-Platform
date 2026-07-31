import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// ── Spectator / Public Views ─────────────────────────────────────────────────
import LandingPage from './pages/spectator/LandingPage';
import PublicLiveView from './pages/spectator/PublicLiveView';
import PublicTeamsView from './pages/spectator/PublicTeamsView';
import PublicPlayersView from './pages/spectator/PublicPlayersView';

// ── Auth (Universal) ──────────────────────────────────────────────────────────
import ManagerLogin from './pages/manager/ManagerLogin';
import PlayerRegister from './pages/player/PlayerRegister';
import ForgotPassword from './pages/auth/ForgotPassword';

// ── Player Portal ─────────────────────────────────────────────────────────────
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerResults from './pages/player/PlayerResults';
import PlayerSettings from './pages/player/PlayerSettings';

// ── Manager War Room ──────────────────────────────────────────────────────────
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import ManagerRoster from './pages/manager/ManagerRoster';
import ManagerMyTeam from './pages/manager/ManagerMyTeam';

// ── Podium Admin Control Room ─────────────────────────────────────────────────
import { PodiumDashboard } from './pages/podium/PodiumDashboard';

// ── Admin Panel ───────────────────────────────────────────────────────────────
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import AdminConfigurationsLayout from './pages/admin/AdminConfigurationsLayout';
import AdminConfigurations from './pages/admin/AdminConfigurations';
import AdminTeams from './pages/admin/AdminTeams';
import AdminManagers from './pages/admin/AdminManagers';
import AdminPlayers from './pages/admin/AdminPlayers';
import AdminReports from './pages/admin/AdminReports';
import AdminManagerRequests from './pages/admin/AdminManagerRequests';

// ── Error Pages ───────────────────────────────────────────────────────────────
import AccessDenied from './pages/AccessDenied';
import Toast from './components/Toast';

function App() {
  return (
    <Router>
      <Toast />
      <Routes>
        {/* ── Public Spectator Routes (Top Navbar Only, No Sidebar) ─────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<PublicLiveView />} />
        <Route path="/teams" element={<PublicTeamsView />} />
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
              path="managers"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminManagers />
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
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <AdminReports />
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
                  <PodiumDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="teams/:filter"
              element={
                <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
                  <PodiumDashboard />
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
              path="roster"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerRoster />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-team"
              element={
                <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
                  <ManagerMyTeam />
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
          </Route>

        </Route>

        {/* ── Error Pages ────────────────────────────────────────────────── */}
        <Route path="/access-denied" element={<AccessDenied />} />

        {/* ── Catch-all ──────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
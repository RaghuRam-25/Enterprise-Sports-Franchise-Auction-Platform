import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// ── Spectator / Public Views ─────────────────────────────────────────────────
import LandingPage from './pages/spectator/LandingPage';
import PublicLiveView from './pages/spectator/PublicLiveView';
import PublicTeamsView from './pages/spectator/PublicTeamsView';

// ── Player Portal ─────────────────────────────────────────────────────────────
import PlayerRegister from './pages/player/PlayerRegister';
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerSettings from './pages/player/PlayerSettings';
import PlayerResults from './pages/player/PlayerResults';

// ── Manager War Room ──────────────────────────────────────────────────────────
import ManagerLogin from './pages/manager/ManagerLogin';
import ForgotPassword from './pages/auth/ForgotPassword';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import ManagerRoster from './pages/manager/ManagerRoster';

// ── Podium Admin Control Room ─────────────────────────────────────────────────
import { PodiumDashboard } from './pages/podium/PodiumDashboard';

// ── Super Admin Panel ─────────────────────────────────────────────────────────
import AdminLayout from './layouts/AdminLayout';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import AdminConfigurations from './pages/admin/AdminConfigurations';
import AdminTeams from './pages/admin/AdminTeams';
import AdminManagers from './pages/admin/AdminManagers';
import AdminPlayers from './pages/admin/AdminPlayers';

function App() {
  return (
    <Router>
      <Routes>
        {/* ── Public (No Auth Required) ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<PublicLiveView />} />
        <Route path="/teams" element={<PublicTeamsView />} />

        {/* ── Player Portal ── */}
        <Route path="/player/register" element={<PlayerRegister />} />
        <Route
          path="/player/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN']}>
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/settings"
          element={
            <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN']}>
              <PlayerSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/results"
          element={
            <ProtectedRoute allowedRoles={['PLAYER', 'SUPER_ADMIN']}>
              <PlayerResults />
            </ProtectedRoute>
          }
        />

        {/* ── Auth / Recovery ── */}
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/roster"
          element={
            <ProtectedRoute allowedRoles={['TEAM_MANAGER', 'SUPER_ADMIN']}>
              <ManagerRoster />
            </ProtectedRoute>
          }
        />

        {/* ── Podium Admin ── */}
        <Route
          path="/podium/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
              <PodiumDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Super Admin Panel (nested layout) ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="configurations" element={<Navigate to="/admin/configurations/sessions" replace />} />
          <Route path="configurations/:subtab" element={<AdminConfigurations />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="managers" element={<AdminManagers />} />
          <Route path="players" element={<AdminPlayers />} />
        </Route>

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
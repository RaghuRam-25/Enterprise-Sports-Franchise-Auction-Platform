import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// ── Spectator / Public Views ─────────────────────────────────────────────────
import LandingPage from './pages/spectator/LandingPage';
import PublicLiveView from './pages/spectator/PublicLiveView';
import PublicTeamsView from './pages/spectator/PublicTeamsView';
import PublicPlayersView from './pages/spectator/PublicPlayersView';

// ── Auth (Universal) ──────────────────────────────────────────────────────────
import ManagerLogin from './pages/manager/ManagerLogin';
import PlayerRegister from './pages/player/PlayerRegister';
import ForgotPassword from './pages/auth/ForgotPassword';
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerResults from './pages/player/PlayerResults';
import PlayerSettings from './pages/player/PlayerSettings';

// ── Manager War Room ──────────────────────────────────────────────────────────
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import ManagerRoster from './pages/manager/ManagerRoster';

// ── Podium Admin Control Room ─────────────────────────────────────────────────
import { PodiumDashboard } from './pages/podium/PodiumDashboard';

// ── Admin Panel ───────────────────────────────────────────────────────────────
import AdminLayout from './layouts/AdminLayout';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import AdminConfigurations from './pages/admin/AdminConfigurations';
import AdminTeams from './pages/admin/AdminTeams';
import AdminManagers from './pages/admin/AdminManagers';
import AdminPlayers from './pages/admin/AdminPlayers';
import AdminReports from './pages/admin/AdminReports';

// ── Error Pages ───────────────────────────────────────────────────────────────
import AccessDenied from './pages/AccessDenied';
import Toast from './components/Toast';

function App() {
  return (
    <Router>
      <Toast />
      <Routes>
        {/* ── Public (No Auth Required) ──────────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/live" element={<PublicLiveView />} />
        <Route path="/teams" element={<PublicTeamsView />} />
        <Route path="/players" element={<PublicPlayersView />} />

        {/* ── Universal Login & Auth ──────────────────────────────────────── */}
        {/* One login page for ALL roles: Super Admin, Podium Admin, Team Manager, Player */}
        <Route path="/login" element={<ManagerLogin />} />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/player/login" element={<ManagerLogin />} />
        <Route path="/player/register" element={<PlayerRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Player Self-Serve Portal ────────────────────────────────────── */}
        <Route
          path="/player/profile"
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <PlayerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/settings"
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <PlayerSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player/results"
          element={
            <ProtectedRoute allowedRoles={['PLAYER']}>
              <PlayerResults />
            </ProtectedRoute>
          }
        />

        {/* ── Manager War Room ───────────────────────────────────────────── */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/roster"
          element={
            <ProtectedRoute allowedRoles={['TEAM_MANAGER']}>
              <ManagerRoster />
            </ProtectedRoute>
          }
        />

        {/* ── Podium Admin Control Room ──────────────────────────────────── */}
        <Route
          path="/podium/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PODIUM_ADMIN', 'SUPER_ADMIN']}>
              <PodiumDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Admin / Registry Routes (Nested layout) ────────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Default landing inside /admin */}
          <Route index element={<Navigate to="/admin/dashboard" replace />} />

          {/* System Overview & Dynamic Enums — SUPER_ADMIN ONLY */}
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route
            path="configurations"
            element={<Navigate to="/admin/configurations/sessions" replace />}
          />
          <Route path="configurations/:subtab" element={<AdminConfigurations />} />

          {/* Teams & Managers — SUPER_ADMIN ONLY */}
          <Route path="teams" element={<AdminTeams />} />
          <Route path="managers" element={<AdminManagers />} />

          {/* Player Management — SUPER_ADMIN ONLY */}
          <Route path="players" element={<AdminPlayers />} />

          {/* Reports & Analytics — SUPER_ADMIN ONLY */}
          <Route path="reports" element={<AdminReports />} />
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
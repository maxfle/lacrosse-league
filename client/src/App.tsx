import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';
import GameDetailPage from './pages/GameDetailPage';
import StandingsPage from './pages/StandingsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import CoachDashboard from './pages/coach/CoachDashboard';
import RecruitmentProfilePage from './pages/RecruitmentProfilePage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) fetchMe();
  }, [token, fetchMe]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/teams/:teamId" element={<TeamPage />} />
        <Route path="/players/:playerId" element={<PlayerPage />} />
        <Route path="/games/:gameId" element={<GameDetailPage />} />
        <Route path="/standings" element={<StandingsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute roles={['admin', 'super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute roles={['coach', 'admin', 'super_admin']}>
              <CoachDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruitment/:playerId"
          element={
            <ProtectedRoute roles={['player', 'coach', 'admin', 'super_admin']}>
              <RecruitmentProfilePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

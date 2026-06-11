import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';

import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import OnboardingPage from './pages/onboarding/OnboardingPage';
import HypothesesPage from './pages/hypotheses/HypothesesPage';
import DiagnosticReviewPage from './pages/diagnostic/DiagnosticReviewPage';
import FinanceLitePage from './pages/finance/FinanceLitePage';
import AgentsPage from './pages/agents/AgentsPage';
import ValidationPage from './pages/validation/ValidationPage';
import DeliverablesPage from './pages/deliverables/DeliverablesPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';

function RequireAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuth({ children }) {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// Force a password change before any app access (admin-set / reset passwords).
function RequirePasswordChanged({ children }) {
  const mustChange = useAuthStore((s) => !!s.user?.mustChangePassword);
  if (mustChange) return <Navigate to="/change-password" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public + minimal-layout authed (forced change-password) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/change-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
      </Route>

      {/* Protected app */}
      <Route element={<RequireAuth><RequirePasswordChanged><AppLayout /></RequirePasswordChanged></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects/:id/onboarding" element={<OnboardingPage />} />
        <Route path="/projects/:id/hypotheses" element={<HypothesesPage />} />
        <Route path="/projects/:id/diagnostic-review" element={<DiagnosticReviewPage />} />
        <Route path="/projects/:id/finance" element={<FinanceLitePage />} />
        <Route path="/projects/:id/agents" element={<AgentsPage />} />
        <Route path="/projects/:id/validate" element={<ValidationPage />} />
        <Route path="/projects/:id/validate/:tab" element={<ValidationPage />} />
        <Route path="/projects/:id/deliverables" element={<DeliverablesPage />} />
        <Route path="/projects/:id/deliverables/:tab" element={<DeliverablesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Admin (role-gated) */}
        <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

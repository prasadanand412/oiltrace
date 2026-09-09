import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ForgotPasswordForm } from "../components/Authentication/ForgotPasswordForm";
import { LandingPage } from "../components/Landing/LandingPage";
import { LoginForm } from "../components/Authentication/LoginForm";
import { SignupForm } from "../components/Authentication/SignupForm";
import { Dashboard } from "../components/Dashboard/Dashboard";
import { AISimulationPage } from "../components/Dashboard/pages/AISimulationPage";
import { AlertsPage } from "../components/Dashboard/pages/AlertsPage";
import { AnalyticsPage } from "../components/Dashboard/pages/AnalyticsPage";
import { CoreFeaturesPage } from "../components/Dashboard/pages/CoreFeaturesPage";
import { GISCommandMapPage } from "../components/Dashboard/pages/GISCommandMapPage";
import { HistoricalArchivesPage } from "../components/Dashboard/pages/HistoricalArchivesPage";
import { IncidentWorkflowPage } from "../components/Dashboard/pages/IncidentWorkflowPage";
import { ProfilePage } from "../components/Dashboard/pages/ProfilePage";
import { SatelliteRadarPage } from "../components/Dashboard/pages/SatelliteRadarPage";
import { SensitiveZonesPage } from "../components/Dashboard/pages/SensitiveZonesPage";
import { SettingsPage } from "../components/Dashboard/pages/SettingsPage";
import { useAuth } from "../store/useAuth";

function ProtectedRoute({ children }) {
  const { authLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  if (authLoading) return <div className="auth-loading">Restoring your session...</div>;
  return isAuthenticated ? children : <Navigate to="/signin" replace state={{ from: location }} />;
}

function PublicOnlyRoute({ children }) {
  const { authLoading, isAuthenticated } = useAuth();
  if (authLoading) return <div className="auth-loading">Restoring your session...</div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

// Keep route definitions centralized so pages remain composable.
export function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<PublicOnlyRoute><LoginForm /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignupForm /></PublicOnlyRoute>} />
      <Route path="/reset" element={<ForgotPasswordForm />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard/core-features" element={<ProtectedRoute><CoreFeaturesPage /></ProtectedRoute>} />
      <Route path="/dashboard/ai-simulation" element={<ProtectedRoute><AISimulationPage /></ProtectedRoute>} />
      <Route path="/dashboard/gis-command-map" element={<ProtectedRoute><GISCommandMapPage /></ProtectedRoute>} />
      <Route path="/dashboard/incident-workflow" element={<ProtectedRoute><IncidentWorkflowPage /></ProtectedRoute>} />
      <Route path="/dashboard/satellite-radar" element={<ProtectedRoute><SatelliteRadarPage /></ProtectedRoute>} />
      <Route path="/dashboard/sensitive-zones" element={<ProtectedRoute><SensitiveZonesPage /></ProtectedRoute>} />
      <Route path="/dashboard/historical-archives" element={<ProtectedRoute><HistoricalArchivesPage /></ProtectedRoute>} />
      <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/dashboard/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { lazy } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { RequireAuth, RequireEnrollable, RequireOwnUniversity, RequireRole } from "./components/auth/guards";
import ErrorBoundary from "./components/common/ErrorBoundary";

import UnifiedPortalEntry from "./components/auth/UnifiedPortalEntry";
import NotFoundPage from "./pages/NotFoundPage";
import AccessRestrictedPage from "./pages/AccessRestrictedPage";
import TotpEnrollPage from "./pages/auth/TotpEnrollPage";
// University registration is superuser-only — not offered from this frontend.
// import UniversityRegisterPage from "./pages/auth/UniversityRegisterPage";

import UniversityLayout from "./layouts/UniversityLayout";
const DashboardPage = lazy(() => import("./pages/university/DashboardPage"));
const SettingsProfilePage = lazy(() => import("./pages/university/SettingsProfilePage"));
const ScrapeSourcesPage = lazy(() => import("./pages/university/ScrapeSourcesPage"));
const KnowledgeBasePage = lazy(() => import("./pages/university/KnowledgeBasePage"));
const UniversityInformationPage = lazy(() => import("./pages/university/UniversityInformationPage"));
const KnowledgeGroupsPage = lazy(() => import("./pages/university/KnowledgeGroupsPage"));
const AgentPreviewPage = lazy(() => import("./pages/university/AgentPreviewPage"));
const ProfilesListPage = lazy(() => import("./pages/university/ProfilesListPage"));
const ProfileDetailPage = lazy(() => import("./pages/university/ProfileDetailPage"));
const AgentQueriesPage = lazy(() => import("./pages/university/AgentQueriesPage"));

const KnowledgePage = lazy(() => import("./pages/university/KnowledgePage"));
const QuestionLogPage = lazy(() => import("./pages/university/QuestionLogPage"));

function UniversityIndexRedirect() {
  const { user } = useAuth();
  return <Navigate to={`/university/${user.university_id}/${user.role === "department" ? "agent-queries?tab=departments" : "dashboard"}`} replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { fontSize: "14px" },
              success: { iconTheme: { primary: "#444ce7", secondary: "#fff" } },
            }}
          />
          <Routes>
            <Route path="/" element={<UnifiedPortalEntry />} />
            <Route path="/access-restricted" element={<AccessRestrictedPage />} />
            <Route path="/login" element={<UnifiedPortalEntry />} />
            {/* <Route path="/register" element={<UniversityRegisterPage />} /> */}
            <Route path="/forgot-password" element={<UnifiedPortalEntry />} />

            <Route element={<RequireEnrollable />}>
              <Route path="/totp/enroll" element={<TotpEnrollPage />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<RequireRole role="university" />}>
                <Route path="/university" element={<UniversityIndexRedirect />} />
                <Route element={<RequireOwnUniversity />}>
                  <Route path="/university/:universityId" element={<UniversityLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="settings/profile" element={<SettingsProfilePage />} />
                    <Route path="settings/sources" element={<ScrapeSourcesPage />} />
                    <Route path="settings/knowledge-base" element={<KnowledgeBasePage />} />
                    <Route path="information" element={<UniversityInformationPage />} />
                    <Route path="settings/knowledge-groups" element={<KnowledgeGroupsPage />} />
                    <Route path="settings/agent-preview" element={<AgentPreviewPage />} />
                    <Route path="profiles" element={<ProfilesListPage />} />
                    <Route path="profiles/:studentId" element={<ProfileDetailPage />} />
                    <Route path="queries" element={<Navigate to="../agent-queries?tab=departments" replace />} />
                    <Route path="agent-queries" element={<AgentQueriesPage />} />
                    <Route path="knowledge" element={<KnowledgePage />} />
                    <Route path="questions" element={<QuestionLogPage />} />
                  </Route>
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

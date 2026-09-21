import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import {
  RequireAuth,
  RequireEnrollable,
  RequireRole,
} from "./components/auth/guards";

import UnifiedPortalEntry from "./components/auth/UnifiedPortalEntry";
import TotpEnrollPage from "./pages/auth/TotpEnrollPage";

import AdminLayout from "./layouts/AdminLayout";

import DashboardPage from "./pages/admin/DashboardPage";
import StudentsListPage from "./pages/admin/StudentsListPage";
import StudentCreatePage from "./pages/admin/StudentCreatePage";
import StudentDetailPage from "./pages/admin/StudentDetailPage";

import UniversitiesListPage from "./pages/admin/UniversitiesListPage";
import UniversityCreatePage from "./pages/admin/UniversityCreatePage";
import UniversityViewPage from "./pages/admin/UniversityViewPage"; // NEW
import UniversityDetailPage from "./pages/admin/UniversityDetailPage"; // EDIT PAGE

import InstitutesListPage from "./pages/admin/InstitutesListPage";
import InstituteCreatePage from "./pages/admin/InstituteCreatePage";
import InstituteDetailPage from "./pages/admin/InstituteDetailPage";
import InstituteListUploadPage from "./pages/admin/InstituteListUploadPage";
import InstituteListStudentsPage from "./pages/admin/InstituteListStudentsPage";

import UsersListPage from "./pages/admin/UsersListPage";
import UserDetailPage from "./pages/admin/UserDetailPage";
import SettingsPage from "./pages/admin/SettingsPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import AgentAuditLogPage from "./pages/admin/AgentAuditLogPage";
import EscalationMetricsPage from "./pages/admin/EscalationMetricsPage";

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: "14px",
            },
            success: {
              iconTheme: {
                primary: "#444ce7",
                secondary: "#fff",
              },
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<UnifiedPortalEntry />} />
          <Route path="/login" element={<UnifiedPortalEntry />} />

          {/* TOTP Enrollment */}
          <Route element={<RequireEnrollable />}>
            <Route path="/totp/enroll" element={<TotpEnrollPage />} />
          </Route>

          {/* Protected Routes */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole role="superuser" />}>
              <Route path="/admin" element={<AdminLayout />}>

                <Route
                  index
                  element={<Navigate to="dashboard" replace />}
                />

                {/* Dashboard */}
                <Route
                  path="dashboard"
                  element={<DashboardPage />}
                />

                {/* Students */}
                <Route
                  path="students"
                  element={<StudentsListPage />}
                />

                <Route
                  path="students/new"
                  element={<StudentCreatePage />}
                />

                <Route
                  path="students/:studentId"
                  element={<StudentDetailPage />}
                />

                {/* Universities */}
                <Route
                  path="universities"
                  element={<UniversitiesListPage />}
                />

                <Route
                  path="universities/new"
                  element={<UniversityCreatePage />}
                />

                {/* NEW - Read Only View Page */}
                <Route
                  path="universities/:universityId/view"
                  element={<UniversityViewPage />}
                />

                {/* Existing Edit Page */}
                <Route
                  path="universities/:universityId"
                  element={<UniversityDetailPage />}
                />

                {/* Institutes — feeder institutes that upload student rosters */}
                <Route
                  path="institutes"
                  element={<InstitutesListPage />}
                />

                <Route
                  path="institutes/new"
                  element={<InstituteCreatePage />}
                />

                <Route
                  path="institutes/:instituteId/upload-list"
                  element={<InstituteListUploadPage />}
                />

                <Route
                  path="institutes/:instituteId/lists/:listId"
                  element={<InstituteListStudentsPage />}
                />

                <Route
                  path="institutes/:instituteId"
                  element={<InstituteDetailPage />}
                />

                {/* Users */}
                <Route
                  path="users"
                  element={<UsersListPage />}
                />

                <Route
                  path="users/:userId"
                  element={<UserDetailPage />}
                />

                {/* Settings — self-service, kept separate from Users & Access */}
                <Route
                  path="settings"
                  element={<SettingsPage />}
                />

                {/* Audit Log */}
                <Route
                  path="audit-log"
                  element={<AuditLogPage />}
                />

                {/* Agent Telemetry */}
                <Route
                  path="agent-telemetry"
                  element={<AgentAuditLogPage />}
                />

                {/* Metrics */}
                <Route
                  path="metrics/escalations"
                  element={<EscalationMetricsPage />}
                />

              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
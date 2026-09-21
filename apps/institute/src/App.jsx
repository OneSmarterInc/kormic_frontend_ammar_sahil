import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import {
  RequireAuth,
  RequireEnrollable,
  RequireRole,
} from "./components/auth/guards";
import ErrorBoundary from "./components/common/ErrorBoundary";

import UnifiedPortalEntry from "./components/auth/UnifiedPortalEntry";
import NotFoundPage from "./pages/NotFoundPage";
import TotpEnrollPage from "./pages/auth/TotpEnrollPage";

import InstituteLayout from "./layouts/InstituteLayout";

import DashboardPage from "./pages/institute/DashboardPage";
import UploadListPage from "./pages/institute/UploadListPage";
import ListsPage from "./pages/institute/ListsPage";
import ListStudentsPage from "./pages/institute/ListStudentsPage";

function App() {
  return (
    <ErrorBoundary>
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
              <Route element={<RequireRole role="institute" />}>
                <Route path="/institute" element={<InstituteLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />

                  {/* Dashboard */}
                  <Route path="dashboard" element={<DashboardPage />} />

                  {/* Upload a new student roster */}
                  <Route path="upload" element={<UploadListPage />} />

                  {/* Every roster this institute has uploaded */}
                  <Route path="lists" element={<ListsPage />} />

                  <Route path="lists/:listId" element={<ListStudentsPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

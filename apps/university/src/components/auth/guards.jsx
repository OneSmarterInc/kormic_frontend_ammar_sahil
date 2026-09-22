import { Navigate, Outlet, useParams } from "react-router-dom";
import Spinner from "../common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../lib/constants";

export function RequireAuth() {
  const { status } = useAuth();

  if (status === "initializing") {
    return <Spinner className="min-h-screen" label="Loading..." />;
  }
  if (status === "guest") return <Navigate to="/login" replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;
  return <Outlet />;
}

export function RequireRole({ role }) {
  const { user } = useAuth();
  if (user.role !== role) return <Navigate to={roleHome(user)} replace />;
  return <Outlet />;
}

export function RequireOwnUniversity() {
  const { user } = useAuth();
  const { universityId } = useParams();
  if (String(universityId) !== String(user.university_id)) {
    return <Navigate to={`/university/${user.university_id}/profiles`} replace />;
  }
  return <Outlet />;
}

export function RequireEnrollable() {
  const { status, user } = useAuth();
  if (status === "initializing") {
    return <Spinner className="min-h-screen" label="Loading..." />;
  }
  if (status === "guest") return <Navigate to="/login" replace />;
  if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
  return <Outlet />;
}

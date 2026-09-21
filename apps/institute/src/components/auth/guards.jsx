import { Navigate, Outlet } from "react-router-dom";
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
  const { user, logout } = useAuth();
  if (user.role !== role) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-8">
        <p role="alert">Access restricted. This account cannot use this portal.</p>
        <button type="button" onClick={logout} className="rounded border px-4 py-2">Log out</button>
      </div>
    );
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

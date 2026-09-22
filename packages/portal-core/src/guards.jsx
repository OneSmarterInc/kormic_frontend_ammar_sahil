import { Navigate, Outlet, useParams } from "react-router-dom";

export function createPortalGuards({
  useAuth,
  roleHome,
  Spinner,
  roleMismatch = "restricted",
  ownUniversity = false,
}) {
  function RequireAuth() {
    const { status } = useAuth();
    if (status === "initializing") return <Spinner className="min-h-screen" label="Loading..." />;
    if (status === "guest") return <Navigate to="/login" replace />;
    if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;
    return <Outlet />;
  }

  function RequireRole({ role }) {
    const { user, logout } = useAuth();
    if (user.role !== role) {
      if (roleMismatch === "redirect") return <Navigate to={roleHome(user)} replace />;
      return (
        <div className="mx-auto max-w-lg space-y-4 p-8">
          <p role="alert">Access restricted. This account cannot use this portal.</p>
          <button type="button" onClick={logout} className="rounded border px-4 py-2">Log out</button>
        </div>
      );
    }
    return <Outlet />;
  }

  function RequireEnrollable() {
    const { status, user } = useAuth();
    if (status === "initializing") return <Spinner className="min-h-screen" label="Loading..." />;
    if (status === "guest") return <Navigate to="/login" replace />;
    if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
    return <Outlet />;
  }

  function RequireOwnUniversity() {
    const { user } = useAuth();
    const { universityId } = useParams();
    if (!ownUniversity) return <Outlet />;
    if (String(universityId) !== String(user.university_id)) {
      return <Navigate to={`/university/${user.university_id}/profiles`} replace />;
    }
    return <Outlet />;
  }

  return { RequireAuth, RequireRole, RequireEnrollable, RequireOwnUniversity };
}

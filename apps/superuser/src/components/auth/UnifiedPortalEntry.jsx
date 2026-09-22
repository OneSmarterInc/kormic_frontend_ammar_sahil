import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import Spinner from "../common/Spinner";
import { useAuth } from "../../context/AuthContext";

const PORTAL = "superuser";

export default function UnifiedPortalEntry() {
  const { status, user } = useAuth();

  useEffect(() => {
    if (status !== "guest" && status !== "must_enroll_totp") return;
    const target = new URL("/login", window.location.origin);
    target.searchParams.set("portal", PORTAL);
    window.location.replace(target.pathname + target.search);
  }, [status]);

  if (status === "initializing" || status === "guest" || status === "must_enroll_totp") {
    return <Spinner className="min-h-screen" label="Opening Kormic Login..." />;
  }

  if (user?.role !== PORTAL) {
    return (
      <div className="mx-auto max-w-lg p-8" role="alert">
        This account cannot use the administrator workspace.
        <a className="ml-2 text-brand-600 underline" href="/login">Return to Kormic Login</a>
      </div>
    );
  }

  

  return <Navigate to={"/admin/dashboard"} replace />;
}

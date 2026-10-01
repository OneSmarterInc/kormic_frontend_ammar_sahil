import { Navigate, Outlet } from "react-router-dom";
import Spinner from "../common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../lib/constants";
import { createPortalGuards } from "@kormic/portal-core/guards.jsx";

export const { RequireAuth, RequireEnrollable, RequireOwnUniversity } = createPortalGuards({
  useAuth,
  roleHome,
  Spinner,
  roleMismatch: "redirect",
  ownUniversity: true,
});

export function RequireRole({role}) { const {user}=useAuth(); return (user.role===role || (role==="university" && user.role==="department")) ? <Outlet/> : <Navigate to="/access-restricted" replace/>; }

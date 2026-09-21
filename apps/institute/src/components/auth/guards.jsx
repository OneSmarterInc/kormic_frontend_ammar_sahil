import Spinner from "../common/Spinner";
import { useAuth } from "../../context/AuthContext";
import { roleHome } from "../../lib/constants";
import { createPortalGuards } from "../../../../../packages/portal-core/src/guards.jsx";

export const { RequireAuth, RequireRole, RequireEnrollable, RequireOwnUniversity } = createPortalGuards({
  useAuth,
  roleHome,
  Spinner,
  roleMismatch: "restricted",
  ownUniversity: false,
});

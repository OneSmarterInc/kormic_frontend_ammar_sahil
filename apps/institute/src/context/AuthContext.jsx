import * as authApi from "../api/authApi";
import { createPortalAuth } from "@kormic/portal-core/AuthContext.jsx";

export const { AuthProvider, useAuth } = createPortalAuth(authApi);

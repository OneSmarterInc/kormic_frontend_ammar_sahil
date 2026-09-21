import * as authApi from "../api/authApi";
import { createPortalAuth } from "../../../../packages/portal-core/src/AuthContext.jsx";

export const { AuthProvider, useAuth } = createPortalAuth(authApi);

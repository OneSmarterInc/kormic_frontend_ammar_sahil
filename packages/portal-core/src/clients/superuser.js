import { createPortalClient } from "../client.js";

const bundle = createPortalClient("superuser");
export const { BASE_URL, PORTAL, cookieTransport, cookiePost, requestRefresh } = bundle;
export default bundle.client;

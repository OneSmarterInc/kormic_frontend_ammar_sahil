import client from "./client";

/* ---------- Institute list upload — /api/institute-lists/ ---------- */
/* Self-service endpoints: the backend scopes every one of these to the
 * logged-in institute officer's own institute automatically. */

/**
 * POST /api/institute-lists/upload/ — multipart/form-data.
 * `formData` must include file, institute_id, contact_name, contact_email
 * (contact_verification optional).
 */
export const uploadInstituteList = (formData) =>
  client
    .post("/institute-lists/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

/**
 * GET /api/institute-lists/lists/ — every roster this institute has uploaded.
 * Each list object also carries the originally-uploaded file: source_file_url,
 * source_file_name, source_file_size (bytes).
 */
export const listInstituteLists = (instituteId) =>
  client
    .get("/institute-lists/lists/", { params: instituteId ? { institute_id: instituteId } : {} })
    .then((r) => r.data);

/** GET /api/institute-lists/lists/<list_id>/students/ — the uploaded roster + each row's claim status */
export const getInstituteListStudents = (listId) =>
  client.get(`/institute-lists/lists/${encodeURIComponent(listId)}/students/`).then((r) => r.data);

/**
 * POST /api/institute-lists/lists/<list_id>/send-invites/ — emails every
 * unclaimed, not-yet-invited row a claim link. Pass resend=true to re-send
 * to rows that were already invited.
 */
export const sendInstituteListInvites = (listId, resend = false) =>
  client
    .post(`/institute-lists/lists/${encodeURIComponent(listId)}/send-invites/`, resend ? { resend: true } : {})
    .then((r) => r.data);

/**
 * POST /api/institute-lists/lists/<list_id>/students/<student_id>/send-invite/
 * — sends (or resends) the claim-link invite to exactly one student row,
 * bypassing the "already invited" skip that the bulk send-invites endpoint applies.
 */
export const sendInstituteListStudentInvite = (listId, studentId) =>
  client
    .post(
      `/institute-lists/lists/${encodeURIComponent(listId)}/students/${encodeURIComponent(studentId)}/send-invite/`
    )
    .then((r) => r.data);

/**
 * GET a list's originally-uploaded file, from its `source_file_url`. That
 * endpoint requires auth like everything else, so it can't be a plain <a
 * href> — fetch it through the shared client (which attaches the bearer
 * token) as a blob and hand it to utils/download.js's saveBlob.
 */
export const downloadInstituteListFile = (url) =>
  client.get(url, { responseType: "blob" }).then((r) => r.data);

import client from "./client.js";

/* ---------- Students — /api/superuser/students/ ---------- */

/** GET /api/superuser/students/?search= */
export const listStudents = (search) =>
  client.get("/superuser/students/", { params: search ? { search } : {} }).then((r) => r.data);

/** POST /api/superuser/students/ */
export const createStudent = (payload) =>
  client.post("/superuser/students/", payload).then((r) => r.data);

/** GET /api/superuser/students/<student_id>/ */
export const getStudent = (studentId) =>
  client.get(`/superuser/students/${encodeURIComponent(studentId)}/`).then((r) => r.data);

/** DELETE /api/superuser/students/<student_id>/ — full purge, cascades everything */
export const deleteStudent = (studentId) =>
  client.delete(`/superuser/students/${encodeURIComponent(studentId)}/`);

/* ---------- Universities — /api/superuser/universities/ ---------- */

/** GET /api/superuser/universities/?search= */
export const listUniversities = (search) =>
  client.get("/superuser/universities/", { params: search ? { search } : {} }).then((r) => r.data);

/** POST /api/superuser/universities/ */
export const createUniversity = (payload) =>
  client.post("/superuser/universities/", payload).then((r) => r.data);

/** GET /api/superuser/universities/<id>/ */
export const getUniversity = (id) =>
  client.get(`/superuser/universities/${encodeURIComponent(id)}/`).then((r) => r.data);

/** PATCH /api/superuser/universities/<id>/ */
export const updateUniversity = (id, payload) =>
  client.patch(`/superuser/universities/${encodeURIComponent(id)}/`, payload).then((r) => r.data);

/** DELETE /api/superuser/universities/<id>/ — 409 if officer accounts still reference it */
export const deleteUniversity = (id) =>
  client.delete(`/superuser/universities/${encodeURIComponent(id)}/`);

/* ---------- Users (cross-role) — /api/superuser/users/ ---------- */

/** GET /api/superuser/users/?role=&search= */
export const listUsers = ({ role, search } = {}) =>
  client
    .get("/superuser/users/", {
      params: { ...(role ? { role } : {}), ...(search ? { search } : {}) },
    })
    .then((r) => r.data);

/** GET /api/superuser/users/<user_id>/ */
export const getUser = (userId) =>
  client.get(`/superuser/users/${encodeURIComponent(userId)}/`).then((r) => r.data);

/** PATCH /api/superuser/users/<user_id>/ — activate/deactivate */
export const setUserActive = (userId, isActive) =>
  client
    .patch(`/superuser/users/${encodeURIComponent(userId)}/`, { is_active: isActive })
    .then((r) => r.data);

/** DELETE /api/superuser/users/<user_id>/ — removes only the login, not profile/university rows */
export const deleteUser = (userId) =>
  client.delete(`/superuser/users/${encodeURIComponent(userId)}/`);

/** POST /api/superuser/users/create-superuser/ */
export const createSuperuser = (payload) =>
  client.post("/superuser/users/create-superuser/", payload).then((r) => r.data);

/* ---------- Per-user account actions — /api/superuser/users/<user_id>/... ---------- */

/** POST /api/superuser/users/<user_id>/remove-totp/ — strip 2FA, forces re-enrollment on next login */
export const removeUserTotp = (userId) =>
  client.post(`/superuser/users/${encodeURIComponent(userId)}/remove-totp/`).then((r) => r.data);

/** POST /api/superuser/users/<user_id>/reset-password/ — sets password directly, revokes outstanding refresh tokens */
export const resetUserPassword = (userId, password) =>
  client
    .post(`/superuser/users/${encodeURIComponent(userId)}/reset-password/`, { password })
    .then((r) => r.data);

/** POST /api/superuser/users/<user_id>/revoke-sessions/ — blacklists every outstanding refresh token */
export const revokeUserSessions = (userId) =>
  client.post(`/superuser/users/${encodeURIComponent(userId)}/revoke-sessions/`).then((r) => r.data);

/* ---------- Institutes — /api/superuser/institutes/ ---------- */
/* Feeder institutes are distinct from Universities: no AI-agent config,
 * just a profile + one admin login that uploads student rosters. */

/** GET /api/superuser/institutes/?search= */
export const listInstitutes = (search) =>
  client.get("/superuser/institutes/", { params: search ? { search } : {} }).then((r) => r.data);

/** POST /api/superuser/institutes/ — creates the institute row + its admin login */
export const createInstitute = (payload) =>
  client.post("/superuser/institutes/", payload).then((r) => r.data);

/** GET /api/superuser/institutes/<id>/ */
export const getInstitute = (id) =>
  client.get(`/superuser/institutes/${encodeURIComponent(id)}/`).then((r) => r.data);

/** PATCH /api/superuser/institutes/<id>/ */
export const updateInstitute = (id, payload) =>
  client.patch(`/superuser/institutes/${encodeURIComponent(id)}/`, payload).then((r) => r.data);

/** DELETE /api/superuser/institutes/<id>/ — 409 if it still has an admin account or uploaded lists */
export const deleteInstitute = (id) =>
  client.delete(`/superuser/institutes/${encodeURIComponent(id)}/`);

/* ---------- Institute list upload — /api/institute-lists/ ---------- */

/**
 * POST /api/institute-lists/upload/ — multipart/form-data.
 * `formData` must include file, institute_id, contact_name, contact_email
 * (contact_verification optional). Institute officers may only upload for
 * their own institute_id; superuser can upload on behalf of any institute.
 */
export const uploadInstituteList = (formData) =>
  client
    .post("/institute-lists/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

/**
 * GET /api/institute-lists/lists/?institute_id= — superuser sees all, institute_id narrows to one.
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

/* ---------- Audit log — /api/superuser/audit-log/ ---------- */

/** GET /api/superuser/audit-log/?user_id=&action=&limit= */
export const listAuditLog = ({ userId, action, limit } = {}) =>
  client
    .get("/superuser/audit-log/", {
      params: {
        ...(userId ? { user_id: userId } : {}),
        ...(action ? { action } : {}),
        ...(limit ? { limit } : {}),
      },
    })
    .then((r) => r.data);

/** GET /api/superuser/agent-audit-logs/?since_id=&student_id=&limit= */
export const listAgentAuditLog = ({ sinceId, studentId, limit } = {}) =>
  client
    .get("/superuser/agent-audit-logs/", {
      params: {
        ...(sinceId ? { since_id: sinceId } : {}),
        ...(studentId ? { student_id: studentId } : {}),
        ...(limit ? { limit } : {}),
      },
    })
    .then((r) => r.data);

/**
 * GET /api/superuser/metrics/escalations/?university_id=&weeks=
 * Both params optional. Omit universityId to combine every university;
 * weeks defaults to 12 server-side, capped at 52.
 */
export const getEscalationMetrics = ({ universityId, weeks } = {}) =>
  client
    .get("/superuser/metrics/escalations/", {
      params: {
        ...(universityId ? { university_id: universityId } : {}),
        ...(weeks ? { weeks } : {}),
      },
    })
    .then((r) => r.data);

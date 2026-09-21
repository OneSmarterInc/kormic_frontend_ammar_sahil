import client from "./client";

/** GET /api/queries/pending/ — flat, all-university pending list */
export const listPendingQueries = () => client.get("/queries/pending/").then((r) => r.data);

/** POST /api/queries/answer/ — first-time answer (refuses if already resolved) */
export const answerQuery = (queryId, answer, answeredBy) =>
  client
    .post("/queries/answer/", { query_id: queryId, answer, answered_by: answeredBy })
    .then((r) => r.data);

/** POST /api/queries/<query_id>/edit/ — works even if already resolved */
export const editQueryAnswer = (queryId, answer, answeredBy) =>
  client
    .post(`/queries/${encodeURIComponent(queryId)}/edit/`, {
      answer,
      answered_by: answeredBy,
    })
    .then((r) => r.data);

/** POST /api/queries/<query_id>/ignore/ — soft-dismiss, keeps the row. Refuses if already resolved. */
export const ignoreQuery = (queryId, { reason, ignoredBy } = {}) =>
  client
    .post(`/queries/${encodeURIComponent(queryId)}/ignore/`, {
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
      ...(ignoredBy?.trim() ? { ignored_by: ignoredBy.trim() } : {}),
    })
    .then((r) => r.data);

/** DELETE /api/queries/<query_id>/ — hard delete, permanent. 204 No Content. */
export const deleteQuery = (queryId) =>
  client.delete(`/queries/${encodeURIComponent(queryId)}/`).then((r) => r.data);

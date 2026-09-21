import client from "./client";

/** GET /api/profile/<student_id>/image/ — raw image bytes; caller should treat 404 as "no picture" */
export const getProfileImage = (studentId) =>
  client
    .get(`/profile/${encodeURIComponent(studentId)}/image/`, { responseType: "blob" })
    .then((r) => r.data);

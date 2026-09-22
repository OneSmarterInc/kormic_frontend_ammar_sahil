import client from "./client";

/** GET /api/assessments/<student_id>/ — every university's fit assessment for a student */
export const getAssessmentHistory = (studentId) =>
  client.get(`/assessments/${encodeURIComponent(studentId)}/`).then((r) => r.data);

/** GET /api/assessments/<university_id>/<student_id>/ — one university+student pair */
export const getAssessmentDetail = (universityId, studentId) =>
  client
    .get(`/assessments/${encodeURIComponent(universityId)}/${encodeURIComponent(studentId)}/`)
    .then((r) => r.data);

import client from "./client";

/** GET /api/university/<university_id>/profiles/ — essentials only per student */
export const listUniversityProfiles = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/profiles/`, { signal })
    .then((r) => r.data);

/** GET /api/university/<university_id>/profile/<student_id>/ — full profile for the detail view */
export const getUniversityProfile = (universityId, studentId, signal) =>
  client
    .get(
      `/university/${encodeURIComponent(universityId)}/profile/${encodeURIComponent(studentId)}/`,
      { signal }
    )
    .then((r) => r.data);

/** POST /api/university/<university_id>/profile/<student_id>/chat/ — Profile Presenter */
export const chatWithPresenter = (universityId, studentId, question, history = []) =>
  client
    .post(
      `/university/${encodeURIComponent(universityId)}/profile/${encodeURIComponent(
        studentId
      )}/chat/`,
      { question, history }
    )
    .then((r) => r.data);

/** GET /api/university/<university_id>/profile/<student_id>/chat/history/ */
export const getPresenterChatHistory = (universityId, studentId, signal) =>
  client
    .get(
      `/university/${encodeURIComponent(universityId)}/profile/${encodeURIComponent(
        studentId
      )}/chat/history/`,
      { signal }
    )
    .then((r) => r.data);

/** POST /api/university/<university_id>/chat/ — preview the university's own program agent */
export const chatWithUniversityAgent = (universityId, message) =>
  client
    .post(`/university/${encodeURIComponent(universityId)}/chat/`, { message })
    .then((r) => r.data);

/** GET /api/university/<university_id>/chat/history/ */
export const getUniversityChatHistory = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/chat/history/`, { signal })
    .then((r) => r.data);

/** DELETE /api/university/<university_id>/chat/history/ — clears the logged preview conversation */
export const deleteUniversityChatHistory = (universityId) =>
  client.delete(`/university/${encodeURIComponent(universityId)}/chat/history/`).then((r) => r.data);

/** GET /api/university/<university_id>/queries/ */
export const listAllQueries = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/queries/`, { signal })
    .then((r) => r.data);

/** GET /api/university/<university_id>/queries/active/ */
export const listActiveQueries = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/queries/active/`, { signal })
    .then((r) => r.data);

/** GET /api/university/<university_id>/queries/archive/ */
export const listArchivedQueries = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/queries/archive/`, { signal })
    .then((r) => r.data);

/** GET /api/university/<university_id>/knowledge/verified/ */
export const listVerifiedKnowledge = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/knowledge/verified/`, { signal })
    .then((r) => r.data);

/** GET /api/university/<university_id>/questions/ */
export const listQuestionLog = (universityId, signal) =>
  client
    .get(`/university/${encodeURIComponent(universityId)}/questions/`, { signal })
    .then((r) => r.data);

import { Platform } from 'react-native';
import { AgentJob, newRequestId, waitForAgentJob } from './agentJobs';
import { GithubJob, waitForGithubJob } from './githubJobs';
import { resolveApiBaseUrl } from './apiBaseUrl';
import { AuthSession, AuthUser, BasicInfo, LinkedInScreenshot, SelectedCvFile } from '../models/onboarding';
import { clearSavedTokens, getSavedTokens, getTokenGeneration, getSavedRefreshToken, saveAccessToken, saveRefreshToken } from './tokenStorage';
import { parseGraduationYear } from '../utils/validation';

declare const process: { env: Record<string, string | undefined> };

// Expo inlines this variable; the unified build derives it from root .env.
const envApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
if (!envApiBaseUrl) throw new Error('Set KORMIC_API_ORIGIN_LOCAL and KORMIC_API_ORIGIN_PUBLIC in the frontend .env and rebuild.');
const browserHostname = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location?.hostname : undefined;
export const API_BASE_URL = resolveApiBaseUrl(envApiBaseUrl, browserHostname, process.env.EXPO_PUBLIC_LOCAL_API_BASE_URL);

interface ApiErrorBody {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export const isSessionRejected = (error: unknown) => error instanceof ApiRequestError && error.status === 401;

const sessionExpiredListeners = new Set<() => void>();
export function subscribeSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

async function rejectSession(): Promise<never> {
  await clearSavedTokens();
  sessionExpiredListeners.forEach(listener => listener());
  throw new ApiRequestError('Your session expired. Please sign in again.', 401);
}

async function handleRefreshFailure(error: unknown): Promise<never> {
  if (isSessionRejected(error)) {
    return rejectSession();
  }
  // Offline, timeouts and server failures do not revoke a valid login.
  throw new Error('Could not reconnect to your session. Please retry when connected.');
}

export interface RegisterResponse {
  message?: string;
  must_enroll_totp?: boolean;
  access?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: AuthUser;
  detail?: string;
}

export interface LoginResponse {
  must_enroll_totp?: boolean;
  access?: string;
  refresh?: string;
  user?: AuthUser;
  mfa_token?: string;
  totp_required?: boolean;
  expires_in?: number;
  access_token?: string;
  refresh_token?: string;
  detail?: string;
  message?: string;
}

export interface TotpEnrollResponse {
  secret?: string;
  provisioning_uri?: string;
  detail?: string;
  message?: string;
}

export interface TotpVerifyEnrollmentResponse {
  access?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: AuthUser;
  backup_codes?: string[];
  detail?: string;
  message?: string;
}

export interface VerifyTotpLoginResponse {
  access: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user: AuthUser;
  detail?: string;
  message?: string;
}

export interface MeResponse extends AuthUser {}

export interface RefreshResponse {
  access: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  user?: AuthUser;
}

export interface ForgotPasswordResponse {
  detail: string;
}

export interface VerifyResetOtpResponse {
  reset_token: string;
  expires_in: number;
}

export interface ConfirmResetPasswordResponse {
  detail: string;
}

export interface ClaimStartResponse {
  sent: boolean;
}

export interface ClaimPrefillResponse {
  full_name: string;
  email: string;
  field_of_study: string;
  degree_level: string;
  expected_graduation: string;
  phone: string;
  year_in_college: string;
  program_name: string;
  city: string;
  country: string;
  region: string;
  state: string;
  institute_id?: string;
  institute_name?: string;
}

export interface ClaimVerifyResponse {
  claim_session: string;
  prefill: ClaimPrefillResponse;
}

export interface ClaimConfirmResponse {
  status?: string;
  student_id?: string;
  confirmed?: Partial<ClaimPrefillResponse>;
  divergences_recorded?: number;
  badge?: {
    institute_sourced?: boolean;
    institute_name?: string;
  };
}


export interface ResumeRecord {
  id: number | string;
  original_filename?: string;
  resume_url?: string;
  extracted_data?: Record<string, unknown>;
  created_at?: string;
}

export interface ResumeListResponse {
  resumes: ResumeRecord[];
}

export interface LinkedInHistoryRecord {
  id?: number | string;
  image?: string;
  image_url?: string;
  file_path?: string;
  screenshot?: string;
  uploaded_image_url?: string;
  index?: number;
  original_filename?: string;
  filename?: string;
  extracted_data?: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface LinkedInAnalysisRecord {
  id?: number | string;
  images?: LinkedInHistoryRecord[];
  extracted?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface LinkedInHistoryResponse {
  analyses?: LinkedInAnalysisRecord[];
  images?: LinkedInHistoryRecord[];
  screenshots?: LinkedInHistoryRecord[];
  linkedin?: LinkedInHistoryRecord[];
  results?: LinkedInHistoryRecord[];
  history?: LinkedInHistoryRecord[];
}

export interface ProfileImageFile {
  uri?: string;
  name: string;
  type?: string;
  file?: Blob;
}

export interface ProfileImageResponse {
  status?: string;
  student_id?: string;
  profile_image_url?: string | null;
  message?: string;
}

export interface AriaAttachment {
  id: number | string;
  filename: string;
  content_type?: string;
  size_bytes?: number;
  url?: string;
}

export interface ChatAttachmentFile {
  uri?: string;
  name: string;
  type?: string;
  file?: Blob;
  size?: number;
}

export interface AriaChatResponse {
  meta?: Record<string, unknown>;
  job_id?: string;
  status?: string;
  result?: AriaChatResponse;
  error?: string;
  agent?: string;
  student_id?: string;
  reply?: string;
  message?: string;
  message_id?: number | string;
  pending?: boolean;
  query_id?: number | string | null;
  confidence?: number | null;
  attachments?: AriaAttachment[];
}

export interface AriaEditResponse extends AriaChatResponse {
  edited_at?: string | null;
}

export interface AgentNameResponse {
  agent_name?: string;
  agent?: string;
  name?: string;
  student_id?: string;
  detail?: string;
  message?: string;
}

export interface GithubConnectResponse {
  authorize_url: string;
}

export interface GithubStatusResponse {
  connected: boolean;
  github_username?: string;
  connected_at?: string;
}

export interface GithubAnalysisResponse {
  status?: string;
  student_id?: string;
  github_username?: string;
  skills_added?: string[];
  github_result?: Record<string, unknown>;
  message?: string;
}

export type GithubSyncJob = GithubAnalysisResponse & GithubJob<GithubAnalysisResponse>;
export interface GithubOverviewResponse {
  connected: boolean;
  sync: GithubSyncJob | null;
  profile: {
    identity: { login?: string; name?: string; bio?: string; location?: string; followers?: number; following?: number };
    overview: string;
    statistics: { repositories?: number; owned?: number; private?: number; forks?: number; stars?: number };
    languages: Array<{ name: string; repositories: number }>;
    technologies: Array<{ name: string; projects: number }>;
    domains: Array<{ name: string; projects: number }>;
    coverage: { note?: string; repository_list_complete?: boolean; source_projects_analyzed?: number };
    warnings: Array<{ resource: string; detail: string }>;
    synced_at: string | null;
  } | null;
}
export interface GithubRepositoryPage {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Array<{ id: number; name: string }>;
}

export interface GithubHistoryResponse {
  student_id?: string;
  count?: number;
  analyses?: Array<{
    github_url?: string;
    github_username?: string;
    result?: Record<string, unknown>;
    github_result?: Record<string, unknown>;
    skills_added?: string[];
    created_at?: string;
  }>;
}

export interface AriaConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AriaHistoryMessage {
  id?: number | string;
  sender: 'user' | 'assistant' | string;
  content: string;
  created_at?: string;
  edited_at?: string | null;
  meta?: Record<string, unknown>;
  escalation?: {
    query_id?: number | null;
    status?: 'pending' | 'resolved' | 'ignored' | string;
  } | null;
  attachments?: AriaAttachment[];
}

export interface AriaHistoryResponse {
  count?: number;
  messages?: AriaHistoryMessage[];
}

async function parseJson<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  return JSON.parse(text) as T;
}

function getApiError(data: ApiErrorBody | undefined, fallback: string) {
  if (!data) {
    return fallback;
  }

  if (data.message || data.detail || data.error) {
    return data.message || data.detail || data.error || fallback;
  }

  const fieldError = Object.entries(data).find(([, value]) => Array.isArray(value) && value.length > 0);
  if (fieldError) {
    const [field, value] = fieldError;
    return `${field}: ${(value as string[]).join(' ')}`;
  }

  if (data.errors && typeof data.errors === 'object') {
    const nestedFieldError = Object.entries(data.errors as Record<string, unknown>).find(
      ([, value]) => Array.isArray(value) && value.length > 0,
    );
    if (nestedFieldError) {
      const [field, value] = nestedFieldError;
      return `${field}: ${(value as string[]).join(' ')}`;
    }
  }

  return fallback;
}

async function requestJson<T>(path: string, init: RequestInit, fallbackError: string): Promise<T> {
  let requestPath = path;
  if (Platform.OS === 'web' && ['/auth/login/', '/auth/register/', '/auth/verify-totp/', '/auth/refresh/', '/auth/logout/'].includes(path)) {
    requestPath = path.replace('/auth/', '/auth/web/');
    const refreshOnly = path === '/auth/refresh/';
    let csrfToken = '';
    if (!refreshOnly) {
      const csrfResponse = await fetch(`${API_BASE_URL}/auth/web/csrf/`, { credentials: 'include' });
      if (!csrfResponse.ok) throw new Error('Unable to initialize secure session');
      const csrf = await csrfResponse.json();
      csrfToken = typeof csrf.csrfToken === 'string' ? csrf.csrfToken : '';
      if (!csrfToken) throw new Error('Unable to initialize secure session');
    }
    init = {
      ...init,
      credentials: 'include',
      headers: {
        ...init.headers,
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      },
      body: JSON.stringify({ ...(typeof init.body === 'string' ? JSON.parse(init.body) : {}), portal: 'student' }),
    };
  }
  const response = await fetch(`${API_BASE_URL}${requestPath}`, init);
  const data = await parseJson<T & ApiErrorBody>(response);

  if (!response.ok) {
    throw new ApiRequestError(getApiError(data, fallbackError), response.status);
  }

  return (data ?? {}) as T;
}

export function getAccessToken(data: { access?: string; access_token?: string }) {
  return data.access ?? data.access_token;
}

export function getRefreshToken(data: { refresh?: string; refresh_token?: string }) {
  return data.refresh ?? data.refresh_token;
}

async function performRefresh(refreshToken?: string) {
  const data = await requestJson<RefreshResponse>(
    '/auth/refresh/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Platform.OS === 'web' ? {} : { refresh: refreshToken }),
    },
    'Unable to refresh session',
  );
  const access = getAccessToken(data);

  if (!access) {
    throw new Error('Unable to refresh session');
  }

  return {
    ...data,
    access,
    refresh: getRefreshToken(data),
  };
}

let webRefreshPromise: ReturnType<typeof performRefresh> | undefined;
export function refreshAccessToken(refreshToken?: string) {
  if (!webRefreshPromise) {
    const generation = getTokenGeneration();
    webRefreshPromise = (async () => {
      // Native screens can retain older session objects after token rotation.
      const current = Platform.OS === 'web' ? undefined : (await getSavedRefreshToken()) || refreshToken;
      const result = await performRefresh(current);
      if (generation !== getTokenGeneration()) throw new Error('Session changed');
      await saveAccessToken(result.access);
      if (result.refresh) await saveRefreshToken(result.refresh);
      return result;
    })().finally(() => { webRefreshPromise = undefined; });
  }
  return webRefreshPromise;
}

export async function logoutSession(session?: AuthSession) {
  const refresh = (await getSavedRefreshToken()) || session?.refresh;
  // Prevent an in-flight refresh from restoring a session after logout.
  await clearSavedTokens();
  if (Platform.OS !== 'web' && !refresh) return;
  await requestJson('/auth/logout/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(session?.access ? { Authorization: `Bearer ${session.access}` } : {}) },
    body: JSON.stringify(Platform.OS === 'web' ? {} : { refresh }),
  }, 'Unable to sign out');
}

// Every protected API request uses the latest stored credentials, including
// requests started by screens holding a session from before token rotation.
export async function fetchWithSession(
  session: AuthSession,
  url: string,
  initForAccessToken: (accessToken: string) => RequestInit,
): Promise<Response> {
  const generation = getTokenGeneration();
  const ensureCurrentSession = () => {
    if (generation !== getTokenGeneration()) throw new Error('Session changed. Please sign in again.');
  };
  const saved = await getSavedTokens();
  ensureCurrentSession();
  let access = saved?.access || session.access;
  let refresh = saved?.refresh || session.refresh;
  if (!access) return rejectSession();
  let response = await fetch(url, initForAccessToken(access));
  ensureCurrentSession();
  if (response.status === 401) {
    // A delayed 401 may arrive after another request already rotated tokens.
    const latest = await getSavedTokens();
    ensureCurrentSession();
    if (latest?.access && latest.access !== access) {
      access = latest.access;
      refresh = latest.refresh || refresh;
      response = await fetch(url, initForAccessToken(access));
      ensureCurrentSession();
    }
    if (response.status === 401) {
      if (Platform.OS !== 'web' && !refresh) return rejectSession();
      try {
        const refreshed = await refreshAccessToken(refresh);
        ensureCurrentSession();
        access = refreshed.access;
        refresh = refreshed.refresh || refresh;
      } catch (error) {
        ensureCurrentSession();
        return handleRefreshFailure(error);
      }
      response = await fetch(url, initForAccessToken(access));
      ensureCurrentSession();
      if (response.status === 401) return rejectSession();
    }
  }
  session.access = access;
  session.refresh = refresh;
  return response;
}

async function requestWithSession<T>(
  session: AuthSession,
  path: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
): Promise<T> {
  const response = await fetchWithSession(session, `${API_BASE_URL}${path}`, initForAccessToken);
  const data = await parseJson<T & ApiErrorBody>(response);
  if (!response.ok) throw new ApiRequestError(getApiError(data, fallbackError), response.status);
  return (data ?? {}) as T;
}

async function requestBlobWithSession(
  session: AuthSession,
  path: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
) {
  return requestBlobUrlWithSession(session, `${API_BASE_URL}${path}`, initForAccessToken, fallbackError);
}

async function requestBlobUrlWithSession(
  session: AuthSession,
  url: string,
  initForAccessToken: (accessToken: string) => RequestInit,
  fallbackError: string,
) {
  const response = await fetchWithSession(session, url, initForAccessToken);
  if (!response.ok) {
    const data = await parseJson<ApiErrorBody>(response);
    throw new ApiRequestError(getApiError(data, fallbackError), response.status);
  }
  return response.blob();
}

function appendChatAttachment(formData: FormData, attachment: ChatAttachmentFile) {
  if (attachment.file) {
    formData.append('attachments', attachment.file, attachment.name);
    return;
  }

  if (attachment.uri) {
    formData.append('attachments', {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.type || 'application/octet-stream',
    } as unknown as Blob);
  }
}

function authHeaders(accessToken: string, contentType = 'application/json') {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...(contentType ? { 'Content-Type': contentType } : {}),
  };
}

function normalizeProfileResponse(data: Record<string, unknown>) {
  const nestedProfile = data.profile;
  if (!nestedProfile || typeof nestedProfile !== 'object') {
    return data;
  }

  const profile = nestedProfile as Record<string, unknown>;
  return {
    ...data,
    ...profile,
    profile,
    student_id: profile.student_id ?? data.student_id,
    created_at: profile.created_at ?? data.created_at,
    updated_at: profile.updated_at ?? data.updated_at,
  };
}

export function registerStudent(payload: {
  email: string;
  password: string;
  name: string;
}) {
  return requestJson<RegisterResponse>(
    '/auth/register/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, role: 'student' }),
    },
    'Unable to create account',
  );
}

export function startStudentClaim(token: string) {
  return requestJson<ClaimStartResponse>(
    '/claim/start/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    },
    'Unable to start invitation claim',
  );
}

export function verifyStudentClaim(payload: { token: string; code: string }) {
  return requestJson<ClaimVerifyResponse>(
    '/claim/verify/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: payload.token.trim(),
        code: payload.code.trim(),
      }),
    },
    'Unable to verify invitation code',
  );
}

export function confirmStudentClaim(payload: {
  claimSession: string;
  fields: {
    full_name: string;
    field_of_study: string;
    degree_level: string;
    expected_graduation: string;
    phone: string;
    year_in_college: string;
    program_name: string;
    city: string;
    country: string;
    region: string;
    state: string;
  };
}) {
  return requestJson<ClaimConfirmResponse>(
    '/claim/confirm/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_session: payload.claimSession,
        fields: payload.fields,
      }),
    },
    'Unable to confirm invitation claim',
  );
}

export function loginStudent(payload: { email: string; password: string }) {
  return requestJson<LoginResponse>(
    '/auth/login/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, portal: 'student' }),
    },
    'Unable to sign in',
  );
}

export function requestPasswordResetOtp(email: string) {
  return requestJson<ForgotPasswordResponse>(
     '/auth/forgot-password/',
     {
      method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email: email.trim() }),
     },
     'Unable to send reset code',
   );
 }
 
 export function verifyPasswordResetOtp(payload: { email: string; otp: string }) {
   return requestJson<VerifyResetOtpResponse>(
     '/auth/reset-password/verify-otp/',
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ email: payload.email.trim(), otp: payload.otp.trim() }),
     },
     'Unable to verify reset code',
   );
 }
 
 export function confirmPasswordReset(payload: { resetToken: string; newPassword: string }) {
   return requestJson<ConfirmResetPasswordResponse>(
     '/auth/reset-password/confirm/',
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         reset_token: payload.resetToken,
         new_password: payload.newPassword,
       }),
     },
     'Unable to reset password',
   );
 }
 

export function enrollTotp(accessToken: string) {
  return requestJson<TotpEnrollResponse>(
    '/auth/totp/enroll/',
    {
      method: 'POST',
      headers: authHeaders(accessToken, ''),
    },
    'Unable to start TOTP enrollment',
  );
}

export function verifyTotpEnrollment(accessToken: string, code: string) {
  return requestJson<TotpVerifyEnrollmentResponse>(
    '/auth/totp/verify-enrollment/',
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ code }),
    },
    'Unable to verify the TOTP code',
  );
}

export function verifyTotpLogin(mfaToken: string, code: string) {
  return requestJson<VerifyTotpLoginResponse>(
    '/auth/verify-totp/',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, code, portal: 'student' }),
    },
    'Unable to verify the TOTP code',
  );
}

export function getMe(accessToken: string) {
  return requestJson<MeResponse>(
    '/auth/me/',
    {
      method: 'GET',
      headers: authHeaders(accessToken),
    },
    'Unable to restore session',
  );
}

export function createStudentProfile(session: AuthSession, basicInfo: BasicInfo) {
  const graduationYear = parseGraduationYear(basicInfo.expectedGraduation);

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        name: session.user?.name || basicInfo.fullName,
        email: session.user?.email || basicInfo.email,
        phone: basicInfo.phone,
        date_of_birth: basicInfo.dateOfBirth,
        dateOfBirth: basicInfo.dateOfBirth,
        city: basicInfo.city,
        region: basicInfo.region,
        year_in_college: basicInfo.yearInCollege,
        yearInCollege: basicInfo.yearInCollege,
        country: basicInfo.country,
        institution: basicInfo.college,
        major: basicInfo.fieldOfStudy,
        program: basicInfo.degreeLevel,
        graduation_year: graduationYear,
        interests: basicInfo.interests,
        target_degree_or_field: basicInfo.targetDegreeOrField,
      }),
    }),
    'Unable to create student profile',
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    if (message.includes('exist') || message.includes('already')) {
      return {};
    }

    throw error;
  });
}

export type DocumentUploadOptions = { onProgress?: (job: AgentJob<Record<string, unknown>>) => void };

export function uploadResume(session: AuthSession, file: SelectedCvFile, options?: DocumentUploadOptions) {
  const requestId = newRequestId();
  const formData = new FormData();
  if (file.file) {
    formData.append('file', file.file, file.name);
  } else if (file.uri) {
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || (file.type === 'pdf' ? 'application/pdf' : 'application/msword'),
    } as unknown as Blob);
  } else {
    throw new Error('Choose a resume file before uploading.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/resume/',
    (accessToken) => ({
      method: 'POST',
      headers: { ...authHeaders(accessToken, ''), Prefer: 'respond-async', 'Idempotency-Key': requestId },
      body: formData,
    }),
    'Unable to upload resume',
  ).then(result => waitForDocumentJob(session, result, options));
}

function waitForDocumentJob(session: AuthSession, result: Record<string, unknown>, options?: DocumentUploadOptions) {
  return waitForAgentJob<Record<string, unknown>>(result, id => requestWithSession<Record<string, unknown>>(
    session, `/chat/jobs/${encodeURIComponent(id)}/`, token => ({method:'GET', headers:authHeaders(token)}),
    'Unable to check document processing'), undefined, options?.onProgress);
}

export function getGithubConnectUrl(session: AuthSession) {
  return requestWithSession<GithubConnectResponse>(
    session,
    '/auth/github/connect/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to start GitHub OAuth',
  );
}

export function getGithubStatus(session: AuthSession) {
  return requestWithSession<GithubStatusResponse>(
    session,
    '/auth/github/status/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to check GitHub connection',
  );
}

export function startGithubSync(session: AuthSession) {
  return requestWithSession<GithubSyncJob>(
    session,
    '/profile/github/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    }),
    'Unable to analyze GitHub',
  );
}

export function getGithubSyncJob(session: AuthSession, id: string) {
  return requestWithSession<GithubSyncJob>(session, `/profile/github/jobs/${encodeURIComponent(id)}/`,
    (token) => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to check GitHub extraction');
}

export async function analyzeGithub(session: AuthSession, options: { signal?: AbortSignal; onProgress?: (message: string) => void; onAccepted?: () => void } = {}) {
  const job = await startGithubSync(session);
  options?.onAccepted?.();
  return waitForGithubJob<GithubAnalysisResponse>(job, (id) => getGithubSyncJob(session, id), options);
}

export function getGithubOverview(session: AuthSession) {
  return requestWithSession<GithubOverviewResponse>(session, '/profile/github/overview/',
    (token) => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to load GitHub profile');
}

export function getGithubRepositories(session: AuthSession, page = 1) {
  return requestWithSession<GithubRepositoryPage>(session, `/profile/github/repos/?page=${page}`,
    (token) => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to load repositories');
}

export function getGithubHistory(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<GithubHistoryResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/github-history/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load GitHub analysis history',
  );
}

export function disconnectGithub(session: AuthSession) {
  return requestWithSession<void>(
    session,
    '/auth/github/disconnect/',
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken),
    }),
    'Unable to disconnect GitHub',
  );
}

export function uploadLinkedIn(session: AuthSession, screenshots: LinkedInScreenshot[], options?: DocumentUploadOptions) {
  const requestId = newRequestId();
  const formData = new FormData();
  let imageCount = 0;
  screenshots.forEach((screenshot, index) => {
    if (screenshot.file) {
      formData.append('images', screenshot.file, screenshot.name || `linkedin-${index + 1}.jpg`);
      imageCount += 1;
    } else if (screenshot.uri) {
      formData.append('images', {
        uri: screenshot.uri,
        name: screenshot.name || `linkedin-${index + 1}.jpg`,
        type: screenshot.type || 'image/jpeg',
      } as unknown as Blob);
      imageCount += 1;
    }
  });

  if (imageCount === 0) {
    throw new Error('Choose at least one LinkedIn image before uploading.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/linkedin/',
    (accessToken) => ({
      method: 'POST',
      headers: { ...authHeaders(accessToken, ''), Prefer: 'respond-async', 'Idempotency-Key': requestId },
      body: formData,
    }),
    'Unable to upload LinkedIn profile',
  ).then(result => waitForDocumentJob(session, result, options));
}

export function updateProfileFields(
  session: AuthSession,
  payload: Record<string, unknown>,
) {
  return requestWithSession<Record<string, unknown>>(
    session,
    '/profile/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }),
    'Above field already has a value and cannot be cleared to null. Provide a number (0 is allowed) instead.',
  )
    .then(normalizeProfileResponse);
}

function fetchStudentProfile(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<Record<string, unknown>>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load student profile',
  ).then(normalizeProfileResponse);
}

const profileRequests = new Map<string, ReturnType<typeof fetchStudentProfile>>();
export function getStudentProfile(session: AuthSession) {
  const key = `${session.user?.student_id}:${session.access}`;
  const pending = profileRequests.get(key);
  if (pending) return pending;
  const request = fetchStudentProfile(session).finally(() => profileRequests.delete(key));
  profileRequests.set(key, request);
  return request;
}

export function listStudentResumes(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<ResumeListResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/resumes/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load resumes',
  );
}

export function deleteResume(session: AuthSession, resumeId: ResumeRecord['id']) {
  return requestWithSession<Record<string, unknown>>(
    session,
    `/profile/resume/${encodeURIComponent(String(resumeId))}/`,
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to delete resume',
  );
}

export function listLinkedInHistory(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<LinkedInHistoryResponse | LinkedInHistoryRecord[]>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/linkedin-history/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load LinkedIn images',
  );
}

export function uploadProfileImage(session: AuthSession, image: ProfileImageFile) {
  const formData = new FormData();
  if (image.file) {
    formData.append('image', image.file, image.name);
  } else if (image.uri) {
    formData.append('image', {
      uri: image.uri,
      name: image.name,
      type: image.type || 'image/jpeg',
    } as unknown as Blob);
  } else {
    throw new Error('Choose a profile image before uploading.');
  }

  return requestWithSession<ProfileImageResponse>(
    session,
    '/profile/image/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken, ''),
      body: formData,
    }),
    'Unable to upload profile image',
  );
}

export function getProfileImage(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestBlobWithSession(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/image/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to load profile image',
  );
}

export function deleteProfileImage(session: AuthSession) {
  if (!session.user?.student_id) {
    throw new Error('Missing student ID. Please sign in again.');
  }

  return requestWithSession<ProfileImageResponse>(
    session,
    `/profile/${encodeURIComponent(session.user.student_id)}/image/`,
    (accessToken) => ({
      method: 'DELETE',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to delete profile image',
  );
}

export function getLinkedInImage(session: AuthSession, imageUrl: string) {
  return requestBlobUrlWithSession(
    session,
    imageUrl,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to load LinkedIn image',
  );
}

export function downloadResumeFile(session: AuthSession, resumeId: ResumeRecord['id']) {
  return requestBlobWithSession(
    session,
    `/profile/resume/${encodeURIComponent(String(resumeId))}/`,
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken, ''),
    }),
    'Unable to download resume',
  );
}

export function chatWithAria(
  session: AuthSession,
  message: string,
  attachments: ChatAttachmentFile[] = [],
) {
  const requestId = newRequestId();
  return requestWithSession<AriaChatResponse>(
    session,
    '/chat/agent/',
    (accessToken) => {
      if (attachments.length === 0) {
        return {
          method: 'POST',
          headers: { ...authHeaders(accessToken), 'Idempotency-Key': requestId },
          body: JSON.stringify({ message }),
        };
      }

      const formData = new FormData();
      if (message.trim()) {
        formData.append('message', message.trim());
      }
      attachments.forEach((attachment) => appendChatAttachment(formData, attachment));

      return {
        method: 'POST',
        headers: { ...authHeaders(accessToken, ''), 'Idempotency-Key': requestId },
        body: formData,
      };
    },
    'Unable to chat with your agent',
  ).then(result => waitForAgentJob(result, id => readAgentJob(session, id)));
}

export function readAgentJob(session: AuthSession, id: string) {
  return requestWithSession<AriaChatResponse>(session, `/chat/jobs/${encodeURIComponent(id)}/`,
    token => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to check chat progress').then(result => {
      // The reply has arrived before shared research is written. Never block
      // displaying it on cache maintenance; repeated acknowledgements are safe.
      if ((result as AriaChatResponse & AgentJob<AriaChatResponse>).status === 'completed') {
        setTimeout(() => {
          void requestWithSession(session, `/chat/jobs/${encodeURIComponent(id)}/`,
            token => ({ method: 'POST', headers: authHeaders(token) }), 'Unable to save researched information')
            .catch(() => { /* Keep the delivered answer; pending evidence stays durable. */ });
        }, 0);
      }
      return result;
    });
}

export async function resumeAriaJob(session: AuthSession, signal?: AbortSignal, onActive?: () => void) {
  const job = await requestWithSession<AriaChatResponse & AgentJob<AriaChatResponse>>(session, '/chat/jobs/active/',
    token => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to check chat progress');
  if (!job.job_id || signal?.aborted) return;
  onActive?.();
  return waitForAgentJob(job, id => readAgentJob(session, id), signal);
}

export function getAriaHistory(session: AuthSession) {
  return requestWithSession<AriaHistoryResponse>(
    session,
    '/chat/agent/history/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load agent chat history',
  );
}

export function editAriaMessage(session: AuthSession, messageId: number | string, message: string){
   const requestId = newRequestId();
   return requestWithSession<AriaEditResponse>(
    session,
    `/chat/agent/${encodeURIComponent(String(messageId))}/edit/`,
    (accessToken) => ({
      method: 'PATCH',
      headers: { ...authHeaders(accessToken), 'Idempotency-Key': requestId },
      body: JSON.stringify({ message }),
    }),
    'Unable to edit message',
  ).then(result => waitForAgentJob(result, id => readAgentJob(session, id)));
}

export interface UniversityReference {
  research_id?: string;
  id: string;
  name: string;
  listed: boolean;
  source: string;
  url: string;
  address?: string;
  updated_at?: string | null;
  stale?: boolean;
  processing?: boolean;
  progress?: string;
}

export function readUniversityResearch(session: AuthSession, id: string) {
  return requestWithSession<UniversityReference>(session, `/university-research/${encodeURIComponent(id.replace(/^public:/, ''))}/`,
    token => ({ method: 'GET', headers: authHeaders(token) }), 'Unable to read university research');
}

export function refreshUniversityResearch(session: AuthSession, id: string) {
  return requestWithSession<{ university: UniversityReference }>(session, `/university-research/${encodeURIComponent(id.replace(/^public:/, ''))}/refresh/`,
    token => ({ method: 'POST', headers: authHeaders(token) }), 'Unable to update university information');
}

export function clearAriaChat(session: AuthSession) {
  return requestWithSession<{ detail?: string; message?: string; status?: string }>(
    session,
    '/chat/agent/new/',
    (accessToken) => ({
      method: 'POST',
      headers: authHeaders(accessToken),
    }),
    'Unable to clear agent chat',
  );
}

export function getAgentName(session: AuthSession) {
  return requestWithSession<AgentNameResponse>(
    session,
    '/profile/agent-name/',
    (accessToken) => ({
      method: 'GET',
      headers: authHeaders(accessToken),
    }),
    'Unable to load agent name',
  );
}

export function updateAgentName(session: AuthSession, agentName: string) {
  return requestWithSession<AgentNameResponse>(
    session,
    '/profile/agent-name/',
    (accessToken) => ({
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ agent_name: agentName }),
    }),
    'Unable to update agent name',
  );
}

export function getAgentActivity(session: AuthSession) {
  return requestWithSession<{status: string; label?: string; updated_at?: string}>(session, '/chat/activity/',
    token => ({method: 'GET', headers: authHeaders(token)}), 'Unable to check agent activity');
}

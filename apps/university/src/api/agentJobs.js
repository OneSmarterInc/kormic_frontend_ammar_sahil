import client from './client';

export const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export async function waitForAgentJob(initial, signal) {
  if (!initial.job_id) return initial;
  let job = initial;
  let delay = 1000;
  const deadline = Date.now() + 26 * 60 * 1000;
  while (Date.now() < deadline) {
    if (signal?.aborted) return null;
    if (job.status === 'completed') return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Unable to complete the response.');
    await new Promise(resolve => setTimeout(resolve, delay));
    job = (await client.get(`/chat/jobs/${encodeURIComponent(initial.job_id)}/`, { signal })).data;
    delay = Math.min(5000, Math.round(delay * 1.3));
  }
  throw new Error('Response still pending. Reopen chat to check its progress.');
}

export async function resumeAgentJob(signal) {
  const { data } = await client.get('/chat/jobs/active/', { signal });
  return data.job_id ? waitForAgentJob(data, signal) : null;
}

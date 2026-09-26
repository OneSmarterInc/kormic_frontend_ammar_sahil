export interface AgentJob<T> {
  job_id?: string;
  status?: string;
  result?: T;
  error?: string;
}

export const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export async function waitForAgentJob<T>(initial: T & AgentJob<T>, read: (id: string) => Promise<T & AgentJob<T>>, signal?: AbortSignal): Promise<T> {
  if (!initial.job_id) return initial;
  let job = initial;
  const deadline = Date.now() + 26 * 60 * 1000;
  let delay = 1000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Chat polling cancelled. The response will remain in your history.');
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Unable to finish the response. Please retry.');
    await new Promise(resolve => setTimeout(resolve, delay));
    job = await read(initial.job_id);
    delay = Math.min(5000, Math.round(delay * 1.3));
  }
  throw new Error('The response is still pending. Reopen chat to check its progress.');
}

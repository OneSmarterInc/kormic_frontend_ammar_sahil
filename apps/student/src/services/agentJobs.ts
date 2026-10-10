import { isRetryableRead } from './retryPolicy';
export interface AgentJob<T> {
  job_id?: string;
  status?: string;
  result?: T;
  error?: string;
  progress?: { stage: string; label: string };
}

export const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export async function waitForAgentJob<T>(initial: T & AgentJob<T>, read: (id: string) => Promise<T & AgentJob<T>>, signal?: AbortSignal, onUpdate?: (job: AgentJob<T>) => void): Promise<T> {
  onUpdate?.(initial);
  if (!initial.job_id) return initial;
  let job = initial;
  const deadline = Date.now() + 26 * 60 * 1000;
  let delay = 1000;
  let failures = 0;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Chat polling cancelled. The response will remain in your history.');
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'Unable to finish the response. Please retry.');
    await new Promise(resolve => setTimeout(resolve, delay));
    if (signal?.aborted) throw new Error('Chat polling cancelled. The response will remain in your history.');
    try {
      job = await read(initial.job_id);
      failures = 0;
    } catch (error) {
      if (!isRetryableRead(error)) throw error;
      failures += 1;
      if (failures >= 5) throw new Error('Could not reconnect to the response. Reopen chat to resume; your request may still be processing.');
      onUpdate?.({ ...job, progress: { stage: 'reconnecting', label: 'Connection interrupted. Reconnecting to your response…' } });
      delay = Math.min(5000, delay * 2);
      continue;
    }
    onUpdate?.(job);
    delay = Math.min(5000, Math.round(delay * 1.3));
  }
  throw new Error('The response is still pending. Reopen chat to check its progress.');
}

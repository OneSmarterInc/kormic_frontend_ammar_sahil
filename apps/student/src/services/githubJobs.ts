export interface GithubJob<T> {
  job_id?: string;
  status?: string;
  progress?: string;
  result?: T;
  error?: string;
}

/** Existing callers keep awaiting a result while extraction runs durably. */
export async function waitForGithubJob<T>(initial: T & GithubJob<T>, read: (id: string) => Promise<T & GithubJob<T>>,
  options: { signal?: AbortSignal; onProgress?: (message: string) => void } = {}): Promise<T> {
  if (!initial.job_id) return initial;
  let job = initial;
  const deadline = Date.now() + 60 * 60 * 1000;
  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new Error('GitHub sync continues in the background. Open GitHub Profile to see its progress.');
    if (job.status === 'completed' && job.result) return job.result;
    if (job.status === 'failed') throw new Error(job.error || 'GitHub analysis could not finish. Sync again to retry.');
    options.onProgress?.(job.progress || 'Collecting your GitHub profile…');
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    if (options.signal?.aborted) continue;
    job = await read(initial.job_id);
  }
  throw new Error('GitHub is still syncing. You can follow its progress in GitHub Profile.');
}

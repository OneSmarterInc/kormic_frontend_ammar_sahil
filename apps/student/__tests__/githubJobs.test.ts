import { waitForGithubJob } from '../src/services/githubJobs';

it('preserves the existing synchronous response contract', async () => {
  const result = { github_username: 'ada' };
  expect(await waitForGithubJob(result, jest.fn())).toBe(result);
});

it('returns only the completed extraction result after polling', async () => {
  jest.useFakeTimers();
  const result = { github_username: 'ada' };
  const read = jest.fn().mockResolvedValue({ job_id: '1', status: 'completed', result });
  const waiting = waitForGithubJob({ job_id: '1', status: 'queued' }, read);
  await jest.advanceTimersByTimeAsync(2000);
  expect(await waiting).toEqual(result);
  expect(read).toHaveBeenCalledWith('1');
  jest.useRealTimers();
});

it('surfaces extraction failures and cancels polling without cancelling server work', async () => {
  await expect(waitForGithubJob({ job_id: '1', status: 'failed', error: 'Reconnect GitHub' }, jest.fn())).rejects.toThrow('Reconnect GitHub');
  const controller = new AbortController();
  controller.abort();
  const read = jest.fn();
  await expect(waitForGithubJob({ job_id: '1', status: 'running' }, read, { signal: controller.signal })).rejects.toThrow('continues in the background');
  expect(read).not.toHaveBeenCalled();
});

import { afterEach, expect, test, vi } from 'vitest';
import client from '../../src/api/client';
import { waitForAgentJob } from '../../src/api/agentJobs';
vi.mock('../../src/api/client', () => ({ default: { get: vi.fn() } }));
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

test('polls a job until its result is available', async () => {
  vi.useFakeTimers();
  client.get.mockResolvedValueOnce({ data: { status: 'processing' } })
    .mockResolvedValueOnce({ data: { status: 'completed', result: { reply: 'Here are the scholarships.' } } });
  const response = waitForAgentJob({ job_id: 'one', status: 'queued' });
  await vi.runAllTimersAsync();
  expect(await response).toEqual({ reply: 'Here are the scholarships.' });
  expect(client.get).toHaveBeenCalledWith('/chat/jobs/one/', { signal: undefined });
});

test('reports failed jobs and accepts synchronous responses', async () => {
  await expect(waitForAgentJob({ job_id: 'one', status: 'failed', error: 'Expired' })).rejects.toThrow('Expired');
  expect(await waitForAgentJob({ reply: 'Immediate' })).toEqual({ reply: 'Immediate' });
});

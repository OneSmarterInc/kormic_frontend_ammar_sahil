import { waitForAgentJob } from '../src/services/agentJobs';

describe('queued agent responses', () => {
  afterEach(() => jest.useRealTimers());

  it('returns legacy responses without polling', async () => {
    const read = jest.fn();
    expect(await waitForAgentJob({ reply: 'Hello' }, read)).toEqual({ reply: 'Hello' });
    expect(read).not.toHaveBeenCalled();
  });

  it('waits for processing and returns the completed response', async () => {
    jest.useFakeTimers();
    const read = jest.fn().mockResolvedValueOnce({ status: 'processing' })
      .mockResolvedValueOnce({ status: 'completed', result: { reply: 'Finished' } });
    const result = waitForAgentJob({ job_id: 'job-1', status: 'queued', reply: '' }, read);
    await jest.runAllTimersAsync();
    await expect(result).resolves.toEqual({ reply: 'Finished' });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('surfaces failures instead of presenting a queued job as an answer', async () => {
    await expect(waitForAgentJob({ job_id: 'j', status: 'failed', error: 'Expired' }, jest.fn())).rejects.toThrow('Expired');
  });
});

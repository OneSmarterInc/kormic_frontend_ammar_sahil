import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { UniversityReferences } from '../src/features/chat/components/UniversityReferences';
import { readUniversityResearch } from '../src/services/api';
import { waitForAgentJob } from '../src/services/agentJobs';
jest.mock('../src/services/api', () => ({ readUniversityResearch: jest.fn() }));
jest.mock('@expo/vector-icons/Feather', () => 'Icon');
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

test('source status failures are bounded and display a manual retry instead of indefinite processing', async () => {
  jest.useFakeTimers();
  (readUniversityResearch as jest.Mock).mockRejectedValue(new Error('Temporary network failure'));
  const view = render(<UniversityReferences session={{ accessToken: 'test' } as any} meta={{ university_references: [{id:'public:test',name:'Example University',listed:false,url:'https://example.edu',processing:true}] }} />);
  await act(async () => { fireEvent.press(view.getByRole('button')); });
  await act(async () => { await jest.runAllTimersAsync(); });
  expect(readUniversityResearch).toHaveBeenCalledTimes(4);
  expect(view.queryByText('Information is being processed…')).toBeNull();
  expect(view.getByRole('button', { name: 'Retry source status' })).toBeTruthy();
});

test('a transient job read failure retries and returns the university answer', async () => {
  jest.useFakeTimers();
  const read = jest.fn().mockRejectedValueOnce(new Error('Temporary outage')).mockResolvedValue({status:'completed',result:{reply:'Ready'}});
  const result = waitForAgentJob({job_id:'test',status:'queued'},read).catch(error => error.message);
  await jest.runAllTimersAsync();
  expect(await result).toEqual({reply:'Ready'});
  expect(read).toHaveBeenCalledTimes(2);
});

test('an authorization failure is not retried', async () => {
  jest.useFakeTimers();
  const error = Object.assign(new Error('Forbidden'), { status: 403 });
  const read = jest.fn().mockRejectedValue(error);
  const result = waitForAgentJob({ job_id: 'test', status: 'queued' }, read).catch(value => value);
  await jest.runAllTimersAsync();
  expect(await result).toBe(error);
  expect(read).toHaveBeenCalledTimes(1);
});

test('persistent outages stop after five reads with recovery guidance', async () => {
  jest.useFakeTimers();
  const read = jest.fn().mockRejectedValue(new Error('Offline'));
  const result = waitForAgentJob({ job_id: 'test', status: 'queued' }, read).catch(value => value.message);
  await jest.runAllTimersAsync();
  expect(await result).toMatch(/Reopen chat/);
  expect(read).toHaveBeenCalledTimes(5);
  expect(read.mock.calls.every(([id]) => id === 'test')).toBe(true);
});

test('cancelling during the polling delay prevents another request', async () => {
  jest.useFakeTimers();
  const controller = new AbortController();
  const read = jest.fn();
  const result = waitForAgentJob({ job_id: 'test', status: 'queued' }, read, controller.signal).catch(value => value.message);
  controller.abort();
  await jest.runAllTimersAsync();
  expect(await result).toMatch(/cancelled/);
  expect(read).not.toHaveBeenCalled();
});

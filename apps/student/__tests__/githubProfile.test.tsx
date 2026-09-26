import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { GithubProfilePanel } from '../src/features/github/GithubProfilePanel';
import { ProfileMenu } from '../src/features/profile/components/ProfileMenu';
import * as api from '../src/services/api';

jest.mock('../src/services/api', () => ({ getGithubOverview: jest.fn(), getGithubRepositories: jest.fn(), startGithubSync: jest.fn() }));
const session = { access: 'test-only', mustEnrollTotp: false };
const fixture: api.GithubOverviewResponse = {
  connected: true, sync: { job_id: 'job-test', status: 'completed' },
  profile: { identity: { name: 'Ada', login: 'ada' }, overview: '## Professional Summary\n\nA portfolio with **Python** evidence.',
    statistics: { repositories: 23, owned: 23 }, languages: [{ name: 'Python', repositories: 23 }],
    technologies: [], domains: [], coverage: {}, warnings: [], synced_at: '2026-09-26T06:00:00Z' },
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.getGithubOverview).mockResolvedValue(fixture);
  jest.mocked(api.getGithubRepositories).mockImplementation(async (_session, page = 1) => ({
    count: 23, page, page_size: 10, total_pages: 3,
    results: Array.from({ length: page === 3 ? 3 : 10 }, (_, i) => ({ id: (page-1)*10+i, name: `ada/repo-${(page-1)*10+i+1}` })),
  }));
});

it('adds GitHub Profile without removing the existing menu entries', () => {
  const select = jest.fn();
  const screen = render(<ProfileMenu active="aria" agentName="Aria" onSelect={select} />);
  for (const label of ['Chat with Aria', 'Profile Overview', 'Edit Profile', 'Resume update/view', 'GitHub', 'LinkedIn images', 'GitHub Profile']) {
    expect(screen.getByText(label)).toBeTruthy();
  }
  fireEvent.press(screen.getByText('GitHub Profile'));
  expect(select).toHaveBeenCalledWith('githubProfile');
});

it('keeps repos collapsed then shows ten names per page with working next and previous', async () => {
  const screen = render(<GithubProfilePanel session={session} onConnect={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('Ada')).toBeTruthy());
  expect(api.getGithubRepositories).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Repos'));
  await waitFor(() => expect(screen.getByText('ada/repo-10')).toBeTruthy());
  expect(screen.queryByText('ada/repo-11')).toBeNull();
  expect(screen.getByText('Page 1 of 3')).toBeTruthy();
  fireEvent.press(screen.getByText('Previous'));
  expect(api.getGithubRepositories).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('Next'));
  await waitFor(() => expect(screen.getByText('ada/repo-20')).toBeTruthy());
  expect(screen.queryByText('ada/repo-10')).toBeNull();
  fireEvent.press(screen.getByText('Next'));
  await waitFor(() => expect(screen.getByText('ada/repo-23')).toBeTruthy());
  fireEvent.press(screen.getByText('Next'));
  expect(api.getGithubRepositories).toHaveBeenCalledTimes(3);
  fireEvent.press(screen.getByText('Previous'));
  await waitFor(() => expect(screen.getByText('Page 2 of 3')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Repos'));
  expect(screen.queryByText('ada/repo-20')).toBeNull();
});

it('shows reconnect and recoverable fetch errors', async () => {
  jest.mocked(api.getGithubOverview).mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValue({ connected: false, profile: null, sync: null });
  const connect = jest.fn();
  const screen = render(<GithubProfilePanel session={session} onConnect={connect} />);
  await waitFor(() => expect(screen.getByText('Network unavailable')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Refresh GitHub profile'));
  await waitFor(() => expect(screen.getByText('Connect GitHub')).toBeTruthy());
  fireEvent.press(screen.getByText('Connect GitHub'));
  expect(connect).toHaveBeenCalledTimes(1);
});

it('can retry loading repos without changing the saved overview', async () => {
  jest.mocked(api.getGithubRepositories).mockRejectedValueOnce(new Error('Repository request failed'));
  const screen = render(<GithubProfilePanel session={session} onConnect={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('Ada')).toBeTruthy());
  fireEvent.press(screen.getByLabelText('Repos'));
  await waitFor(() => expect(screen.getByText('Retry repositories')).toBeTruthy());
  fireEvent.press(screen.getByText('Retry repositories'));
  await waitFor(() => expect(screen.getByText('ada/repo-1')).toBeTruthy());
  expect(screen.getByText('Ada')).toBeTruthy();
});

it('restores an active sync after reopening and polls until completion', async () => {
  jest.useFakeTimers();
  const running = { ...fixture, sync: { job_id: 'job-test', status: 'running', progress: 'Inspecting source' } };
  jest.mocked(api.getGithubOverview).mockResolvedValueOnce(running).mockResolvedValue(fixture);
  const screen = render(<GithubProfilePanel session={session} onConnect={jest.fn()} />);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByText(/Inspecting source/)).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(2500); await Promise.resolve(); });
  expect(screen.getByText('Sync GitHub')).toBeTruthy();
  screen.unmount();
  jest.useRealTimers();
});

it('recovers automatically after repeated network failures during processing', async () => {
  jest.useFakeTimers();
  try {
    const running = { ...fixture, sync: { job_id: 'job-test', status: 'running', progress: 'Inspecting source' } };
    jest.mocked(api.getGithubOverview).mockResolvedValueOnce(running)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(fixture);
    const screen = render(<GithubProfilePanel session={session} onConnect={jest.fn()} />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { jest.advanceTimersByTime(2500); });
    expect(screen.getByText('Connection interrupted. Retrying automatically…')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.queryByText('Connection interrupted. Retrying automatically…')).toBeNull();
    expect(screen.getByText('Sync GitHub')).toBeTruthy();
    expect(api.getGithubOverview).toHaveBeenCalledTimes(4);
    screen.unmount();
  } finally { jest.useRealTimers(); }
});

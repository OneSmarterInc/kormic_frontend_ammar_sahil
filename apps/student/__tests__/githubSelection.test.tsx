import React, { useState } from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { GithubRepositoryPicker } from '../src/features/github/GithubRepositoryPicker';
import { GithubProfilePanel } from '../src/features/github/GithubProfilePanel';
import * as api from '../src/services/api';

jest.mock('../src/services/api', () => ({ getGithubRepositories: jest.fn(), refreshGithubRepositories: jest.fn(),
  getGithubOverview: jest.fn(), startGithubSync: jest.fn() }));
const session = { access: 'test-only', mustEnrollTotp: false };
const rows = Array.from({ length: 13 }, (_, i) => ({ id: i + 1, name: `ada/repo-${i + 1}` }));
const ready = jest.fn();
function Picker() {
  const [selected, setSelected] = useState<number[]>([]);
  return <GithubRepositoryPicker session={session} selected={selected} onChange={setSelected} onReadyChange={ready} />;
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.refreshGithubRepositories).mockResolvedValue({ job_id: 'inventory', status: 'completed', mode: 'inventory' });
  jest.mocked(api.getGithubRepositories).mockImplementation(async (_session, page = 1, search = '') => {
    const matching = rows.filter(row => row.name.toLowerCase().includes(search.toLowerCase()));
    return { count: matching.length, total_count: rows.length, page, page_size: 10,
      total_pages: Math.max(1, Math.ceil(matching.length / 10)), max_selection: 5, sync: null,
      selected_repositories: [], results: matching.slice((page - 1) * 10, page * 10) };
  });
});

it('enforces five selections, allows deselection and keeps selections across search and pages', async () => {
  const screen = render(<Picker />);
  await waitFor(() => expect(screen.getByLabelText('Select ada/repo-1')).toBeTruthy());
  for (let i = 1; i <= 5; i++) fireEvent.press(screen.getByLabelText(`Select ada/repo-${i}`));
  expect(screen.getByText('5 / 5 selected')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Select ada/repo-6'));
  expect(screen.getByLabelText('Select ada/repo-6').props.accessibilityState.checked).toBe(false);
  fireEvent.press(screen.getByText('Next'));
  await waitFor(() => expect(screen.getByLabelText('Select ada/repo-13')).toBeTruthy());
  expect(screen.getByText('5 / 5 selected')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Remove ada/repo-1 from selection'));
  fireEvent.changeText(screen.getByLabelText('Search repositories'), 'repo-13');
  await waitFor(() => expect(api.getGithubRepositories).toHaveBeenLastCalledWith(session, 1, 'repo-13'));
  fireEvent.press(screen.getByLabelText('Select ada/repo-13'));
  expect(screen.getByText('5 / 5 selected')).toBeTruthy();
  expect(api.startGithubSync).not.toHaveBeenCalled();
});

it('submits only the selected IDs and removes the analysis action after completion', async () => {
  jest.mocked(api.getGithubOverview).mockResolvedValue({ connected: true, profile: null, sync: null });
  jest.mocked(api.startGithubSync).mockResolvedValue({ job_id: 'analysis', status: 'queued' });
  const screen = render(<GithubProfilePanel session={session} onConnect={jest.fn()} />);
  await waitFor(() => expect(screen.getByLabelText('Select ada/repo-3')).toBeTruthy());
  fireEvent.press(screen.getByText('Analyse selected repositories'));
  expect(api.startGithubSync).not.toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText('Select ada/repo-3'));
  fireEvent.press(screen.getByLabelText('Select ada/repo-5'));
  jest.mocked(api.getGithubOverview).mockResolvedValue({ connected: true, sync: { job_id: 'analysis', status: 'completed' },
    profile: { identity: { login: 'ada' }, overview: 'Selected project evidence', statistics: { repositories: 2 },
      languages: [], technologies: [], domains: [], coverage: {}, warnings: [], synced_at: '2026-10-08T00:00:00Z' } });
  fireEvent.press(screen.getByText('Analyse selected repositories'));
  await waitFor(() => expect(api.startGithubSync).toHaveBeenCalledWith(session, [3, 5]));
  await waitFor(() => expect(screen.queryByText('Analyse selected repositories')).toBeNull());
  expect(screen.queryByText('Sync GitHub')).toBeNull();
  expect(screen.queryByText('Analyse again')).toBeNull();
});

it('shows an empty search result and recovers from a repository-list error', async () => {
  const screen = render(<Picker />);
  await waitFor(() => expect(screen.getByLabelText('Select ada/repo-1')).toBeTruthy());
  jest.mocked(api.getGithubRepositories).mockRejectedValueOnce(new Error('Connection interrupted'));
  fireEvent.changeText(screen.getByLabelText('Search repositories'), 'missing');
  await waitFor(() => expect(screen.getByText('Connection interrupted')).toBeTruthy());
  expect(ready).toHaveBeenLastCalledWith(false);
  fireEvent.press(screen.getByText('Retry loading repositories'));
  await waitFor(() => expect(screen.getByText('No repositories match your search.')).toBeTruthy());
});

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import NotificationBell from '@kormic/portal-core/components/notifications/NotificationBell.jsx';
import AgentQueriesPage from '../../src/pages/university/AgentQueriesPage';

const { queryGet } = vi.hoisted(() => ({ queryGet: vi.fn() }));
vi.mock('../../src/api/client', () => ({ default: { get: queryGet } }));
vi.mock('../../src/pages/university/QueriesPage', () => ({
  DepartmentQueryItem: ({ query }) => <article>{query.question}</article>,
}));

const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
let hidden = false;
beforeEach(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
});

afterEach(() => {
  hidden = false;
  vi.useRealTimers();
  vi.clearAllMocks();
});

test('notification polling pauses when hidden and uses one endpoint while the inbox is open', async () => {
  vi.useFakeTimers();
  const client = {
    get: vi.fn((path) => Promise.resolve({ data: path === '/notifications/unread-count/'
      ? { unread_count: 2 }
      : { results: [], unread_count: 2, pagination: { has_next: false } } })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
  };
  const view = render(<NotificationBell client={client} pollMs={30000} />);
  await act(async () => { await Promise.resolve(); });
  expect(client.get).toHaveBeenCalledTimes(1);
  expect(client.get).toHaveBeenLastCalledWith('/notifications/unread-count/');

  hidden = true;
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { await vi.advanceTimersByTimeAsync(90000); });
  expect(client.get).toHaveBeenCalledTimes(1);

  hidden = false;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await act(async () => { await Promise.resolve(); });
  expect(client.get).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole('button', { name: /Notifications, 2 unread/ }));
  await act(async () => { await Promise.resolve(); });
  expect(client.get).toHaveBeenLastCalledWith('/notifications/', {
    params: { page: 1, page_size: 10, search: '' },
  });
  const countRequests = client.get.mock.calls.filter(([path]) => path === '/notifications/unread-count/').length;
  await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
  expect(client.get.mock.calls.filter(([path]) => path === '/notifications/unread-count/')).toHaveLength(countRequests);
  expect(client.get.mock.calls.filter(([path]) => path === '/notifications/')).toHaveLength(2);

  fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));
  await act(async () => { await Promise.resolve(); });
  expect(client.post).toHaveBeenCalledWith('/notifications/read-all/');
  expect(client.get.mock.calls.filter(([path]) => path === '/notifications/')).toHaveLength(3);
  view.unmount();
});

test('university query list waits while hidden and refreshes on return', async () => {
  vi.useFakeTimers();
  queryGet.mockResolvedValue({ data: { results: [], pagination: { total: 0, has_next: false } } });
  const view = render(<MemoryRouter><AgentQueriesPage /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); });
  expect(queryGet).toHaveBeenCalledTimes(1);

  hidden = true;
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  await act(async () => { await vi.advanceTimersByTimeAsync(90000); });
  expect(queryGet).toHaveBeenCalledTimes(1);

  hidden = false;
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await act(async () => { await Promise.resolve(); });
  expect(queryGet).toHaveBeenCalledTimes(2);
  view.unmount();
});

afterEach(() => {
  if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden);
  else delete document.hidden;
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useAsync } from '../../src/hooks/useAsync';
import { clearAuth, setCachedUser } from '@kormic/portal-core/tokenStorage.js';
import { clearPageCache, cacheEpoch, writePageCache, readPageCache } from '@kormic/portal-core/pageCache.js';

beforeEach(() => { clearAuth(); setCachedUser({ id: 1, university_id: 'one' }); });

test('returning to a loaded page reuses data without another request; manual refresh retains content', async () => {
  const fetch = vi.fn().mockResolvedValue({ value: 1 });
  const first = renderHook(() => useAsync(fetch, [], { cacheKey: 'records' }));
  await waitFor(() => expect(first.result.current.data).toEqual({ value: 1 }));
  first.unmount();
  const second = renderHook(() => useAsync(fetch, [], { cacheKey: 'records' }));
  expect(second.result.current.data).toEqual({ value: 1 });
  expect(fetch).toHaveBeenCalledTimes(1);
  let finish;
  fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  act(() => second.result.current.refetch());
  expect(second.result.current.loading).toBe(false);
  expect(second.result.current.refreshing).toBe(true);
  await act(async () => finish({ value: 2 }));
  expect(second.result.current.data).toEqual({ value: 2 });
});

test('logout and switching university cannot reuse private cached records', async () => {
  const fetch = vi.fn().mockResolvedValue({ secret: 'one' });
  const first = renderHook(() => useAsync(fetch, [], { cacheKey: 'records' }));
  await waitFor(() => expect(first.result.current.data).not.toBeNull());
  first.unmount();
  clearAuth(); setCachedUser({ id: 2, university_id: 'two' });
  fetch.mockReturnValue(new Promise(() => {}));
  const second = renderHook(() => useAsync(fetch, [], { cacheKey: 'records' }));
  expect(second.result.current.data).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('invalidated or expired cache cannot be restored by an old request', () => {
  const epoch = cacheEpoch(); clearPageCache();
  writePageCache('old', { value: 1 }, epoch);
  expect(readPageCache('old')).toBeNull();
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  writePageCache('fresh', { value: 2 });
  now.mockReturnValue(62000);
  expect(readPageCache('fresh')).toBeNull();
  now.mockRestore();
});

test('filter changes do not display the previous filter results', async () => {
  const fetch = vi.fn().mockResolvedValue({ value: 'a' });
  const view = renderHook(({ filter }) => useAsync(fetch, [filter], { cacheKey: 'records' }), { initialProps: { filter: 'a' } });
  await waitFor(() => expect(view.result.current.data).not.toBeNull());
  fetch.mockReturnValue(new Promise(() => {}));
  view.rerender({ filter: 'b' });
  expect(view.result.current.data).toBeNull();
  expect(view.result.current.loading).toBe(true);
});

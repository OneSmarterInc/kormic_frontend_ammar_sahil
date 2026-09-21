import { act, renderHook } from '@testing-library/react-native';
import { useAgentNotifications } from '../src/features/notifications/useAgentNotifications';
import { AuthSession } from '../src/models/onboarding';
import {
  addNotificationReceivedListener,
  addNotificationTapListener,
  pollNotifications,
} from '../src/services/notifications';

jest.mock('../src/services/notifications', () => ({
  addNotificationReceivedListener: jest.fn(),
  addNotificationTapListener: jest.fn(),
  pollNotifications: jest.fn(),
}));
const session: AuthSession = {
  access: 'first',
  mustEnrollTotp: false,
  user: { id: 1, student_id: '1', email: 'student@example.test', role: 'student', totp_enrolled: true },
};
const receivedCleanup = jest.fn();
const tapCleanup = jest.fn();
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.mocked(addNotificationReceivedListener).mockReturnValue(receivedCleanup);
  jest.mocked(addNotificationTapListener).mockReturnValue(tapCleanup);
  jest.mocked(pollNotifications).mockResolvedValue({ nextSince: 'cursor-1', hasAgentNotification: true });
});
afterEach(() => jest.useRealTimers());

it('advances the cursor only on the polling interval, then cleans up on unmount', async () => {
  const onOpen = jest.fn();
  const { result, unmount } = renderHook(() => useAgentNotifications(session, onOpen));
  await act(async () => {
    await Promise.resolve();
  });
  expect(pollNotifications).toHaveBeenCalledTimes(1);
  expect(result.current.refreshKey).toBe(1);
  await act(async () => {
    jest.advanceTimersByTime(14999);
  });
  expect(pollNotifications).toHaveBeenCalledTimes(1);
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(pollNotifications).toHaveBeenLastCalledWith(session, 'cursor-1');
  expect(pollNotifications).toHaveBeenCalledTimes(2);
  unmount();
  await act(async () => {
    jest.advanceTimersByTime(30000);
  });
  expect(pollNotifications).toHaveBeenCalledTimes(2);
  expect(receivedCleanup).toHaveBeenCalledTimes(1);
  expect(tapCleanup).toHaveBeenCalledTimes(1);
});

it('does not poll before enrollment and resets its cursor when the session changes', async () => {
  const onOpen = jest.fn();
  const { rerender } = renderHook(
    ({ current }: { current?: AuthSession }) => useAgentNotifications(current, onOpen),
    { initialProps: { current: undefined as AuthSession | undefined } },
  );
  expect(pollNotifications).not.toHaveBeenCalled();
  await act(async () => {
    rerender({ current: { ...session, user: { ...session.user!, totp_enrolled: false } } });
  });
  expect(pollNotifications).not.toHaveBeenCalled();
  await act(async () => {
    rerender({ current: session });
  });
  const next = { ...session, access: 'second' };
  await act(async () => {
    rerender({ current: next });
  });
  expect(pollNotifications).toHaveBeenLastCalledWith(next, undefined);
});

it('does not overlap slow polls or apply a response after unmount', async () => {
  let resolve!: (value: { nextSince: string; hasAgentNotification: boolean }) => void;
  jest.mocked(pollNotifications).mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const onOpen = jest.fn();
  const { result, unmount } = renderHook(() => useAgentNotifications(session, onOpen));
  await act(async () => {
    jest.advanceTimersByTime(45000);
  });
  expect(pollNotifications).toHaveBeenCalledTimes(1);
  unmount();
  await act(async () => {
    resolve({ nextSince: 'late', hasAgentNotification: true });
  });
  expect(result.current.refreshKey).toBe(0);
});

it('opens chat for taps while received notifications only refresh its data', () => {
  const onOpen = jest.fn();
  const { result } = renderHook(() => useAgentNotifications(undefined, onOpen));
  act(() => {
    jest.mocked(addNotificationReceivedListener).mock.calls[0]![0]();
  });
  expect(result.current.refreshKey).toBe(1);
  expect(onOpen).not.toHaveBeenCalled();
  act(() => {
    jest.mocked(addNotificationTapListener).mock.calls[0]![0]();
  });
  expect(result.current.refreshKey).toBe(2);
  expect(onOpen).toHaveBeenCalledTimes(1);
});

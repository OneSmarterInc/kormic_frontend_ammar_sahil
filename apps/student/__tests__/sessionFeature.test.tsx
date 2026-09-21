import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { useStudentSession } from '../src/features/auth/useStudentSession';
import { initialOnboardingState } from '../src/models/onboarding';
import * as api from '../src/services/api';
import * as storage from '../src/services/tokenStorage';
import * as notifications from '../src/services/notifications';

jest.mock('../src/services/api', () => ({
  getMe: jest.fn(),
  getStudentProfile: jest.fn(),
  refreshAccessToken: jest.fn(),
  createStudentProfile: jest.fn(),
  logoutSession: jest.fn(),
}));
jest.mock('../src/services/tokenStorage', () => ({
  getSavedTokens: jest.fn(),
  saveAccessToken: jest.fn(),
  saveTokens: jest.fn(),
  clearSavedTokens: jest.fn(),
}));
jest.mock('../src/services/notifications', () => ({
  registerForPushNotifications: jest.fn(),
  unregisterPushNotifications: jest.fn(),
  shouldOpenAgentChatFromLastNotification: jest.fn(),
}));

const user = { id: 1, role: 'student', email: 'ada@example.test', totp_enrolled: true };
const originalPlatform = Platform.OS;
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.mocked(storage.getSavedTokens).mockResolvedValue(undefined);
  jest.mocked(api.getMe).mockResolvedValue(user);
  jest
    .mocked(api.getStudentProfile)
    .mockResolvedValue({ name: 'Ada' } as Awaited<ReturnType<typeof api.getStudentProfile>>);
  jest.mocked(notifications.registerForPushNotifications).mockResolvedValue(undefined);
  jest.mocked(notifications.shouldOpenAgentChatFromLastNotification).mockResolvedValue(false);
});
afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
});

function options() {
  return {
    state: initialOnboardingState,
    dispatch: jest.fn(),
    navigate: jest.fn(),
    openClaimFromUrl: jest.fn(() => false),
    claimLinkHandledRef: { current: false },
    onNotificationOpen: jest.fn(),
  };
}

it('gives an initial claim link precedence over session restoration', async () => {
  const inputs = options();
  inputs.openClaimFromUrl.mockReturnValue(true);
  jest.mocked(Linking.getInitialURL).mockResolvedValue('kormicstudent://claim?token=invite');
  const { result } = renderHook(() => useStudentSession(inputs));
  await waitFor(() => expect(result.current.restoringSession).toBe(false));
  expect(inputs.openClaimFromUrl).toHaveBeenCalledWith('kormicstudent://claim?token=invite');
  expect(storage.getSavedTokens).not.toHaveBeenCalled();
  expect(api.getMe).not.toHaveBeenCalled();
});

it('restores native credentials and loads the profile through the extracted session hook', async () => {
  jest
    .mocked(storage.getSavedTokens)
    .mockResolvedValue({ access: 'native-access', refresh: 'native-refresh' });
  const inputs = options();
  const { result } = renderHook(() => useStudentSession(inputs));
  await waitFor(() => expect(result.current.restoringSession).toBe(false));
  expect(inputs.dispatch).toHaveBeenCalledWith({
    type: 'SET_AUTH_SESSION',
    session: expect.objectContaining({ access: 'native-access', refresh: 'native-refresh', user }),
  });
  expect(inputs.navigate).toHaveBeenCalledWith('Profile');
  expect(result.current.profile?.name).toBe('Ada');
});

it('restores a browser session using the refresh cookie when memory is empty', async () => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  jest.mocked(api.refreshAccessToken).mockResolvedValue({ access: 'cookie-access', refresh: undefined });
  const inputs = options();
  const { result } = renderHook(() => useStudentSession(inputs));
  await waitFor(() => expect(result.current.restoringSession).toBe(false));
  expect(api.refreshAccessToken).toHaveBeenCalledWith();
  expect(storage.saveAccessToken).toHaveBeenCalledWith('cookie-access');
  expect(inputs.navigate).toHaveBeenCalledWith('Profile');
});

it('uses the notification navigation callback when reopening from a notification', async () => {
  jest.mocked(storage.getSavedTokens).mockResolvedValue({ access: 'native-access' });
  jest.mocked(notifications.shouldOpenAgentChatFromLastNotification).mockResolvedValue(true);
  const inputs = options();
  const { result } = renderHook(() => useStudentSession(inputs));
  await waitFor(() => expect(result.current.restoringSession).toBe(false));
  expect(inputs.onNotificationOpen).toHaveBeenCalledTimes(1);
  expect(inputs.navigate).not.toHaveBeenCalled();
});

it('clears local authentication even when server logout and push removal fail', async () => {
  jest.mocked(api.logoutSession).mockRejectedValue(new Error('Offline'));
  jest.mocked(notifications.unregisterPushNotifications).mockRejectedValue(new Error('Offline'));
  const inputs = options();
  const { result } = renderHook(() => useStudentSession(inputs));
  await waitFor(() => expect(result.current.restoringSession).toBe(false));
  await act(async () => {
    await result.current.logout();
  });
  expect(storage.clearSavedTokens).toHaveBeenCalledTimes(1);
  expect(inputs.dispatch).toHaveBeenLastCalledWith({ type: 'LOGOUT' });
  expect(result.current.profile).toBeUndefined();
});

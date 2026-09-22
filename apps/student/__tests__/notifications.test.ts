type MockResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

function response(body: unknown, status = 200): MockResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

const authenticatedSession = {
  access: 'access-token',
  mustEnrollTotp: false,
  user: {
    id: 1,
    email: 'student@example.com',
    role: 'student',
    student_id: 'student-1',
    totp_enrolled: true,
  },
};

describe('notification polling fallback', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('keeps the React-facing cursor stable while advancing the internal poll cursor', async () => {
    const scheduleNotificationAsync = jest.fn().mockResolvedValue('local-1');

    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    jest.doMock('expo-device', () => ({ isDevice: false }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { appOwnership: 'expo', expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
    }));
    jest.doMock('expo-secure-store', () => ({
      getItemAsync: jest.fn().mockResolvedValue(undefined),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
      deleteItemAsync: jest.fn().mockResolvedValue(undefined),
    }));
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      scheduleNotificationAsync,
      addNotificationReceivedListener: jest.fn(),
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponseAsync: jest.fn(() => { throw new Error('Unsupported on web'); }),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      setNotificationChannelAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      AndroidImportance: { MAX: 5 },
    }));

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        response({
          server_time: '2026-09-17T10:00:00Z',
          results: [
            {
              id: 11,
              event_type: 'agent_reply',
              title: 'Reply ready',
              body: 'Open your agent chat.',
              data: { type: 'agent_reply' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          server_time: '2026-09-17T10:00:15Z',
          results: [],
        }),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // Jest/React Native runs CommonJS here; dynamic import requires
    // --experimental-vm-modules, so isolate this compatibility exception.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pollNotifications, shouldOpenAgentChatFromLastNotification } = require('../src/services/notifications') as typeof import('../src/services/notifications');

    await expect(shouldOpenAgentChatFromLastNotification()).resolves.toBe(false);
    const first = await pollNotifications(authenticatedSession, undefined);
    const second = await pollNotifications(authenticatedSession, undefined);

    expect(first.nextSince).toBeUndefined();
    expect(second.nextSince).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstUrl = String(fetchMock.mock.calls[0]?.[0]);
    const secondUrl = String(fetchMock.mock.calls[1]?.[0]);

    expect(firstUrl).toContain('limit=20');
    expect(firstUrl).not.toContain('since=');
    expect(secondUrl).toContain('limit=20');
    expect(secondUrl).toContain('since=2026-09-17T10%3A00%3A00Z');
    expect(scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  test('does not call the polling endpoint after native production push registration succeeds', async () => {
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('expo-device', () => ({ isDevice: true }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { appOwnership: 'standalone', expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
    }));
    jest.doMock('expo-secure-store', () => ({
      getItemAsync: jest.fn().mockResolvedValue(undefined),
      setItemAsync: jest.fn().mockResolvedValue(undefined),
      deleteItemAsync: jest.fn().mockResolvedValue(undefined),
    }));
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      scheduleNotificationAsync: jest.fn(),
      addNotificationReceivedListener: jest.fn(),
      addNotificationResponseReceivedListener: jest.fn(),
      getLastNotificationResponseAsync: jest.fn(),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      setNotificationChannelAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
      AndroidImportance: { MAX: 5 },
    }));

    const fetchMock = jest.fn().mockResolvedValue(response({ id: 1, token: 'ExponentPushToken[test]' }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { pollNotifications, registerForPushNotifications } = require('../src/services/notifications') as typeof import('../src/services/notifications');

    await registerForPushNotifications(authenticatedSession);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/notifications/register-token/');

    fetchMock.mockClear();
    const result = await pollNotifications(authenticatedSession, undefined);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ nextSince: undefined, hasAgentNotification: false });
  });
});

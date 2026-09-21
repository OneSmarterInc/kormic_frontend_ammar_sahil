import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { AuthSession } from '../models/onboarding';
import { API_BASE_URL } from './api';

const CHAT_NOTIFICATION_TYPES = ['agent_reply', 'pending_query_resolved', 'agent_initiated'];
const PUSH_TOKEN_KEY = 'kormic.expoPushToken';
const NOTIFICATION_POLL_LIMIT = '20';

type NotificationDeliveryMode = 'push' | 'poll';

let expoPushToken: string | undefined;
const deliveryModeBySession = new Map<string, NotificationDeliveryMode>();
const pollCursorBySession = new Map<string, string>();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId;
}

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined';
}

function getNotificationSessionKey(session?: AuthSession) {
  return (
    session?.user?.student_id ||
    (session?.user?.id ? `user:${session.user.id}` : undefined) ||
    session?.access ||
    'anonymous'
  );
}

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

function setDeliveryMode(session: AuthSession | undefined, mode: NotificationDeliveryMode) {
  deliveryModeBySession.set(getNotificationSessionKey(session), mode);
}

async function savePushToken(token: string) {
  expoPushToken = token;

  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.setItem(PUSH_TOKEN_KEY, token);
    }
    return;
  }

  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function getSavedPushToken() {
  if (expoPushToken) {
    return expoPushToken;
  }

  if (Platform.OS === 'web') {
    return canUseLocalStorage() ? localStorage.getItem(PUSH_TOKEN_KEY) ?? undefined : undefined;
  }

  return (await SecureStore.getItemAsync(PUSH_TOKEN_KEY)) ?? undefined;
}

async function clearSavedPushToken() {
  expoPushToken = undefined;

  if (Platform.OS === 'web') {
    if (canUseLocalStorage()) {
      localStorage.removeItem(PUSH_TOKEN_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

async function postNotificationToken(
  path: '/notifications/register-token/' | '/notifications/unregister-token/',
  accessToken: string,
  body: Record<string, string>,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text().catch(() => '');

  console.log('[notifications] backend response', {
    path,
    status: response.status,
    ok: response.ok,
  });

  if (!response.ok) {
    throw new Error(`Notification token request failed with status ${response.status}: ${responseText}`);
  }

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch {
    return {};
  }
}

export async function registerForPushNotifications(session?: AuthSession) {
  console.log('[notifications] register start', {
    hasAccess: Boolean(session?.access),
    isDevice: Device.isDevice,
    platform: Platform.OS,
    apiBaseUrl: API_BASE_URL,
  });

  if (!session?.access) {
    console.log('[notifications] skip: missing auth access token');
    return undefined;
  }

  if (Platform.OS === 'web' || isExpoGo()) {
    setDeliveryMode(session, 'poll');
    console.log('[notifications] using polling fallback for web/Expo Go');
    return undefined;
  }

  if (!Device.isDevice) {
    setDeliveryMode(session, 'poll');
    console.log('[notifications] using polling fallback: physical device required for push');
    return undefined;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    setDeliveryMode(session, 'poll');
    console.log('[notifications] using polling fallback: unsupported push platform', Platform.OS);
    return undefined;
  }

  if (session.user && !session.user.totp_enrolled) {
    console.log('[notifications] skip: TOTP not enrolled');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let status = existingStatus;

  console.log('[notifications] existing permission:', existingStatus);

  if (status !== 'granted') {
    const permission = await Notifications.requestPermissionsAsync();
    status = permission.status;
    console.log('[notifications] requested permission result:', permission.status);
  }

  console.log('[notifications] final permission:', status);

  if (status !== 'granted') {
    setDeliveryMode(session, 'poll');
    console.log('[notifications] using polling fallback: permission not granted');
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }

  const projectId = getProjectId();

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const nextExpoPushToken = tokenResponse.data;

    await postNotificationToken('/notifications/register-token/', session.access, {
      token: nextExpoPushToken,
      platform: Platform.OS,
    });

    // Only persist the token after the backend confirms registration. A
    // transient registration failure must not disable the polling fallback.
    await savePushToken(nextExpoPushToken);
    setDeliveryMode(session, 'push');
    pollCursorBySession.delete(getNotificationSessionKey(session));

    console.log('[notifications] push registration complete');
    return nextExpoPushToken;
  } catch (error) {
    setDeliveryMode(session, 'poll');
    console.log('[notifications] push registration failed; using polling fallback:', error);
    throw error;
  }
}

export async function unregisterPushNotifications(session?: AuthSession) {
  const sessionKey = getNotificationSessionKey(session);
  deliveryModeBySession.delete(sessionKey);
  pollCursorBySession.delete(sessionKey);

  if (!session?.access) return;

  const savedToken = await getSavedPushToken();
  if (!savedToken) return;

  await postNotificationToken('/notifications/unregister-token/', session.access, {
    token: savedToken,
  });

  await clearSavedPushToken();
}

export function addNotificationReceivedListener(onAgentNotification: () => void) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    const type = notification.request.content.data?.type;

    console.log('[notifications] received foreground notification:', {
      title: notification.request.content.title,
      data: notification.request.content.data,
    });

    if (typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type)) {
      onAgentNotification();
    }
  });

  return () => subscription.remove();
}

export function addNotificationTapListener(onOpenAgentChat: () => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response.notification.request.content.data?.type;

    if (typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type)) {
      onOpenAgentChat();
    }
  });

  return () => subscription.remove();
}

export async function shouldOpenAgentChatFromLastNotification() {
  // Expo's native notification-response API throws on web. It must not abort
  // restoration of an otherwise valid cookie-authenticated browser session.
  if (Platform.OS === 'web') return false;
  const response = await Notifications.getLastNotificationResponseAsync();
  const type = response?.notification.request.content.data?.type;

  return typeof type === 'string' && CHAT_NOTIFICATION_TYPES.includes(type);
}

type NotificationPayload = {
  id?: number;
  event_type?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
  created_at?: string;
};

type NotificationPollResponse = {
  results?: NotificationPayload[];
  server_time?: string;
};

function getNotificationType(data: Record<string, unknown> | undefined, fallbackType?: unknown) {
  const type = data?.type ?? fallbackType;
  return typeof type === 'string' ? type : undefined;
}

function isAgentNotificationType(type: string | undefined) {
  return Boolean(type && CHAT_NOTIFICATION_TYPES.includes(type));
}

async function shouldUsePollingFallback(session?: AuthSession) {
  if (!session?.access || !session.user?.totp_enrolled) {
    return false;
  }

  const sessionKey = getNotificationSessionKey(session);
  const knownMode = deliveryModeBySession.get(sessionKey);
  if (knownMode) {
    return knownMode === 'poll';
  }

  if (Platform.OS === 'web' || isExpoGo() || !Device.isDevice) {
    deliveryModeBySession.set(sessionKey, 'poll');
    return true;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    deliveryModeBySession.set(sessionKey, 'poll');
    return true;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    deliveryModeBySession.set(sessionKey, 'poll');
    return true;
  }

  // A saved token only exists after the backend acknowledged registration.
  // Therefore it is safe to treat it as a healthy push path for this app
  // session and avoid waking the network poller every 15 seconds.
  const savedToken = await getSavedPushToken();
  const mode: NotificationDeliveryMode = savedToken ? 'push' : 'poll';
  deliveryModeBySession.set(sessionKey, mode);
  return mode === 'poll';
}

export async function pollNotifications(session?: AuthSession, since?: string) {
  if (!session?.access || !session.user?.totp_enrolled) {
    return { nextSince: since, hasAgentNotification: false };
  }

  if (!(await shouldUsePollingFallback(session))) {
    return { nextSince: since, hasAgentNotification: false };
  }

  const sessionKey = getNotificationSessionKey(session);
  const effectiveSince = pollCursorBySession.get(sessionKey) ?? since;
  const params = new URLSearchParams({ limit: NOTIFICATION_POLL_LIMIT });
  if (effectiveSince) params.set('since', effectiveSince);

  const response = await fetch(`${API_BASE_URL}/notifications/poll/?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access}`,
    },
  });

  const responseText = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(`Notification poll failed with status ${response.status}: ${responseText}`);
  }

  const data = responseText ? (JSON.parse(responseText) as NotificationPollResponse) : {};
  const results = data.results ?? [];
  const nextCursor = data.server_time ?? effectiveSince;

  if (nextCursor) {
    pollCursorBySession.set(sessionKey, nextCursor);
  }

  const agentNotifications = results.filter((item) =>
    isAgentNotificationType(getNotificationType(item.data, item.event_type)),
  );

  for (const item of agentNotifications) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title || 'Aria replied',
        body: item.body || 'Your agent reply is ready.',
        sound: 'default',
        data: {
          ...(item.data ?? {}),
          type: getNotificationType(item.data, item.event_type) ?? 'agent_reply',
        },
      },
      trigger: null,
    });
  }

  return {
    // Keep the caller's React state stable. The fallback cursor lives in this
    // service, so a fresh backend server_time cannot retrigger the polling
    // effect immediately; only the existing 15-second interval polls again.
    nextSince: since,
    hasAgentNotification: agentNotifications.length > 0,
  };
}

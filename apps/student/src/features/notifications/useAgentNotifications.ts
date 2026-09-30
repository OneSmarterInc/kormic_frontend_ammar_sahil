import { AppState, Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { AuthSession } from '../../models/onboarding';
import {
  addNotificationReceivedListener,
  addNotificationTapListener,
  pollNotifications,
} from '../../services/notifications';

/** Owns notification subscriptions and a session-scoped polling cursor. */
export function useAgentNotifications(session: AuthSession | undefined, onOpenChat: () => void) {
  const [refreshKey, setRefreshKey] = useState(0);
  const openNotificationChat = useCallback(() => {
    setRefreshKey((current) => current + 1);
    onOpenChat();
  }, [onOpenChat]);

  useEffect(
    () =>
      addNotificationReceivedListener(() => {
        setRefreshKey((current) => current + 1);
      }),
    [],
  );

  useEffect(() => addNotificationTapListener(openNotificationChat), [openNotificationChat]);

  useEffect(() => {
    if (!session?.access || !session.user?.totp_enrolled) return;
    let cancelled = false;
    let inFlight = false;
    let since: string | undefined;
    const runPoll = async () => {
      if (inFlight || cancelled || AppState.currentState === 'background' || (Platform.OS === 'web' && typeof document !== 'undefined' && document.hidden)) return;
      inFlight = true;
      try {
        const result = await pollNotifications(session, since);
        if (cancelled) return;
        since = result.nextSince;
        if (result.hasAgentNotification) setRefreshKey((current) => current + 1);
      } catch (error) {
        console.log('[notifications] poll failed:', error);
      } finally {
        inFlight = false;
      }
    };
    void runPoll();
    const interval = setInterval(runPoll, 15000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void runPoll(); });
    return () => {
      cancelled = true;
      clearInterval(interval);
      listener.remove();
    };
  }, [session?.access, session?.user?.student_id, session?.user?.totp_enrolled]);

  return { refreshKey, openNotificationChat };
}

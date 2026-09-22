import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthSession } from '../../models/onboarding';
import {
  isChatNotification,
  listNotificationInbox,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationInboxItem,
} from '../../services/notifications';
import { colors, fonts, radii } from '../../theme/tokens';

interface StudentNotificationBellProps {
  session?: AuthSession;
  onOpenChat: () => void;
}

function relativeTime(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
}

export function StudentNotificationBell({
  session,
  onOpenChat,
}: StudentNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!session?.access || !session.user?.totp_enrolled) return;
    try {
      const data = await listNotificationInbox(session, 1, 20);
      setItems(data.results ?? []);
      setUnreadCount(Number(data.unread_count || 0));
    } catch (error) {
      console.log('[notifications] inbox refresh failed:', error);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.access || !session.user?.totp_enrolled) return undefined;
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh, session?.access, session?.user?.totp_enrolled]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!session?.access || !session.user?.totp_enrolled) return null;

  const openNotification = async (item: NotificationInboxItem) => {
    if (!item.read_at) {
      try {
        const updated = await markNotificationRead(session, item.id);
        setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error) {
        console.log('[notifications] mark read failed:', error);
      }
    }

    setOpen(false);
    if (isChatNotification(item)) onOpenChat();
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await markAllNotificationsRead(session);
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
      setUnreadCount(0);
    } catch (error) {
      console.log('[notifications] mark all read failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
      >
        <Text style={styles.bellGlyph}>🔔</Text>
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={() => undefined}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Notifications</Text>
                <Text style={styles.subtitle}>
                  {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                </Text>
              </View>
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={markAllRead}
                  style={({ pressed }) => [styles.markAll, pressed && styles.pressed]}
                >
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={styles.list} contentContainerStyle={items.length ? undefined : styles.emptyWrap}>
              {items.length === 0 ? (
                <Text style={styles.empty}>No notifications yet.</Text>
              ) : (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => openNotification(item)}
                    style={({ pressed }) => [
                      styles.item,
                      !item.read_at && styles.unreadItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={[styles.dot, item.read_at && styles.readDot]} />
                    <View style={styles.itemBody}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
                      </View>
                      {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'absolute',
    right: 14,
    top: 42,
    zIndex: 50,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bellGlyph: {
    fontSize: 19,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -5,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.coral,
  },
  badgeText: {
    color: '#fff',
    fontFamily: fonts.bodyMedium,
    fontSize: 9,
  },
  pressed: {
    opacity: 0.72,
  },
  backdrop: {
    flex: 1,
    paddingTop: 90,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  panel: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '72%',
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelInk,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  markAll: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,107,74,0.12)',
  },
  markAllText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  list: {
    flexGrow: 0,
  },
  emptyWrap: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  unreadItem: {
    backgroundColor: 'rgba(91,141,239,0.08)',
  },
  dot: {
    marginTop: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.connectionBlue,
  },
  readDot: {
    backgroundColor: 'transparent',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  time: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 10,
  },
  body: {
    marginTop: 4,
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
  },
});

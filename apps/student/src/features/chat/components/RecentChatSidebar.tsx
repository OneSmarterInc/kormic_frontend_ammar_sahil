import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { formatChatTime } from '../chatHistory';
import { ChatThread, ThreadGroup } from '../types';

export function RecentChatSidebar({
  agentName,
  groupedThreads,
  historyLoading,
  selectedThreadId,
  onClose,
  onRefresh,
  onSelect,
}: {
  agentName: string;
  groupedThreads: ThreadGroup[];
  historyLoading: boolean;
  selectedThreadId?: string;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (thread: ChatThread) => void;
}) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarTitleRow}>
          <Text style={styles.sidebarTitle}>Recent chats</Text>
          <Pressable
            accessibilityLabel="Refresh recent chats"
            accessibilityRole="button"
            disabled={historyLoading}
            onPress={onRefresh}
            style={[styles.refreshButton, historyLoading && styles.disabledButton]}
          >
            {historyLoading ? (
              <ActivityIndicator color={colors.offWhite} size="small" />
            ) : (
              <MaterialIcons name="refresh" size={18} color={colors.offWhite} />
            )}
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.sidebarIconButton}>
          <Text style={styles.sidebarIconText}>x</Text>
        </Pressable>
      </View>

      {groupedThreads.length === 0 && !historyLoading ? (
        <Text style={styles.emptyText}>No recent {agentName} chats yet.</Text>
      ) : null}

      {groupedThreads.map((group) => (
        <View key={group.title} style={styles.threadGroup}>
          <Text style={styles.threadGroupTitle}>{group.title}</Text>
          {group.threads.map((thread) => (
            <Pressable
              key={thread.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedThreadId === thread.id }}
              onPress={() => onSelect(thread)}
              style={[styles.threadItem, selectedThreadId === thread.id && styles.threadItemActive]}
            >
              <Text numberOfLines={2} style={styles.threadTitle}>
                {thread.title}
              </Text>
              {thread.createdAt ? (
                <Text style={styles.threadTime}>{formatChatTime(thread.createdAt)}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#f0f1eb',
    borderBottomColor: '#e7e9e2',
    borderBottomWidth: 1,
    gap: 12,
    padding: 14,
  },
  sidebarHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  sidebarIconButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  sidebarIconText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  sidebarTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  threadGroup: {
    gap: 8,
  },
  threadGroupTitle: {
    color: '#697267',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  threadItem: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  threadItemActive: {
    backgroundColor: 'rgba(56,90,70,0.14)',
    borderColor: 'rgba(56,90,70,0.30)',
  },
  threadTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  threadTime: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  disabledButton: {
    opacity: 0.55,
  },
});

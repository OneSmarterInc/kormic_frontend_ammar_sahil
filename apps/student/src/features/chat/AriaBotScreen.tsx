import { MaterialIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import { ChatComposer } from './components/ChatComposer';
import { ChatMessageList } from './components/ChatMessageList';
import { RecentChatSidebar } from './components/RecentChatSidebar';
import { AriaChatProps } from './types';
import { useAriaChat } from './useAriaChat';

export function AriaBotScreen(props: AriaChatProps) {
  const { session } = props;
  const {
    agentName,
    messages,
    setMessages,
    selectedThreadId,
    setSelectedThreadId,
    sidebarOpen,
    setSidebarOpen,
    draft,
    setDraft,
    loading,
    activityLabel,
    historyLoading,
    clearLoading,
    clearConfirmVisible,
    editingName,
    nameDraft,
    setNameDraft,
    nameSaving,
    error,
    messagesScrollRef,
    shouldScrollMessagesToEndRef,
    groupedThreads,
    copiedMessageId,
    selectedAttachments,
    setSelectedAttachments,
    editingMessage,
    editDraft,
    setEditDraft,
    editLoading,
    pickAttachments,
    isImageAttachment,
    openProtectedAttachment,
    scrollMessagesToEnd,
    loadHistory,
    confirmClearChat,
    closeClearConfirm,
    clearConfirmedChat,
    sendMessage,
    copyResponse,
    startEditingMessage,
    cancelEditingMessage,
    saveEditedMessage,
    cancelEditingName,
    saveAgentName,
  } = useAriaChat(props);
  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.chatShell}
      >
        <View style={styles.container}>
          {!sidebarOpen ? (
            <View style={styles.chatActionsWrap}>
              <View style={styles.sessionLabel}><View style={styles.statusDot} /><Text style={styles.sessionText}>Your personal adviser</Text></View>
              <Pressable
                accessibilityRole="button"
                disabled={clearLoading || loading || historyLoading}
                onPress={confirmClearChat}
                accessibilityLabel="Clear chat"
                style={[
                  styles.clearChatButton,
                  (clearLoading || loading || historyLoading) && styles.disabledButton,
                ]}
              >
                {clearLoading ? (
                  <ActivityIndicator color={colors.offWhite} size="small" />
                ) : (
                  <MaterialIcons name="delete-outline" size={19} color={colors.coral} />
                )}
              </Pressable>
            </View>
          ) : null}

          {sidebarOpen ? (
            <RecentChatSidebar
              agentName={agentName}
              groupedThreads={groupedThreads}
              historyLoading={historyLoading}
              selectedThreadId={selectedThreadId}
              onClose={() => setSidebarOpen(false)}
              onRefresh={() => loadHistory(true)}
              onSelect={(thread) => {
                setSelectedThreadId(thread.id);
                setMessages(thread.messages);
                setSidebarOpen(false);
              }}
            />
          ) : (
            <>
              <ChatMessageList
                agentName={agentName}
                messages={messages}
                loading={loading}
                activityLabel={activityLabel}
                historyLoading={historyLoading}
                messagesScrollRef={messagesScrollRef}
                shouldScrollMessagesToEndRef={shouldScrollMessagesToEndRef}
                copiedMessageId={copiedMessageId}
                isImageAttachment={isImageAttachment}
                openProtectedAttachment={openProtectedAttachment}
                scrollMessagesToEnd={scrollMessagesToEnd}
                copyResponse={copyResponse}
                startEditingMessage={startEditingMessage}
                session={session}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <ChatComposer
                historyLoading={historyLoading}
                agentName={agentName}
                draft={draft}
                setDraft={setDraft}
                loading={loading}
                clearLoading={clearLoading}
                clearConfirmVisible={clearConfirmVisible}
                editingName={editingName}
                nameDraft={nameDraft}
                setNameDraft={setNameDraft}
                nameSaving={nameSaving}
                selectedAttachments={selectedAttachments}
                setSelectedAttachments={setSelectedAttachments}
                editingMessage={editingMessage}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                editLoading={editLoading}
                pickAttachments={pickAttachments}
                closeClearConfirm={closeClearConfirm}
                clearConfirmedChat={clearConfirmedChat}
                sendMessage={sendMessage}
                cancelEditingMessage={cancelEditingMessage}
                saveEditedMessage={saveEditedMessage}
                cancelEditingName={cancelEditingName}
                saveAgentName={saveAgentName}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  chatShell: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#f2f5f2',
    flexDirection: 'column',
    gap: 0,
    minHeight: 0,
  },
  chatActionsWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2ef',
    width: '100%',
  },
  sessionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#547663' },
  sessionText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: '#6a766f' },
  clearChatButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 0,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    width: 44,
    margin: 2,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.55,
  },
});

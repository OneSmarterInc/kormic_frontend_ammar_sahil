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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.chatShell}
      >
        <View style={styles.container}>
          {!sidebarOpen ? (
            <View style={styles.chatActionsWrap}>
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
              onRefresh={() => loadHistory(agentName, true)}
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
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F1026',
    flexDirection: 'column',
    gap: 0,
    maxHeight: 720,
  },
  chatActionsWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  clearChatButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    minHeight: 34,
    width: 34,
    margin: 8,
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

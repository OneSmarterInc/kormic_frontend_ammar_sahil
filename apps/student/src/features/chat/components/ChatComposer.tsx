import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { colors, fonts } from '../../../theme/tokens';
import { SUGGESTED_PROMPTS } from '../chatHistory';
import { ChatViewState } from '../viewTypes';
import { AgentNameDialog } from './AgentNameDialog';
import { EditMessageDialog } from './EditMessageDialog';

export function ChatComposer({
  agentName,
  draft,
  setDraft,
  loading,
  clearLoading,
  clearConfirmVisible,
  editingName,
  nameDraft,
  setNameDraft,
  nameSaving,
  selectedAttachments,
  setSelectedAttachments,
  editingMessage,
  editDraft,
  setEditDraft,
  editLoading,
  pickAttachments,
  closeClearConfirm,
  clearConfirmedChat,
  sendMessage,
  cancelEditingMessage,
  saveEditedMessage,
  cancelEditingName,
  saveAgentName,
}: Pick<
  ChatViewState,
  | 'agentName'
  | 'draft'
  | 'setDraft'
  | 'loading'
  | 'clearLoading'
  | 'clearConfirmVisible'
  | 'editingName'
  | 'nameDraft'
  | 'setNameDraft'
  | 'nameSaving'
  | 'selectedAttachments'
  | 'setSelectedAttachments'
  | 'editingMessage'
  | 'editDraft'
  | 'setEditDraft'
  | 'editLoading'
  | 'pickAttachments'
  | 'closeClearConfirm'
  | 'clearConfirmedChat'
  | 'sendMessage'
  | 'cancelEditingMessage'
  | 'saveEditedMessage'
  | 'cancelEditingName'
  | 'saveAgentName'
>) {
  return (
    <View style={styles.composer}>
      {!draft.trim() ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionScroller}
          contentContainerStyle={styles.suggestionRow}
        >
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Pressable
              key={prompt}
              accessibilityRole="button"
              onPress={() => setDraft(prompt)}
              style={styles.suggestionChip}
            >
              <Text style={styles.suggestionText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <AgentNameDialog
        editingName={editingName}
        nameDraft={nameDraft}
        setNameDraft={setNameDraft}
        nameSaving={nameSaving}
        cancelEditingName={cancelEditingName}
        saveAgentName={saveAgentName}
      />

      <EditMessageDialog
        editingMessage={editingMessage}
        editDraft={editDraft}
        setEditDraft={setEditDraft}
        editLoading={editLoading}
        cancelEditingMessage={cancelEditingMessage}
        saveEditedMessage={saveEditedMessage}
      />

      <ConfirmModal
        visible={clearConfirmVisible}
        title="Clear chat?"
        message={`This will permanently clear your ${agentName} chat history.`}
        primaryLabel="Clear chat"
        secondaryLabel="Cancel"
        primaryLoading={clearLoading}
        onPrimary={() => {
          void clearConfirmedChat();
        }}
        onSecondary={closeClearConfirm}
        onRequestClose={closeClearConfirm}
      />

      {selectedAttachments.length ? (
        <View style={styles.selectedAttachmentList}>
          {selectedAttachments.map((attachment, index) => (
            <View key={`${attachment.name}-${index}`} style={styles.selectedAttachmentChip}>
              <Text numberOfLines={1} style={styles.selectedAttachmentText}>
                {attachment.name}
              </Text>
              <Pressable
                onPress={() => setSelectedAttachments((current) => current.filter((_, i) => i !== index))}
              >
                <MaterialIcons name="close" size={14} color={colors.textSoft} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.composerBox}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach files"
          disabled={loading || selectedAttachments.length >= 5}
          onPress={pickAttachments}
          style={[styles.attachButton, (loading || selectedAttachments.length >= 5) && styles.disabledButton]}
        >
          <MaterialIcons name="attach-file" size={20} color={colors.offWhite} />
        </Pressable>
        <TextInput
          accessibilityLabel={`Message ${agentName}`}
          multiline
          onChangeText={setDraft}
          placeholder={`Message ${agentName}...`}
          placeholderTextColor="#7b817b"
          style={styles.input}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          disabled={loading || (!draft.trim() && selectedAttachments.length === 0)}
          onPress={sendMessage}
          style={styles.sendButton}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
      <Text style={styles.composerHint}>
        {agentName} uses your profile, resume, GitHub, and LinkedIn context.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: '#f0f1eb',
    borderTopColor: '#e7e9e2',
    borderTopWidth: 1,
    flexShrink: 0,
    gap: 10,
    padding: 14,
  },
  suggestionScroller: {
    maxHeight: 44,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  suggestionChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  composerBox: {
    alignItems: 'flex-end',
    backgroundColor: colors.panelInk,
    borderColor: '#e7e9e2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 8,
  },
  input: {
    backgroundColor: 'transparent',
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    maxHeight: 118,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 9,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 68,
    paddingHorizontal: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
  sendText: {
    color: '#ffffff',
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  composerHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  attachButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  selectedAttachmentList: {
    gap: 8,
    marginBottom: 10,
  },
  selectedAttachmentChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(56,90,70,0.14)',
    borderColor: 'rgba(56,90,70,0.30)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedAttachmentText: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
});

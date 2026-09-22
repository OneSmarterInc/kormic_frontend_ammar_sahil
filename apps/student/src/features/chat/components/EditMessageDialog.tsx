import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { ChatViewState } from '../viewTypes';

export function EditMessageDialog({
  editingMessage,
  editDraft,
  setEditDraft,
  editLoading,
  cancelEditingMessage,
  saveEditedMessage,
}: Pick<
  ChatViewState,
  | 'editingMessage'
  | 'editDraft'
  | 'setEditDraft'
  | 'editLoading'
  | 'cancelEditingMessage'
  | 'saveEditedMessage'
>) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(editingMessage)}
      onRequestClose={cancelEditingMessage}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.agentNameModal}>
          <Text style={styles.modalTitle}>Edit message</Text>
          <Text style={styles.modalCaption}>Regenerate the reply from this point in the chat.</Text>
          <TextInput
            accessibilityLabel="Edited message"
            editable={!editLoading}
            multiline
            onChangeText={setEditDraft}
            placeholder="Edit your message"
            placeholderTextColor="#777895"
            style={[styles.modalInput, styles.editMessageInput]}
            value={editDraft}
          />
          <View style={styles.modalActions}>
            <Pressable
              disabled={editLoading}
              onPress={cancelEditingMessage}
              style={styles.modalSecondaryButton}
            >
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={editLoading || !editDraft.trim()}
              onPress={saveEditedMessage}
              style={styles.modalPrimaryButton}
            >
              {editLoading ? (
                <ActivityIndicator color="#10112A" size="small" />
              ) : (
                <Text style={styles.modalPrimaryText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  agentNameModal: {
    backgroundColor: '#181A38',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 420,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
  modalCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#202247',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalSecondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
  },
  modalSecondaryText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: 20,
  },
  modalPrimaryText: {
    color: '#10112A',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  editMessageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

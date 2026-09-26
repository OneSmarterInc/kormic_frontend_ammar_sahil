import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { ChatViewState } from '../viewTypes';

export function AgentNameDialog({
  editingName,
  nameDraft,
  setNameDraft,
  nameSaving,
  cancelEditingName,
  saveAgentName,
}: Pick<
  ChatViewState,
  'editingName' | 'nameDraft' | 'setNameDraft' | 'nameSaving' | 'cancelEditingName' | 'saveAgentName'
>) {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={editingName}
      onRequestClose={() => {
        if (!nameSaving) cancelEditingName();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.agentNameModal}>
          <Text style={styles.modalTitle}>Edit agent name</Text>
          <Text style={styles.modalCaption}>Update the name shown in your agent chat.</Text>

          <TextInput
            accessibilityLabel="Agent name"
            autoCapitalize="words"
            editable={!nameSaving}
            maxLength={100}
            onChangeText={setNameDraft}
            placeholder="Agent name"
            placeholderTextColor="#7b817b"
            style={styles.modalInput}
            value={nameDraft}
          />

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              disabled={nameSaving}
              onPress={cancelEditingName}
              style={[styles.modalSecondaryButton, nameSaving && styles.disabledButton]}
            >
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={nameSaving}
              onPress={saveAgentName}
              style={[styles.modalPrimaryButton, nameSaving && styles.disabledButton]}
            >
              {nameSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
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
  disabledButton: {
    opacity: 0.55,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  agentNameModal: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
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
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
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
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
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
    color: '#ffffff',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
});

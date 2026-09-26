import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { formatChatDate } from '../chatHistory';
import { ChatViewState } from '../viewTypes';
import { FormattedMessageText } from './FormattedMessageText';
import { UniversityReferences } from './UniversityReferences';
import { ProfileChanges, profileChangeStates } from './ProfileChanges';

export function ChatMessageList({
  agentName,
  messages,
  loading,
  historyLoading,
  messagesScrollRef,
  shouldScrollMessagesToEndRef,
  copiedMessageId,
  isImageAttachment,
  openProtectedAttachment,
  scrollMessagesToEnd,
  copyResponse,
  startEditingMessage,
  session,
}: Pick<
  ChatViewState,
  | 'agentName'
  | 'messages'
  | 'loading'
  | 'historyLoading'
  | 'messagesScrollRef'
  | 'shouldScrollMessagesToEndRef'
  | 'copiedMessageId'
  | 'isImageAttachment'
  | 'openProtectedAttachment'
  | 'scrollMessagesToEnd'
  | 'copyResponse'
  | 'startEditingMessage'
  | 'session'
>) {
  const currentChanges = profileChangeStates(messages);
  return (
    <ScrollView
      ref={messagesScrollRef}
      style={styles.messages}
      contentContainerStyle={styles.messageContent}
      onContentSizeChange={() => {
        if (shouldScrollMessagesToEndRef.current) {
          scrollMessagesToEnd(!historyLoading);
          shouldScrollMessagesToEndRef.current = false;
        }
      }}
    >
      {historyLoading ? (
        <View style={styles.messageRow}>
          <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
            <ActivityIndicator color={colors.coral} size="small" />
            <Text style={styles.loadingText}>Loading {agentName} history...</Text>
          </View>
        </View>
      ) : null}
      {messages.map((message) => (
        <View key={message.id} style={[styles.messageRow, message.role === 'user' && styles.userMessageRow]}>
          <View style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.ariaBubble]}>
            <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'You' : agentName}</Text>
            <FormattedMessageText
              text={message.text}
              formatBold={message.role === 'aria'}
              isUniversityResponse={message.escalationStatus === 'resolved'}
              question={message.question}
              answer={message.answer}
            />
            {message.role === 'aria' ? <UniversityReferences meta={message.meta} session={session} /> : null}
            {message.role === 'aria' ? <ProfileChanges meta={message.meta} current={currentChanges} /> : null}
            {message.role === 'aria' && message.escalationStatus === 'pending' ? (
              <Text style={styles.escalationText}>
                I&apos;m checking with the university on this. I&apos;ll let you know.
              </Text>
            ) : null}
            {message.role === 'aria' && message.escalationStatus === 'resolved' ? (
              <Text style={styles.escalationResolvedText}>Answered by the university.</Text>
            ) : null}
            {message.attachments?.length ? (
              <View style={styles.attachmentList}>
                {message.attachments.map((attachment) =>
                  isImageAttachment(attachment) && attachment.url ? (
                    <Pressable
                      key={String(attachment.id)}
                      accessibilityRole="imagebutton"
                      onPress={() => openProtectedAttachment(attachment, session?.access)}
                      style={styles.imageAttachmentCard}
                    >
                      <Image
                        source={{
                          uri: attachment.url,
                          headers: session?.access
                            ? { Authorization: `Bearer ${session.access}` }
                            : undefined,
                        }}
                        style={styles.imageAttachment}
                        resizeMode="cover"
                      />
                      <Text numberOfLines={1} style={styles.imageAttachmentName}>
                        {attachment.filename}
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      key={String(attachment.id)}
                      accessibilityRole="button"
                      onPress={() => openProtectedAttachment(attachment, session?.access)}
                      style={styles.attachmentChip}
                    >
                      <MaterialIcons
                        name={attachment.content_type?.includes('pdf') ? 'picture-as-pdf' : 'attach-file'}
                        size={14}
                        color={colors.offWhite}
                      />
                      <Text numberOfLines={1} style={styles.attachmentText}>
                        {attachment.filename}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            ) : null}
            <View style={styles.botResponse}>
              {message.createdAt ? (
                <Text style={styles.messageDate}>{formatChatDate(message.createdAt)}</Text>
              ) : null}

              {message.role === 'aria' && message.id !== 'welcome' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy response"
                  onPress={() => copyResponse(message)}
                  style={styles.copyButton}
                >
                  <MaterialIcons
                    name={copiedMessageId === message.id ? 'check' : 'content-copy'}
                    size={14}
                    color={copiedMessageId === message.id ? colors.coral : colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.copyButtonText,
                      copiedMessageId === message.id && styles.copyButtonTextActive,
                    ]}
                  >
                    {copiedMessageId === message.id ? 'Copied' : ''}
                  </Text>
                </Pressable>
              ) : null}

              {message.role === 'user' && message.serverId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit message"
                  onPress={() => startEditingMessage(message)}
                  style={styles.copyButton}
                >
                  <MaterialIcons name="edit" size={14} color={colors.textSoft} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ))}
      {loading ? (
        <View style={styles.messageRow}>
          <View style={[styles.bubble, styles.ariaBubble, styles.loadingBubble]}>
            <ActivityIndicator color={colors.coral} size="small" />
            <Text style={styles.loadingText}>{agentName} is reading your profile...</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  messages: {
    flex: 1,
  },
  messageContent: {
    gap: 16,
    padding: 16,
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  bubble: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  ariaBubble: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    maxWidth: '92%',
  },
  userBubble: {
    backgroundColor: 'rgba(56,90,70,0.18)',
    borderColor: 'rgba(56,90,70,0.32)',
    maxWidth: '92%',
  },
  loadingBubble: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  bubbleLabel: {
    color: '#697267',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  botResponse: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageDate: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  escalationText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  escalationResolvedText: {
    color: colors.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  loadingText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  copyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  copyButtonTextActive: {
    color: colors.coral,
  },
  copyButtonText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
  attachmentList: {
    gap: 8,
    marginTop: 6,
  },
  attachmentChip: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  attachmentText: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  imageAttachmentCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  imageAttachment: {
    backgroundColor: '#ffffff',
    height: 190,
    width: '100%',
  },
  imageAttachmentName: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import { AriaAttachment, ChatAttachmentFile } from '../../services/api';
export function useChatAttachments(setError: (message: string) => void) {
  const [selectedAttachments, setSelectedAttachments] = useState<ChatAttachmentFile[]>([]);
  const pickAttachments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
        type: [
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/gif',
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (result.canceled) return;

      setSelectedAttachments((current) =>
        [
          ...current,
          ...result.assets.map((asset) => ({
            uri: asset.uri,
            name: asset.name || 'attachment',
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size,
          })),
        ].slice(0, 5),
      );
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : 'Unable to select attachments.');
    }
  };
  function isImageAttachment(attachment: AriaAttachment) {
    const contentType = attachment.content_type?.toLowerCase() ?? '';
    const filename = attachment.filename?.toLowerCase() ?? '';

    return contentType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(filename);
  }
  async function openProtectedAttachment(attachment: AriaAttachment, accessToken?: string) {
    if (!attachment.url || !accessToken) return;

    try {
      setError('');

      if (Platform.OS === 'web') {
        await Linking.openURL(attachment.url);
        return;
      }

      const extension =
        attachment.filename?.split('.').pop() || (attachment.content_type?.includes('pdf') ? 'pdf' : 'file');

      const localPath = `${FileSystem.cacheDirectory}${attachment.id}-${attachment.filename || `attachment.${extension}`}`;

      const download = await FileSystem.downloadAsync(attachment.url, localPath, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri, {
          mimeType: attachment.content_type,
          dialogTitle: attachment.filename,
        });
      } else {
        await Linking.openURL(download.uri);
      }
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Unable to open or share attachment.');
    }
  }
  return {
    selectedAttachments,
    setSelectedAttachments,
    pickAttachments,
    isImageAttachment,
    openProtectedAttachment,
  };
}

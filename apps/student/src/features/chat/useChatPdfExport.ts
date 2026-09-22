import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Linking } from 'react-native';
import { formatChatDate, stripWelcomeMessage } from './chatHistory';
import { ChatMessage } from './types';
export function useChatPdfExport(
  messages: ChatMessage[],
  agentName: string,
  setError: (message: string) => void,
) {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const downloadChatAsPdf = async () => {
    if (downloadLoading) {
      return;
    }

    const chatMessages = stripWelcomeMessage(messages);

    if (chatMessages.length === 0) {
      setError('There are no messages to download.');
      return;
    }

    try {
      setDownloadLoading(true);
      setError('');

      const now = new Date();

      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const year = now.getFullYear();

      const formattedDate = `${month}-${day}-${year}`;

      const safeAgentName = agentName.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

      const fileName = `${safeAgentName}_Chat_${formattedDate}.pdf`;

      const escapeHtml = (value: string) =>
        value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const chatHtml = chatMessages
        .map((message) => {
          const sender = message.role === 'user' ? 'You' : agentName;

          const messageDate = message.createdAt ? formatChatDate(message.createdAt) : '';

          const attachments = message.attachments?.length
            ? `
            <div class="attachments">
              ${message.attachments
                .map(
                  (attachment) => `
                    <div class="attachment">
                      📎 ${escapeHtml(attachment.filename || 'Attachment')}
                    </div>
                  `,
                )
                .join('')}
            </div>
          `
            : '';

          return `
          <div class="message ${message.role === 'user' ? 'user' : 'aria'}">

            <div class="sender">
              ${escapeHtml(sender)}
            </div>

            <div class="message-text">
              ${escapeHtml(message.text).replace(/\n/g, '<br />')}
            </div>

            ${attachments}

            ${
              message.escalationStatus === 'pending'
                ? `
                  <div class="status">
                    I'm checking with the university on this.
                    I'll let you know.
                  </div>
                `
                : ''
            }

            ${
              message.escalationStatus === 'resolved'
                ? `
                  <div class="resolved">
                    Answered by the university.
                  </div>
                `
                : ''
            }

            ${
              messageDate
                ? `
                  <div class="date">
                    ${escapeHtml(messageDate)}
                  </div>
                `
                : ''
            }

          </div>
        `;
        })
        .join('');

      const html = `
      <!DOCTYPE html>

      <html>
        <head>
          <meta charset="UTF-8" />

          <style>
            @page {
              margin: 30px;
            }

            body {
              font-family: Arial, sans-serif;
              padding: 10px;
              color: #222;
              background: #fff;
            }

            h1 {
              font-size: 24px;
              margin-bottom: 5px;
            }

            .subtitle {
              color: #666;
              font-size: 13px;
              margin-bottom: 25px;
            }

            .message {
              margin-bottom: 18px;
              padding: 14px;
              border-radius: 10px;
              border: 1px solid #ddd;
              page-break-inside: avoid;
            }

            .user {
              background: #fff1ec;
            }

            .aria {
              background: #f5f5fa;
            }

            .sender {
              font-weight: bold;
              font-size: 13px;
              margin-bottom: 8px;
            }

            .message-text {
              font-size: 14px;
              line-height: 1.6;
              word-wrap: break-word;
            }

            .date {
              margin-top: 10px;
              font-size: 10px;
              color: #888;
            }

            .status {
              margin-top: 10px;
              color: #777;
              font-size: 12px;
            }

            .resolved {
              margin-top: 10px;
              color: #e85d3f;
              font-weight: bold;
              font-size: 12px;
            }

            .attachments {
              margin-top: 10px;
            }

            .attachment {
              font-size: 12px;
              color: #555;
              margin-top: 4px;
            }
          </style>
        </head>

        <body>

          <h1>${escapeHtml(agentName)} Chat</h1>

          <div class="subtitle">
            Chat history exported from the application
          </div>

          ${chatHtml}

        </body>
      </html>
    `;

      const { uri } = await Print.printToFileAsync({
        html,
      });

      console.log('[Aria] Temporary PDF:', uri);

      const newUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: newUri,
      });

      console.log('[Aria] Renamed PDF:', newUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Linking.openURL(newUri);
      }
    } catch (downloadError) {
      console.error('[Aria] PDF download failed:', downloadError);

      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download chat as PDF.');
    } finally {
      setDownloadLoading(false);
    }
  };
  return { downloadLoading, downloadChatAsPdf };
}

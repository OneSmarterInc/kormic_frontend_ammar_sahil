import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import {
  chatWithAria,
  clearAriaChat,
  editAriaMessage,
  getAgentName,
  getAriaHistory,
  updateAgentName,
} from '../../services/api';
import {
  buildAriaThreads,
  cacheAriaMessages,
  DEFAULT_AGENT_NAME,
  getCachedAriaMessages,
  getWelcomeMessage,
  groupThreadsByDate,
  normalizeAriaHistory,
  stripWelcomeMessage,
} from './chatHistory';
import { AriaChatProps, ChatMessage } from './types';
import { useChatAttachments } from './useChatAttachments';
import { useChatPdfExport } from './useChatPdfExport';
export function useAriaChat({
  session,
  refreshKey = 0,
  onAgentNameChange,
  headerCommand,
  onHeaderCommandHandled,
}: AriaChatProps) {
  const cachedMessages = getCachedAriaMessages(session);
  const [agentName, setAgentName] = useState(DEFAULT_AGENT_NAME);
  const [messages, setMessages] = useState<ChatMessage[]>(
    cachedMessages.length > 0 ? cachedMessages : [getWelcomeMessage(DEFAULT_AGENT_NAME)],
  );
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>(cachedMessages);
  const [selectedThreadId, setSelectedThreadId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(DEFAULT_AGENT_NAME);
  const [nameSaving, setNameSaving] = useState(false);
  const [error, setError] = useState('');
  const {
    selectedAttachments,
    setSelectedAttachments,
    pickAttachments,
    isImageAttachment,
    openProtectedAttachment,
  } = useChatAttachments(setError);
  const messagesScrollRef = useRef<ScrollView | null>(null);
  const shouldScrollMessagesToEndRef = useRef(true);
  const historyThreads = useMemo(() => buildAriaThreads(historyMessages), [historyMessages]);
  const groupedThreads = useMemo(() => groupThreadsByDate(historyThreads), [historyThreads]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | undefined>();
  const [editingMessage, setEditingMessage] = useState<ChatMessage | undefined>();
  const [editDraft, setEditDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const scrollMessagesToEnd = (animated = true) => {
    requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollToEnd({ animated });
    });
  };
  useEffect(() => {
    shouldScrollMessagesToEndRef.current = true;
  }, [messages.length, loading, historyLoading]);
  useEffect(() => {
    if (!session) {
      return;
    }

    const hasPendingEscalation = messages.some(
      (message) => message.role === 'aria' && message.escalationStatus === 'pending',
    );

    if (!hasPendingEscalation) {
      return;
    }

    console.log('[Aria] Pending escalation detected. Starting auto-refresh.');

    const interval = setInterval(async () => {
      try {
        console.log('[Aria] Checking for university response...');

        const history = await getAriaHistory(session);
        const nextHistory = normalizeAriaHistory(history.messages ?? []);

        setHistoryMessages(nextHistory);
        cacheAriaMessages(session, nextHistory);

        setMessages(nextHistory.length > 0 ? nextHistory : [getWelcomeMessage(agentName)]);

        const stillPending = nextHistory.some(
          (message) => message.role === 'aria' && message.escalationStatus === 'pending',
        );

        console.log('[Aria] Auto-refresh result:', {
          messageCount: nextHistory.length,
          stillPending,
        });
      } catch (error) {
        console.log('[Aria] Auto-refresh failed:', error);
      }
    }, 5000);

    return () => {
      console.log('[Aria] Stopping auto-refresh.');
      clearInterval(interval);
    };
  }, [session, messages, agentName]);
  const applyAgentName = (nextAgentName: string) => {
    setAgentName(nextAgentName);
    setNameDraft(nextAgentName);
    onAgentNameChange?.(nextAgentName);

    setMessages((current) =>
      current.length === 1 && current[0]?.id === 'welcome' ? [getWelcomeMessage(nextAgentName)] : current,
    );
  };
  const loadAgentName = async () => {
    if (!session) {
      applyAgentName(DEFAULT_AGENT_NAME);
      return DEFAULT_AGENT_NAME;
    }

    try {
      const response = await getAgentName(session);
      const nextAgentName =
        response.agent_name?.trim() || response.agent?.trim() || response.name?.trim() || DEFAULT_AGENT_NAME;
      applyAgentName(nextAgentName);
      return nextAgentName;
    } catch {
      applyAgentName(DEFAULT_AGENT_NAME);
      return DEFAULT_AGENT_NAME;
    }
  };
  const loadHistory = async (nextAgentName = agentName, syncActiveChat = false) => {
    if (!session) return;

    try {
      setHistoryLoading(true);
      setError('');

      const history = await getAriaHistory(session);
      const historyMessages = normalizeAriaHistory(history.messages ?? []);

      setHistoryMessages(historyMessages);
      cacheAriaMessages(session, historyMessages);
      setSelectedThreadId(undefined);

      if (syncActiveChat) {
        setMessages(historyMessages.length > 0 ? historyMessages : [getWelcomeMessage(nextAgentName)]);
      }
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Unable to load agent chat history');
    } finally {
      setHistoryLoading(false);
    }
  };
  useEffect(() => {
    const loadAgent = async () => {
      const nextAgentName = await loadAgentName();
      await loadHistory(nextAgentName, true);
    };

    loadAgent();
  }, [session?.access, session?.user?.student_id, refreshKey]);
  const clearChat = async () => {
    if (!session || clearLoading) {
      return;
    }

    try {
      setClearLoading(true);
      setError('');
      await clearAriaChat(session);

      const welcomeMessage = getWelcomeMessage(agentName);
      setMessages([welcomeMessage]);
      setHistoryMessages([]);
      setSelectedThreadId(undefined);
      setSidebarOpen(false);
      cacheAriaMessages(session, []);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear agent chat');
    } finally {
      setClearLoading(false);
    }
  };
  const confirmClearChat = () => {
    if (!session || clearLoading || loading || historyLoading) {
      return;
    }
    setClearConfirmVisible(true);
  };
  const { downloadChatAsPdf } = useChatPdfExport(messages, agentName, setError);

  const closeClearConfirm = () => {
    if (!clearLoading) {
      setClearConfirmVisible(false);
    }
  };
  const clearConfirmedChat = async () => {
    await clearChat();
    setClearConfirmVisible(false);
  };
  const sendMessage = async () => {
    const message = draft.trim();
    const pendingAttachments = selectedAttachments;

    if ((!message && selectedAttachments.length === 0) || loading) {
      return;
    }

    if (!session) {
      setError(`Please sign in again to chat with ${agentName}.`);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: message,
    };

    try {
      setLoading(true);
      setError('');
      setMessages((current) => {
        const nextMessages = [...current, userMessage];
        cacheAriaMessages(session, stripWelcomeMessage(nextMessages));
        return nextMessages;
      });
      setHistoryMessages((current) => {
        const nextMessages = [...current, userMessage];
        cacheAriaMessages(session, nextMessages);
        return nextMessages;
      });
      setSelectedThreadId(undefined);
      setDraft('');
      setSelectedAttachments([]);

      const response = await chatWithAria(session, message, pendingAttachments);
      if (response.agent?.trim()) {
        applyAgentName(response.agent.trim());
      }
      const ariaMessage: ChatMessage = {
        id: `aria-${Date.now()}`,
        role: 'aria',
        text: response.reply || response.message || `${response.agent || agentName} did not return a reply.`,
        pending: response.pending === true,
        queryId: typeof response.query_id === 'number' ? response.query_id : null,
        escalationStatus: response.pending === true ? 'pending' : null,
        confidence: typeof response.confidence === 'number' ? response.confidence : null,
      };
      setMessages((current) => {
        const nextMessages = [...current, ariaMessage];
        cacheAriaMessages(session, stripWelcomeMessage(nextMessages));
        return nextMessages;
      });
      setHistoryMessages((current) => {
        const nextMessages = [...current, ariaMessage];
        cacheAriaMessages(session, nextMessages);
        return nextMessages;
      });

      await loadHistory(agentName, true);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : `Unable to chat with ${agentName}`);
    } finally {
      setLoading(false);
    }
  };
  const copyResponse = async (message: ChatMessage) => {
    try {
      setError('');

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.text);
      } else {
        await Clipboard.setStringAsync(message.text);
      }

      setCopiedMessageId(message.id);

      setTimeout(() => {
        setCopiedMessageId((current) => (current === message.id ? undefined : current));
      }, 1600);
    } catch (copyError) {
      setError(
        copyError instanceof Error
          ? `Clipboard access failed: ${copyError.message}`
          : 'Unable to copy response to clipboard.',
      );
    }
  };
  const startEditingMessage = (message: ChatMessage) => {
    if (message.role !== 'user' || !message.serverId) return;
    setEditingMessage(message);
    setEditDraft(message.text);
    setError('');
  };
  const cancelEditingMessage = () => {
    if (editLoading) return;
    setEditingMessage(undefined);
    setEditDraft('');
  };
  const saveEditedMessage = async () => {
    const nextText = editDraft.trim();
    if (!session || !editingMessage?.serverId || !nextText || editLoading) return;

    try {
      setEditLoading(true);
      setError('');
      await editAriaMessage(session, editingMessage.serverId, nextText);
      setEditingMessage(undefined);
      setEditDraft('');
      await loadHistory(agentName, true);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Unable to edit message.');
    } finally {
      setEditLoading(false);
    }
  };
  const startEditingName = () => {
    setNameDraft(agentName);
    setEditingName(true);
    setError('');
  };
  useEffect(() => {
    if (!headerCommand) {
      return;
    }

    if (headerCommand.type === 'edit') {
      startEditingName();
      onHeaderCommandHandled?.();
      return;
    }

    if (headerCommand.type === 'history') {
      setSidebarOpen((current) => !current);
      onHeaderCommandHandled?.();
    }

    if (headerCommand.type === 'download') {
      void downloadChatAsPdf();
      onHeaderCommandHandled?.();
    }
  }, [headerCommand?.id]);
  const cancelEditingName = () => {
    setNameDraft(agentName);
    setEditingName(false);
    setError('');
  };
  const saveAgentName = async () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName || nameSaving) {
      setError('Agent name is required.');
      return;
    }

    if (!session) {
      setError('Please sign in again to edit your agent name.');
      return;
    }

    try {
      setNameSaving(true);
      setError('');
      const response = await updateAgentName(session, trimmedName);
      const nextAgentName =
        response.agent_name?.trim() || response.agent?.trim() || response.name?.trim() || trimmedName;
      applyAgentName(nextAgentName);
      setEditingName(false);
    } catch (nameError) {
      setError(nameError instanceof Error ? nameError.message : 'Unable to update agent name');
    } finally {
      setNameSaving(false);
    }
  };
  return {
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
  };
}
export type AriaChatController = ReturnType<typeof useAriaChat>;

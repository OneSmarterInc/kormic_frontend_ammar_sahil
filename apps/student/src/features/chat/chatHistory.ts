import { AuthSession } from '../../models/onboarding';
import { AriaHistoryMessage } from '../../services/api';
import { ChatMessage, ChatThread, ThreadGroup } from './types';

export const SUGGESTED_PROMPT = 'How is my profile? What should I improve?';

export const SUGGESTED_PROMPTS = [
  SUGGESTED_PROMPT,
  'Which profile gaps should I fix first?',
  'How can I improve my university fit?',
];

export const DEFAULT_AGENT_NAME = 'Aria';

export const getWelcomeMessage = (agentName: string): ChatMessage => ({
  id: 'welcome',
  role: 'aria',
  text: `Hi, I am ${agentName}. Ask me about your profile, resumes, GitHub, LinkedIn, or what to improve next.`,
});

export const ariaMessageCache = new Map<string, ChatMessage[]>();

export function normalizeAriaHistory(messages: AriaHistoryMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.content || message.attachments?.length)
    .map((message, index) => {
      const meta = message.meta ?? {};
      const escalation = message.escalation ?? null;
      const escalationQueryId = escalation?.query_id;
      const metaQueryId = meta.query_id;
      const queryId =
        typeof escalationQueryId === 'number'
          ? escalationQueryId
          : typeof metaQueryId === 'number'
            ? metaQueryId
            : null;
      const escalationStatus = escalation?.status ?? null;
      const question = typeof meta.question === 'string' ? meta.question : undefined;
      const answer = typeof meta.answer === 'string' ? meta.answer : undefined;

      return {
        id: String(message.id ?? `${message.sender}-${message.created_at ?? index}`),
        serverId: message.id,
        role: message.sender === 'user' ? 'user' : 'aria',
        text: message.content,
        createdAt: message.created_at,
        editedAt: message.edited_at,
        attachments: message.attachments ?? [],
        pending: escalationStatus === 'pending' || meta.pending === true,
        queryId,
        escalationStatus,
        wasEscalatedPrompt: meta.pending === true,
        confidence: typeof meta.confidence === 'number' ? meta.confidence : null,
        meta,
        question,
        answer,
      };
    });
}

export function getAriaCacheKey(session: AuthSession | undefined) {
  return session?.user?.student_id || session?.user?.email || 'guest';
}

export function getCachedAriaMessages(session: AuthSession | undefined) {
  return ariaMessageCache.get(getAriaCacheKey(session)) ?? [];
}

export function cacheAriaMessages(session: AuthSession | undefined, messages: ChatMessage[]) {
  if (!session) {
    return;
  }

  ariaMessageCache.set(getAriaCacheKey(session), stripWelcomeMessage(messages));
}

export function stripWelcomeMessage(messages: ChatMessage[]) {
  return messages.filter((message) => message.id !== 'welcome');
}

export function buildAriaThreads(messages: ChatMessage[]): ChatThread[] {
  const threads: ChatThread[] = [];
  let currentThread: ChatThread | undefined;

  messages.forEach((message, index) => {
    const startsThread = message.role === 'user' || !currentThread;
    if (startsThread) {
      currentThread = {
        id: `thread-${message.createdAt ?? index}`,
        title: message.role === 'user' ? getThreadTitle(message.text) : 'Agent update',
        createdAt: message.createdAt,
        messages: [message],
      };
      threads.push(currentThread);
      return;
    }

    const activeThread = currentThread;
    if (activeThread) {
      activeThread.messages = [...activeThread.messages, message];
    }
  });

  return threads.sort((left, right) => getTimeValue(right.createdAt) - getTimeValue(left.createdAt));
}

export function groupThreadsByDate(threads: ChatThread[]): ThreadGroup[] {
  const grouped = new Map<string, ChatThread[]>();

  threads.forEach((thread) => {
    const groupTitle = getRelativeDateLabel(thread.createdAt);
    grouped.set(groupTitle, [...(grouped.get(groupTitle) ?? []), thread]);
  });

  return Array.from(grouped.entries()).map(([title, groupedThreads]) => ({
    title,
    threads: groupedThreads,
  }));
}

export function getThreadTitle(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'New chat';
  }

  return compact.length > 54 ? `${compact.slice(0, 51)}...` : compact;
}

export function getRelativeDateLabel(value: string | undefined) {
  const date = getValidDate(value);
  if (!date) {
    return 'Older';
  }

  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const dayDifference = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (dayDifference === 0) {
    return 'Today';
  }
  if (dayDifference === 1) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getValidDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function getTimeValue(value: string | undefined) {
  return getValidDate(value)?.getTime() ?? 0;
}

export function formatChatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatChatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

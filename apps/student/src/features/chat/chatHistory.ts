import { cacheChat, cacheGeneration, readCachedChat, onStudentCacheClear } from '../../services/studentCache';
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
onStudentCacheClear(() => ariaMessageCache.clear());

export async function hydrateAriaMessages(session: AuthSession) {
  const generation = cacheGeneration();
  const saved = await readCachedChat(session);
  if (generation === cacheGeneration() && saved && !ariaMessageCache.has(getAriaCacheKey(session))) {
    ariaMessageCache.set(getAriaCacheKey(session), saved);
  }
  return getCachedAriaMessages(session);
}

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

export function pendingAriaQueryIds(messages: ChatMessage[]) {
  return [...new Set(messages
    .filter((message) => message.role === 'aria' && message.escalationStatus === 'pending' &&
      typeof message.queryId === 'number')
    .map((message) => message.queryId as number))].sort((left, right) => left - right);
}

export function latestAriaServerId(messages: ChatMessage[]) {
  return messages.reduce((latest, message) => {
    const id = Number(message.serverId);
    return Number.isSafeInteger(id) && id > latest ? id : latest;
  }, 0);
}

export function mergeAriaUpdates(
  current: ChatMessage[], incoming: ChatMessage[], statuses: Record<string, string>,
) {
  let changed = false;
  const updated = current.map((message) => {
    if (typeof message.queryId !== 'number' ||
        !Object.prototype.hasOwnProperty.call(statuses, String(message.queryId))) return message;
    const status = statuses[String(message.queryId)];
    if (message.escalationStatus === status && message.pending === (status === 'pending')) return message;
    changed = true;
    return { ...message, escalationStatus: status, pending: status === 'pending' };
  });
  const seen = new Set(updated.map((message) => message.id));
  for (const message of incoming) {
    if (!seen.has(message.id)) {
      seen.add(message.id);
      updated.push(message);
      changed = true;
    }
  }
  if (!changed) return current;
  return incoming.length ? stripWelcomeMessage(updated) : updated;
}

export function getAriaCacheKey(session: AuthSession | undefined) {
  return session?.user?.student_id || session?.user?.email || 'guest';
}

export function getCachedAriaMessages(session: AuthSession | undefined) {
  return ariaMessageCache.get(getAriaCacheKey(session)) ?? [];
}

export function cacheAriaMessages(session: AuthSession | undefined, messages: ChatMessage[], expectedGeneration = cacheGeneration()) {
  if (expectedGeneration !== cacheGeneration()) return;
  if (!session) {
    return;
  }

  ariaMessageCache.set(getAriaCacheKey(session), stripWelcomeMessage(messages));
  void cacheChat(session, stripWelcomeMessage(messages), expectedGeneration);
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

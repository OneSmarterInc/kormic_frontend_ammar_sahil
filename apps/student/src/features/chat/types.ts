import { AriaAttachment } from '../../services/api';

export type ChatMessage = {
  id: string;
  serverId?: number | string;
  role: 'user' | 'aria';
  text: string;
  createdAt?: string;
  editedAt?: string | null;
  attachments?: AriaAttachment[];
  pending?: boolean;
  queryId?: number | null;
  escalationStatus?: 'pending' | 'resolved' | 'ignored' | string | null;
  wasEscalatedPrompt?: boolean;
  confidence?: number | null;
  meta?: Record<string, unknown>;
  question?: string;
  answer?: string;
};

export type ChatThread = {
  id: string;
  title: string;
  createdAt?: string;
  messages: ChatMessage[];
};

export type ThreadGroup = {
  title: string;
  threads: ChatThread[];
};

export type AriaHeaderCommand = {
  type: 'edit' | 'history' | 'download';
  id: number;
};

import { AuthSession } from '../../models/onboarding';
export type AriaChatProps = {
  session?: AuthSession;
  refreshKey?: number;
  onAgentNameChange?: (agentName: string) => void;
  headerCommand?: AriaHeaderCommand;
  onHeaderCommandHandled?: () => void;
  hideHeader?: boolean;
};

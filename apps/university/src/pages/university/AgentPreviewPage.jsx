import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Bot, Trash2 } from "lucide-react";

import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import ChatThread from "../../components/common/ChatThread";
import ConfirmDialog from "../../components/common/ConfirmDialog";

import {
  chatWithUniversityAgent,
  getUniversityChatHistory,
  deleteUniversityChatHistory,
} from "../../api/universityApi";
import { getAgentName } from "../../api/universityAdminApi";

import { useAction, useAsync } from "../../hooks/useAsync";
import { resumeAgentJob } from '../../api/agentJobs';

export default function AgentPreviewPage() {
  const { universityId } = useParams();

  const [messages, setMessages] = useState([]);
  const [lastMeta, setLastMeta] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [resuming, setResuming] = useState(false);

  const { data: history, loading: historyLoading, error: historyError, refetch: refetchHistory } = useAsync(
    (signal) => getUniversityChatHistory(universityId, signal),
    [universityId]
  );

  const { data: agentInfo } = useAsync(getAgentName, [universityId]);

  useEffect(() => {
    const controller = new AbortController();
    setResuming(true);
    resumeAgentJob(controller.signal).then(result => {
      if (result && !controller.signal.aborted) refetchHistory();
    }).catch(error => {
      if (!controller.signal.aborted) toast.error(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setResuming(false);
    });
    return () => controller.abort();
  }, [universityId]);

  useEffect(() => {
    setMessages([]);
    setLastMeta(null);
  }, [universityId]);

  useEffect(() => {
    if (!history) return;

    setMessages(
      (history.messages || []).map((m) => ({
        role: m.sender === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
    );
  }, [history]);

  const { execute, loading: sending } = useAction((message) =>
    chatWithUniversityAgent(universityId, message)
  );
  const loading = sending || resuming;

  const { execute: clearHistory, loading: clearing } = useAction(() =>
    deleteUniversityChatHistory(universityId)
  );

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      setMessages([]);
      setLastMeta(null);
      toast.success("Conversation cleared");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmClearOpen(false);
    }
  };

  const handleSend = async (message) => {
    setMessages((m) => [...m, { role: "user", content: message }]);

    try {
      const res = await execute(message);

      setLastMeta(res);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.reply,
          tone: res.pending ? "warning" : undefined,
        },
      ]);

      if (res.pending) {
        toast(
          "Escalated to a pending query — the agent couldn't answer confidently.",
          {
            icon: "⚠️",
          }
        );
      }
    } catch (err) {
      toast.error(err.message);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Agent chat failed: ${err.message}`,
          tone: "warning",
        },
      ]);
    }
  };

  return (
    <div
      className="
        flex
        flex-col
        h-[calc(100vh-70px)]
      "
    >
      <PageHeader
        title="University Agent"
        description="Ask about your university, interested students, eligibility, and knowledge base."
      />

      <Card
        className="
          mx-auto
          w-full
          max-w-5xl
          flex-1
          overflow-hidden
          flex
          flex-col
        "
      >
        <CardHeader
          icon={Bot}
          title={lastMeta?.agent_name || agentInfo?.agent_name || "Your agent"}
          subtitle="The same university agent answers questions from student agents."
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={Trash2}
              loading={clearing}
              disabled={messages.length === 0 || loading}
              onClick={() => setConfirmClearOpen(true)}
            >
              Clear conversation
            </Button>
          }
        />

        <CardBody className="flex-1 p-0 overflow-hidden">
          {historyLoading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Spinner label="Loading conversation..." />
            </div>
          ) : historyError && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <ErrorBanner error={historyError} onDismiss={refetchHistory} />
            </div>
          ) : (
            <ChatThread
              compact
              heightClass="h-full"
              messages={messages}
              onSend={handleSend}
              loading={loading}
              placeholder="Ask about interested students, admissions, or university information..."
              emptyTitle="Ask your university agent"
              emptyDescription='Try: "Which interested students meet our admission requirements?"'
            />
          )}
        </CardBody>
      </Card>

      {lastMeta?.sources?.length > 0 && (
        <div className="mx-auto mt-2 w-full max-w-5xl text-xs text-ink-500">
          <span>Knowledge retrieved for this answer: </span>
          {lastMeta.sources.map((source, index) => (
            <span key={source.id ?? index}>
              {index > 0 && " · "}
              {/^https?:\/\//i.test(source.source_url || "") ? (
                <a href={source.source_url} target="_blank" rel="noreferrer" className="underline">
                  {source.topic}
                </a>
              ) : source.topic}
            </span>
          ))}
        </div>
      )}

      <div className="h-4" />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear conversation?"
        message="This can't be undone."
        confirmLabel="Clear"
        danger
        loading={clearing}
        onConfirm={handleClearHistory}
        onClose={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}

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

export default function AgentPreviewPage() {
  const { universityId } = useParams();

  const [messages, setMessages] = useState([]);
  const [lastMeta, setLastMeta] = useState(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { data: history, loading: historyLoading, error: historyError, refetch: refetchHistory } = useAsync(
    (signal) => getUniversityChatHistory(universityId, signal),
    [universityId]
  );

  const { data: agentInfo } = useAsync(getAgentName, [universityId]);

  useEffect(() => {
    if (!history) return;

    setMessages(
      (history.messages || []).map((m) => ({
        role: m.sender === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
    );
  }, [history]);

  const { execute, loading } = useAction((message) =>
    chatWithUniversityAgent(universityId, message)
  );

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
        description="Ask questions on your university profile."
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
          subtitle="Every turn here is logged just like a real student conversation."
          action={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={Trash2}
              loading={clearing}
              disabled={messages.length === 0}
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
              placeholder="Ask something a prospective student might ask..."
              emptyTitle="Test your agent"
              emptyDescription='Try: "What is the minimum GPA required to apply?"'
            />
          )}
        </CardBody>
      </Card>

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
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, MessagesSquare, UserX } from "lucide-react";

import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import ChatThread from "../../components/common/ChatThread";
import ProfileSummary from "../../components/university/ProfileSummary";
import {
  getUniversityProfile,
  chatWithPresenter,
  getPresenterChatHistory,
} from "../../api/universityApi";
import { getAgentName } from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";

export default function ProfileDetailPage() {
  const { universityId, studentId } = useParams();

  const { data: profile, loading, error, refetch } = useAsync(
    (signal) => getUniversityProfile(universityId, studentId, signal),
    [universityId, studentId]
  );

  const { data: agentInfo } = useAsync(getAgentName, [universityId]);

  const notFound = error?.status === 404;

  return (
    <div className="space-y-6">
      <Link
        to={`/university/${universityId}/profiles`}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-700 hover:shadow-md"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profiles
      </Link>

      {/* <PageHeader
        title={studentId}
        description="Officer view - profile detail and Q&A."
      /> */}

      {notFound ? (
        <Card>
          <EmptyState
            icon={UserX}
            title="Profile not found"
            description="This student's profile doesn't exist anymore, or the link is out of date."
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:h-[calc(100vh-9rem)] lg:min-h-[420px] lg:grid-cols-[1.25fr_0.75fr]">
          <Card className="lg:flex lg:h-full lg:flex-col">
            {/* <CardHeader icon={UserRound} title="Profile" /> */}

            <CardBody className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {loading ? (
                <Spinner label="Loading profile..." />
              ) : error ? (
                <ErrorBanner error={error} onDismiss={refetch} />
              ) : (
                <ProfileSummary profile={profile} />
              )}
            </CardBody>
          </Card>

          <PresenterChatCard
            universityId={universityId}
            studentId={studentId}
            agentName={agentInfo?.agent_name}
          />
        </div>
      )}
    </div>
  );
}

function PresenterChatCard({ universityId, studentId, agentName }) {
  const [messages, setMessages] = useState([]);

  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useAsync(
    (signal) => getPresenterChatHistory(universityId, studentId, signal),
    [universityId, studentId]
  );

  useEffect(() => {
    if (!history) return;
    setMessages(
      (history.messages || []).map((m) => ({
        role: m.sender === "assistant" ? "assistant" : "user",
        content: m.content,
      }))
    );
  }, [history]);

  const { execute, loading } = useAction((question, history) =>
    chatWithPresenter(universityId, studentId, question, history)
  );

  const handleSend = async (question) => {
    const history = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    setMessages((m) => [...m, { role: "user", content: question }]);

    try {
      const res = await execute(question, history);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
        },
      ]);
    } catch (err) {
      toast.error(err.message);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Presenter failed: ${err.message}`,
          tone: "warning",
        },
      ]);
    }
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all duration-300">
      <CardHeader
        icon={MessagesSquare}
        title={agentName ? `Ask ${agentName} about this student` : "Ask your agent about this student"}
        subtitle="Ask honest questions about this interested candidate and get a quick assessment of their fit for your program."
      />

      <CardBody className="min-h-0 flex-1 p-0">
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
            placeholder="e.g. Is this student a strong fit? What are the biggest gaps?"
            emptyTitle="Ask about this applicant"
            emptyDescription='Try: "Is this student a strong fit for our MS CS program?"'
          />
        )}
      </CardBody>
    </Card>
  );
}
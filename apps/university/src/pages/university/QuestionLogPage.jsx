import { useParams } from "react-router-dom";
import { History } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import { listQuestionLog } from "../../api/universityApi";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../lib/text";

export default function QuestionLogPage() {
  const { universityId } = useParams();

  const { data, loading, error, refetch } = useAsync(
    (signal) => listQuestionLog(universityId, signal),
    [universityId]
  );

  const questions = data?.questions || [];

  return (
    <div>
      <PageHeader
        title="Question log"
        description="Raw officer questions asked via the Profile Presenter, auto-classified by topic."
      />

      {loading ? (
        <Spinner label="Loading question log..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : questions.length === 0 ? (
        <Card>
          <EmptyState icon={History} title="No questions logged yet" />
        </Card>
      ) : (
        <Card className="max-w-5xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[43%]" />
                <col className="w-[15%]" />
                <col className="w-[20%]" />
              </colgroup>

              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Student</th>
                  <th className="px-4 py-2.5 font-medium">Question</th>
                  <th className="px-4 py-2.5 font-medium">Topic</th>
                  <th className="px-4 py-2.5 font-medium">Asked</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-ink-100">
                {questions.map((q, i) => (
                  <tr key={i} className="hover:bg-ink-50/60">
                    <td className="truncate px-4 py-2.5 text-ink-700">
                      {q.student_name || "—"}
                    </td>

                    <td className="truncate px-4 py-2.5 text-ink-800">
                      {q.question}
                    </td>

                    <td className="px-4 py-2.5">
                      <Badge tone="brand">{q.topic || "general"}</Badge>
                    </td>

                    <td className="truncate px-4 py-2.5 text-xs text-ink-400">
                      {formatDateTime(q.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { useParams } from "react-router-dom";
import { BookOpenCheck } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody } from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import { listVerifiedKnowledge } from "../../api/universityApi";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../lib/text";

export default function KnowledgePage() {
  const { universityId } = useParams();
  const { data, loading, error, refetch } = useAsync(
    (signal) => listVerifiedKnowledge(universityId, signal),
    [universityId]
  );

  const answers = data?.verified_answers || [];

  return (
    <div>
      <PageHeader
        title="Verified knowledge"
        description="Durable answers that resolve future student questions instantly."
      />

      {loading ? (
        <Spinner label="Loading verified knowledge..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : answers.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpenCheck}
            title="No verified answers yet"
            description="Answers from the Queries tab land here once saved."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {answers.map((a) => (
            <Card key={a.query_id} className="p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="success">verified</Badge>
                <span className="text-xs text-ink-400">#{a.query_id}</span>
                <span className="text-xs text-ink-400">
                  synced {formatDateTime(a.synced_at)}
                </span>
              </div>
              <p className="text-sm font-medium text-ink-900">{a.question}</p>
              <p className="mt-1.5 text-sm text-ink-700">{a.answer}</p>
              <p className="mt-2 text-xs text-ink-400">Answered by {a.answered_by}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Layers, XCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";
import ErrorBanner from "../common/ErrorBanner";
import EmptyState from "../common/EmptyState";
import Spinner from "../common/Spinner";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAsync, useAction } from "../../hooks/useAsync";
import { knowledgeGroupLabel, knowledgeGroupTone } from "../../lib/knowledgeGroups";
import { formatDateTime } from "../../lib/text";

export default function AutoDiscoverClustersModal({ jobId, open, onClose, onUrlsChanged }) {
  const { data, loading, error, refetch } = useAsync(
    (signal) => universityAdminApi.getAutoDiscoverClusters(jobId, signal),
    [jobId, open],
    { enabled: open && !!jobId }
  );

  const clusters = data?.clusters || [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Review by department"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          This crawl's candidate pages, grouped by department. Approving a cluster applies its
          URLs, scrapes them, and tags the resulting facts with the matching knowledge group.
        </p>

        {error && <ErrorBanner error={error} onDismiss={refetch} />}

        {loading ? (
          <Spinner label="Loading clusters..." />
        ) : !error && clusters.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No clusters"
            description="No candidate URLs were found to review for this job."
          />
        ) : (
          <div className="space-y-3">
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.category}
                jobId={jobId}
                cluster={cluster}
                onApproved={refetch}
                onUrlsChanged={onUrlsChanged}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ClusterCard({ jobId, cluster, onApproved, onUrlsChanged }) {
  const [scrapeResult, setScrapeResult] = useState(null);
  const { execute, loading, error } = useAction(() =>
    universityAdminApi.approveAutoDiscoverCluster(jobId, cluster.category)
  );

  const approved = cluster.approved;

  const handleApprove = async () => {
    try {
      const res = await execute();
      setScrapeResult(res.scrape_result);
      toast.success(
        `${res.scrape_result?.total_facts_stored ?? 0} fact(s) stored for ${cluster.label}`
      );
      onApproved();
      onUrlsChanged?.();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-4 transition-all duration-150 hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink-900">{cluster.label}</p>
            {cluster.knowledge_group_slug && (
              <Badge tone={knowledgeGroupTone(cluster.knowledge_group_slug)}>
                {knowledgeGroupLabel(cluster.knowledge_group_slug)}
              </Badge>
            )}
            <span className="text-xs text-ink-400">{cluster.url_count} URL(s)</span>
            {approved && (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" /> Approved
              </Badge>
            )}
          </div>

          <ul className="space-y-0.5">
            {cluster.urls.map((u) => (
              <li key={u.id ?? u.url} className="truncate text-xs text-ink-400" title={u.url}>
                {u.page_title ? `${u.page_title} — ${u.url}` : u.url}
              </li>
            ))}
          </ul>

          {approved && (
            <p className="mt-1.5 text-xs text-ink-400">
              Approved by {approved.approved_by}
              {approved.approved_at ? ` · ${formatDateTime(approved.approved_at)}` : ""}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant={approved ? "secondary" : "primary"}
          onClick={handleApprove}
          loading={loading}
        >
          {approved ? "Re-approve" : "Approve"}
        </Button>
      </div>

      {error && <ErrorBanner error={error} className="mt-3" />}

      {scrapeResult && (
        <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
          <p className="text-xs font-medium text-ink-500">
            {scrapeResult.total_facts_stored} fact(s) stored
          </p>
          {scrapeResult.results.map((r) => (
            <div key={r.url} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-ink-500" title={r.url}>
                {r.url}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="text-ink-400">{r.facts_stored} facts</span>
                {r.status === "ok" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

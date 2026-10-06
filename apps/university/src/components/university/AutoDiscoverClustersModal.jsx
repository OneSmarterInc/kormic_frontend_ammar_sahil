import { useEffect } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Layers, Loader2, XCircle } from "lucide-react";
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
  const hasActiveScrape = clusters.some((cluster) =>
    ["queued", "running"].includes(cluster.approved?.scrape_job?.status)
  );

  useEffect(() => {
    if (!open || !jobId || !hasActiveScrape) return undefined;
    let cancelled = false;
    const timer = setInterval(() => {
      universityAdminApi.getAutoDiscoverClusters(jobId)
        .then((next) => { if (!cancelled) setData(next); })
        .catch(() => { /* Keep the current progress; the next poll can recover. */ });
    }, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [open, jobId, hasActiveScrape]);

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
          URLs and queues a background scrape. The department mapping records the review decision;
          scraped facts remain in the university knowledge base.
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
  const { execute, loading, error } = useAction(() =>
    universityAdminApi.approveAutoDiscoverCluster(jobId, cluster.category)
  );

  const approved = cluster.approved;
  const scrapeJob = approved?.scrape_job;
  const scrapeResult = scrapeJob?.result;
  const active = ["queued", "running"].includes(scrapeJob?.status);

  const handleApprove = async () => {
    try {
      const res = await execute();
      toast.success(`Scrape queued for ${cluster.label} (job #${res.scrape_job.id}).`);
      onApproved();
      onUrlsChanged?.();
    } catch (err) {
      toast.error(err.message);
      // Approval may already be persisted when the broker rejects dispatch;
      // reload so the failed job and its retry button are visible.
      onApproved();
      onUrlsChanged?.();
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
            {active && <Badge tone="brand"><Loader2 className="h-3 w-3 animate-spin" /> {scrapeJob.status === "queued" ? "Queued" : "Scraping"}</Badge>}
            {scrapeJob?.status === "failed" && <Badge tone="danger"><XCircle className="h-3 w-3" /> Failed</Badge>}
            {scrapeJob?.status === "completed" && <Badge tone="success">Scraped</Badge>}
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
              {scrapeJob ? ` · Job #${scrapeJob.id}` : ""}
            </p>
          )}
          {active && (
            <div className="mt-1 text-xs text-ink-500">
              <p>{scrapeJob.progress_completed} of {scrapeJob.progress_total} pages processed</p>
              {scrapeJob.current_url && (
                <p className="truncate" title={scrapeJob.current_url}>Current: {scrapeJob.current_url}</p>
              )}
            </div>
          )}
          {scrapeJob?.status === "failed" && (
            <p role="alert" className="mt-2 text-xs text-red-600">{scrapeJob.error_message || "The scrape failed. You can retry."}</p>
          )}
        </div>

        <Button
          size="sm"
          variant={approved ? "secondary" : "primary"}
          onClick={handleApprove}
          loading={loading}
          disabled={active}
        >
          {active ? "In progress" : scrapeJob?.status === "failed" ? "Retry scrape" : approved ? "Re-approve" : "Approve"}
        </Button>
      </div>

      {error && <ErrorBanner error={error} className="mt-3" />}

      {scrapeJob?.status === "completed" && scrapeResult && (
        <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-3">
          <p className="text-xs font-medium text-ink-500">
            {scrapeResult.total_facts_stored} fact(s) stored
          </p>
          {(scrapeResult.results || []).map((r) => (
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

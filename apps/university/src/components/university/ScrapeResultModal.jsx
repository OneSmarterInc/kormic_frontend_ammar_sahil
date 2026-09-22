import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import Modal from "../common/Modal";
import Badge from "../common/Badge";

// Handles both result shapes:
//  - scrape-now job `result`      → { total_facts_stored, results: [{ url, status: "ok"|"failed", facts_stored, error }] }
//  - auto-discover `scrape_result` → { mode, total_facts_stored, applied_urls, results: [{ url, status: "ok"|"skipped", reason, facts_stored }] }
const STATUS_META = {
  ok: { tone: "success", label: "scraped", Icon: CheckCircle2 },
  skipped: { tone: "neutral", label: "skipped", Icon: MinusCircle },
  failed: { tone: "danger", label: "failed", Icon: XCircle },
};

export default function ScrapeResultModal({
  open,
  onClose,
  result,
  title = "Last scrape result",
  context,
}) {
  const results = result?.results || [];

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const totalFacts =
    result?.total_facts_stored ??
    results.reduce((sum, r) => sum + (r.facts_stored || 0), 0);

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {!result ? (
        <p className="text-sm text-ink-500">No scrape has run yet.</p>
      ) : (
        <div className="space-y-4">
          {context && <p className="text-xs text-ink-400">{context}</p>}

          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">
              {totalFacts} fact{totalFacts === 1 ? "" : "s"} stored
            </Badge>
            <Badge tone="neutral">
              {results.length} page{results.length === 1 ? "" : "s"}
            </Badge>
            {counts.ok > 0 && <Badge tone="success">{counts.ok} scraped</Badge>}
            {counts.skipped > 0 && <Badge tone="neutral">{counts.skipped} skipped</Badge>}
            {counts.failed > 0 && <Badge tone="danger">{counts.failed} failed</Badge>}
            {Array.isArray(result.applied_urls) && (
              <Badge tone="neutral">{result.applied_urls.length} URLs applied</Badge>
            )}
            {result.mode && (
              <Badge tone="neutral">mode: {String(result.mode).replace(/_/g, " ")}</Badge>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-sm text-ink-500">No per-page results were returned.</p>
          ) : (
            <ul className="space-y-2">
              {results.map((r, i) => {
                const meta = STATUS_META[r.status] || STATUS_META.skipped;
                const StatusIcon = meta.Icon;
                const note = r.reason || r.error;

                return (
                  <li
                    key={`${r.url}-${i}`}
                    className="rounded-lg border border-ink-100 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm text-ink-700 hover:text-brand-600"
                      >
                        {r.url}
                      </a>

                      <div className="flex shrink-0 items-center gap-2">
                        {r.facts_stored > 0 && (
                          <Badge tone="neutral">
                            {r.facts_stored} fact{r.facts_stored === 1 ? "" : "s"}
                          </Badge>
                        )}
                        <Badge tone={meta.tone}>
                          <StatusIcon className="h-3 w-3" /> {meta.label}
                        </Badge>
                      </div>
                    </div>

                    {note && <p className="mt-1 text-xs text-ink-400">{note}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

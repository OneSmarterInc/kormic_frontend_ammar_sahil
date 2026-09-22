import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { CheckSquare, Square } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge, { decisionStatusTone } from "../common/Badge";
import ErrorBanner from "../common/ErrorBanner";
import EmptyState from "../common/EmptyState";
import Spinner from "../common/Spinner";
import { Select } from "../common/Input";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAsync, useAction } from "../../hooks/useAsync";

const MODES = [
  { value: "student_essential", label: "Student essential (curated)" },
  { value: "base_important", label: "Base important (full nav tree)" },
  { value: "all", label: "All relevant + review pages" },
];

/** Groups results by primary_category, each group sorted by relevance_score desc. */
function groupByCategory(results) {
  const groups = new Map();
  for (const r of results) {
    const key = r.primary_category || "Uncategorized";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function AutoDiscoverResultsModal({ jobId, open, onClose, onApplied }) {
  const [mode, setMode] = useState("student_essential");
  const [selected, setSelected] = useState(() => new Set());

  const { data, loading, error, refetch } = useAsync(
    (signal) => universityAdminApi.getAutoDiscoverResults(jobId, mode, signal),
    [jobId, mode, open],
    { enabled: open && !!jobId }
  );

  useEffect(() => {
    if (!open) setSelected(new Set());
  }, [open]);

  const grouped = useMemo(() => groupByCategory(data?.results || []), [data]);
  const selectableUrls = useMemo(
    () => (data?.results || []).filter((r) => !r.already_saved).map((r) => r.url),
    [data]
  );

  const toggle = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected((prev) => new Set([...prev, ...selectableUrls]));
  };

  const clearSelection = () => setSelected(new Set());

  const { execute: apply, loading: applying, error: applyError } = useAction(() =>
    universityAdminApi.applyAutoDiscoverResults(jobId, { urls: [...selected], replace: false })
  );

  const handleApply = async () => {
    try {
      const res = await apply();
      toast.success(`${selected.size} URL(s) added`);
      onApplied?.(res.scrape_urls);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Review discovered pages"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleApply} loading={applying} disabled={selected.size === 0}>
            Add {selected.size} selected
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select value={mode} onChange={(e) => setMode(e.target.value)} className="max-w-xs">
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>

          <div className="flex items-center gap-2">
            {selectableUrls.some((url) => !selected.has(url)) && (
              <Button
                variant="ghost"
                size="sm"
                icon={CheckSquare}
                onClick={selectAllVisible}
              >
                Select all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={Square}
              onClick={clearSelection}
              disabled={selected.size === 0}
            >
              Clear
            </Button>
          </div>
        </div>

        {applyError && <ErrorBanner error={applyError} />}

        {loading ? (
          <Spinner label="Loading discovered pages..." />
        ) : error ? (
          <ErrorBanner error={error} onDismiss={refetch} />
        ) : grouped.length === 0 ? (
          <EmptyState title="No pages in this view" description="Try a different mode above." />
        ) : (
          <div className="space-y-5">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {category} <span className="font-normal normal-case text-ink-300">({items.length})</span>
                </h4>

                <ul className="space-y-1.5">
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        r.already_saved
                          ? "border-ink-100 bg-ink-50/60"
                          : "border-ink-100 bg-white hover:border-blue-300 hover:bg-blue-50/30"
                      }`}
                    >
                      <input
                        id={`discover-result-${r.id}`}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500/40 disabled:opacity-60"
                        checked={r.already_saved || selected.has(r.url)}
                        disabled={r.already_saved}
                        onChange={() => toggle(r.url)}
                        aria-label={r.page_title || r.url}
                      />

                      <label
                        htmlFor={`discover-result-${r.id}`}
                        className={clsx(
                          "min-w-0 flex-1",
                          !r.already_saved && "cursor-pointer"
                        )}
                      >
                        <p className="truncate font-medium text-ink-700">
                          {r.page_title || r.url}
                        </p>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-xs text-ink-400 hover:text-brand-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.url}
                        </a>
                      </label>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {r.already_saved ? (
                          <Badge tone="neutral">Saved</Badge>
                        ) : (
                          <Badge tone={decisionStatusTone(r.decision_status)}>{r.decision_status}</Badge>
                        )}
                        <span className="text-xs text-ink-400">{Math.round(r.relevance_score)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

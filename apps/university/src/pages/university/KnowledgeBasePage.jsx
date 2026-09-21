import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { BrainCircuit, Link2, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Select, Textarea } from "../../components/common/Input";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Spinner from "../../components/common/Spinner";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { KNOWLEDGE_GROUPS, knowledgeGroupLabel, knowledgeGroupTone } from "../../lib/knowledgeGroups";

const SOURCE_META = {
  human_verified: { tone: "success", label: "Human verified" },
  seed: { tone: "brand", label: "Profile" },
  manual: { tone: "brand", label: "Manual" },
  scraped: { tone: "neutral", label: "Scraped" },
  conversation: { tone: "warning", label: "Learned in chat" },
};

export default function KnowledgeBasePage() {
  const [editingFactId, setEditingFactId] = useState(null);
  const [section, setSection] = useState(null);
  const [sourceUrl, setSourceUrl] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Clear the URL filter whenever the section changes — it only applies to "scraped".
  useEffect(() => {
    setSourceUrl(null);
  }, [section]);

  const { data, loading, error, refetch, setData } = useAsync(
    (signal) => universityAdminApi.listKnowledge({ section, sourceUrl }, signal),
    [section, sourceUrl]
  );

  const { data: sectionsData, refetch: refetchSections } = useAsync(
    universityAdminApi.getKnowledgeSections,
    []
  );

  const { data: urlsData, refetch: refetchUrls } = useAsync(
    universityAdminApi.getKnowledgeSourceUrls,
    []
  );

  const facts = data?.knowledge || [];
  const sections = sectionsData?.sections || [];
  const sourceUrls = urlsData?.urls || [];
  const totalCount = sections.reduce((sum, s) => sum + s.count, 0);

  // Every fact — regardless of source — can be edited and deleted.
  const allSelected = facts.length > 0 && selectedIds.length === facts.length;

  // Drop any selection that's no longer visible after a filter change / refetch.
  useEffect(() => {
    const visibleIds = new Set((data?.knowledge || []).map((f) => f.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [data]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : facts.map((f) => f.id));

  const handleBulkDelete = async () => {
    setBulkDeleting(true);

    // No bulk endpoint — delete one at a time and tolerate partial failure.
    const results = await Promise.allSettled(
      selectedIds.map((id) => universityAdminApi.deleteKnowledge(id))
    );
    const okIds = selectedIds.filter((_, i) => results[i].status === "fulfilled");
    const failed = selectedIds.length - okIds.length;

    if (okIds.length > 0) {
      const okSet = new Set(okIds);
      setData((prev) => ({
        knowledge: (prev?.knowledge || []).filter((f) => !okSet.has(f.id)),
      }));
      refetchSections();
      refetchUrls();
      if (okSet.has(editingFactId)) setEditingFactId(null);
    }

    setSelectedIds([]);
    setBulkConfirmOpen(false);
    setBulkDeleting(false);

    if (failed === 0) {
      toast.success(`${okIds.length} fact${okIds.length === 1 ? "" : "s"} deleted`);
    } else if (okIds.length === 0) {
      toast.error("Couldn't delete the selected facts");
    } else {
      toast.error(`Deleted ${okIds.length}, ${failed} failed`);
    }
  };

  const handleDeleted = (id) => {
    setData((prev) => ({
      knowledge: prev.knowledge.filter((f) => f.id !== id),
    }));
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    refetchSections();
    refetchUrls();
    if (editingFactId === id) setEditingFactId(null);
  };

  const handleCreated = (fact) => {
    if ((!section || section === fact.source_type) && (!sourceUrl || sourceUrl === fact.source_url)) {
      setData((prev) => ({
        knowledge: [fact, ...(prev?.knowledge || [])],
      }));
    }
    refetchSections();
    refetchUrls();
  };

  const handleUpdated = (updated) => {
    setData((prev) => ({
      knowledge: prev.knowledge.map((f) => (f.id === updated.id ? updated : f)),
    }));
    setEditingFactId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Every fact your agent can draw on, regardless of how it got there — highest-trust sources win when answers conflict."
      />

      <AddFactCard onCreated={handleCreated} />

      <div className="flex flex-wrap items-center gap-2">
        <SectionTab
          active={section === null}
          label="All"
          count={totalCount}
          onClick={() => setSection(null)}
        />
        {sections.map((s) => (
          <SectionTab
            key={s.section}
            active={section === s.section}
            label={(SOURCE_META[s.section] || {}).label || s.section}
            count={s.count}
            onClick={() => setSection(s.section)}
          />
        ))}
      </div>

      {section === "scraped" && sourceUrls.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-ink-50/60 p-3">
          <span className="flex items-center gap-1.5 pl-1 text-xs font-medium text-ink-500">
            <Link2 className="h-3.5 w-3.5" />
            Source page:
          </span>

          <SectionTab
            active={sourceUrl === null}
            label="All pages"
            count={sourceUrls.reduce((sum, u) => sum + u.count, 0)}
            onClick={() => setSourceUrl(null)}
          />

          {sourceUrls.map((u) => (
            <button
              key={u.source_url}
              type="button"
              onClick={() => setSourceUrl(u.source_url)}
              title={u.source_url}
              className={clsx(
                "inline-flex max-w-[260px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
                sourceUrl === u.source_url
                  ? "border-brand-500 bg-brand-600 text-white shadow-sm"
                  : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:bg-brand-50/40"
              )}
            >
              <span className="truncate">{u.source_url}</span>
              <span
                className={clsx(
                  "shrink-0 rounded-full px-1.5 text-[11px]",
                  sourceUrl === u.source_url ? "bg-white/20" : "bg-ink-100 text-ink-500"
                )}
              >
                {u.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          icon={BrainCircuit}
          title="All facts"
          subtitle={`${facts.length} shown`}
        />

        <CardBody>
          {loading ? (
            <Spinner label="Loading knowledge base..." />
          ) : error ? (
            <ErrorBanner error={error} onDismiss={refetch} />
          ) : facts.length === 0 ? (
            <EmptyState
              icon={BrainCircuit}
              title="No facts yet"
              description="Add one manually above, or fill in your profile and scrape sources to seed it automatically."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/60 px-3 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  {selectedIds.length > 0
                    ? `${selectedIds.length} selected`
                    : "Select all"}
                </label>

                {selectedIds.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={Trash2}
                    loading={bulkDeleting}
                    onClick={() => setBulkConfirmOpen(true)}
                  >
                    Delete selected ({selectedIds.length})
                  </Button>
                )}
              </div>

              {facts.map((fact) => (
                <FactRow
                  key={fact.id}
                  fact={fact}
                  isEditing={editingFactId === fact.id}
                  selected={selectedIds.includes(fact.id)}
                  onToggleSelect={() => toggleSelect(fact.id)}
                  onEdit={() => setEditingFactId(fact.id)}
                  onCancelEdit={() => setEditingFactId(null)}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Delete selected facts?"
        message={`Permanently delete ${selectedIds.length} selected fact${
          selectedIds.length === 1 ? "" : "s"
        }? This can't be undone.`}
        confirmLabel={`Delete ${selectedIds.length}`}
        danger
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onClose={() => setBulkConfirmOpen(false)}
      />
    </div>
  );
}

function SectionTab({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-brand-500 bg-brand-600 text-white shadow-sm"
          : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:bg-brand-50/40"
      )}
    >
      {label}
      <span
        className={clsx(
          "rounded-full px-1.5 text-[11px]",
          active ? "bg-white/20" : "bg-ink-100 text-ink-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function AddFactCard({ onCreated }) {
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [group, setGroup] = useState("");

  const { execute, loading, error } = useAction(() =>
    universityAdminApi.createKnowledge({ topic, content, group: group || undefined })
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const fact = await execute();
      onCreated(fact);
      setTopic("");
      setContent("");
      setGroup("");
      toast.success("Fact added");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Add a fact manually"
        subtitle="Exact deadlines, funding amounts, or anything scraping missed."
      />

      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <ErrorBanner error={error} />}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Field label="Topic" required>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Fall 2027 Application Deadline"
                  required
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Content" required>
                <Textarea
                  rows={1}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="January 15, 2027 for Fall 2027 admission."
                  required
                />
              </Field>
            </div>

            <div className="sm:col-span-1">
              <Field label="Group" hint="Optional">
                <Select value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="">Ungrouped</option>
                  {KNOWLEDGE_GROUPS.map((g) => (
                    <option key={g.slug} value={g.slug}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <Button
            type="submit"
            icon={Plus}
            loading={loading}
            disabled={!topic.trim() || !content.trim()}
          >
            Add fact
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

function FactRow({
  fact,
  isEditing,
  selected = false,
  onToggleSelect,
  onEdit,
  onCancelEdit,
  onUpdated,
  onDeleted,
}) {
  const meta = SOURCE_META[fact.source_type] || SOURCE_META.manual;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { execute: remove, loading: deleting, error: deleteError } = useAction(() =>
    universityAdminApi.deleteKnowledge(fact.id)
  );

  const handleDelete = async () => {
    try {
      await remove();
      onDeleted(fact.id);
      toast.success("Fact deleted");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmOpen(false);
    }
  };

  if (isEditing) {
    return (
      <EditFactForm
        fact={fact}
        onCancel={onCancelEdit}
        onSaved={(updated) => {
          onUpdated(updated);
          toast.success("Fact updated");
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-3 transition-all duration-150 hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-sm",
        selected ? "border-brand-400 bg-brand-50/40" : "border-ink-100"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>

            {fact.group && (
              <Badge tone={knowledgeGroupTone(fact.group)}>{knowledgeGroupLabel(fact.group)}</Badge>
            )}

            {fact.times_used > 0 && (
              <span className="text-xs text-ink-400">
                used {fact.times_used}×
              </span>
            )}

            {fact.source_url && (
              <a
                href={fact.source_url}
                target="_blank"
                rel="noreferrer"
                className="max-w-[240px] truncate text-xs text-ink-400 hover:text-brand-600"
              >
                {fact.source_url}
              </a>
            )}
          </div>

          <p className="text-sm font-medium text-ink-900">
            {fact.topic}
          </p>

          <p className="mt-1 text-sm text-ink-700">
            {fact.content}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-ink-100 bg-ink-25 p-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            icon={Pencil}
            aria-label={`Edit ${fact.topic}`}
            onClick={onEdit}
            className="h-8 w-8 rounded-md p-0 text-ink-500 transition-all duration-150 hover:bg-blue-100 hover:text-blue-600 focus:ring-2 focus:ring-blue-200"
          />

          <Button
            type="button"
            size="xs"
            variant="ghost"
            icon={Trash2}
            aria-label={`Delete ${fact.topic}`}
            loading={deleting}
            onClick={() => setConfirmOpen(true)}
            className="h-8 w-8 rounded-md p-0 text-ink-500 transition-all duration-150 hover:bg-red-100 hover:text-red-600 focus:ring-2 focus:ring-red-200"
          />
        </div>
      </div>

      {deleteError && (
        <ErrorBanner error={deleteError} className="mt-3" />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete fact?"
        message={`Delete "${fact.topic}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function EditFactForm({ fact, onCancel, onSaved }) {
  const [topic, setTopic] = useState(fact.topic);
  const [content, setContent] = useState(fact.content);
  const [group, setGroup] = useState(fact.group || "");

  const { execute, loading, error } = useAction(() =>
    universityAdminApi.updateKnowledge(fact.id, { topic, content, group: group || null })
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await execute();
      onSaved(updated);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-brand-300 bg-brand-50/30 p-3 shadow-sm"
    >
      {error && <ErrorBanner error={error} />}

      <Field label="Topic" required>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} required />
      </Field>

      <Field label="Content" required>
        <Textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} required />
      </Field>

      <Field label="Group" hint="Optional">
        <Select value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Ungrouped</option>
          {KNOWLEDGE_GROUPS.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" icon={Check} loading={loading} disabled={!topic.trim() || !content.trim()}>
          Save
        </Button>
        <Button type="button" size="sm" variant="secondary" icon={X} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

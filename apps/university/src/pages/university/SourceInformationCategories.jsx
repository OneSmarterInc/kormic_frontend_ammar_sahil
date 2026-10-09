import { useEffect, useMemo, useState } from "react";
import { clearPageCache } from '@kormic/portal-core/pageCache.js';
import { BookOpen, ChevronDown, Pencil, Search, Check, X, RotateCw } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import { Input, Select, Textarea } from "../../components/common/Input";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import { useAsync } from "../../hooks/useAsync";
import { listUniversityInformation, updateUniversityInformation } from "../../api/universityAdminApi";

export const CATEGORIES = [
  ["scholarships", "Scholarships & financial aid"],
  ["fees", "Tuition & costs"],
  ["admissions", "Admissions & eligibility"],
  ["academics", "Programs & academics"],
  ["international", "International students"],
  ["campus", "Campus & student life"],
  ["careers", "Careers & outcomes"],
  ["overview", "University overview & contacts"],
  ["other", "Other"],
];

const label = (key) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const display = (value) => typeof value === "string" ? value : JSON.stringify(value, null, 2);
const categoryOf = (fact) => CATEGORIES.some(([id]) => id === fact.category) ? fact.category : "other";

export default function SourceInformationCategories() {
  const [tab, setTab] = useState("categories");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, loading, error, refetch, setData } = useAsync(
    signal => listUniversityInformation(signal, { page, search, category_group: tab }),
    [page, search, tab], { cacheKey: 'source-information' });
  const [editing, setEditing] = useState(null);
  const [limits, setLimits] = useState({});
  const facts = data?.knowledge || [];
  const filtered = useMemo(() => data?.pages ? facts : facts.filter((fact) => !query.trim() || `${fact.topic} ${fact.content} ${JSON.stringify(fact.details || {})}`.toLowerCase().includes(query.toLowerCase().trim())), [data, query]);
  const otherCount = data?.category_counts?.other ?? facts.filter((fact) => categoryOf(fact) === "other").length;
  const categoryCount = data?.category_counts?.categories ?? facts.length - otherCount;

  function saved(updated, originalId) {
    setData((previous) => ({ ...previous, knowledge: previous.knowledge.map((fact) => fact.id === originalId ? updated : fact) }));
    setEditing(null);
    clearPageCache();
    toast.success("Saved to the knowledge base. New student answers will use this information.");
  }

  return <div className="space-y-6">
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-700">
      <div className="flex items-center gap-2 font-semibold text-ink-900"><BookOpen className="h-4 w-4" /> Connected to your knowledge base</div>
      <p className="mt-1">Explore collected information by category, review its sources, and correct the knowledge students receive.</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Information sections" className="flex gap-2">
        {[["categories", `Categories (${categoryCount})`], ["other", `Other (${otherCount})`]].map(([id, title]) =>
          <button key={id} role="tab" disabled={editing !== null} aria-selected={tab === id} aria-controls="information-panel" id={`tab-${id}`} onClick={() => { setTab(id); setPage(1); }} className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab === id ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700"}`}>{title}</button>)}
      </div>
      <label className="flex items-center gap-2"><Search className="h-4 w-4 text-ink-400" /><span className="sr-only">Search information</span><Input value={query} disabled={editing !== null} onChange={(e) => setQuery(e.target.value)} placeholder="Search criteria, deadlines, courses…" /></label>
      <Button variant="secondary" size="sm" icon={RotateCw} disabled={editing !== null || loading} onClick={refetch}>Refresh sources</Button>
    </div>
    {loading ? <Spinner label="Loading university information…" /> : error ? <ErrorBanner error={error} onRetry={refetch} /> :
      <div id="information-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-3">
        {!facts.length && <div className="rounded-xl border border-ink-200 bg-white p-8 text-center"><h2 className="font-semibold">No university information yet</h2><p className="mt-2 text-sm text-ink-500">Scrape pages in Knowledge Sources or add facts in Knowledge Base to see them here.</p></div>}
        {!!facts.length && CATEGORIES.filter(([id]) => tab === "other" ? id === "other" : id !== "other").map(([id, title]) => {
          const rows = filtered.filter((fact) => categoryOf(fact) === id);
          return <details key={id} open={query.trim() || id === "other" ? true : undefined} className="group rounded-xl border border-ink-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5"><span className="font-semibold text-ink-900">{title} <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-500">{rows.length}</span></span><ChevronDown className="h-4 w-4 text-ink-400 transition-transform group-open:rotate-180" /></summary>
            <div className="space-y-3 border-t border-ink-100 p-4">
              {!rows.length && <p className="py-3 text-sm text-ink-500">{query ? "No matching information in this category." : "No information in this category yet."}</p>}
              {rows.slice(0, limits[id] || 12).map((fact) => <article key={fact.id} className="rounded-lg border border-ink-100 p-4">
                {editing === fact.id ? <InformationEditor fact={fact} onSaved={saved} onCancel={() => setEditing(null)} onReload={() => { setEditing(null); refetch(); }} /> : <>
                  <div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-ink-900">{fact.topic}</h3>{fact.record_kind === 'overview' ? <span className="text-xs text-ink-500">Edit in University Information</span> : <Button size="sm" variant="secondary" icon={Pencil} disabled={editing !== null} onClick={() => setEditing(fact.id)} aria-label={`Edit ${fact.topic}`}>Edit</Button>}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-500"><span>{fact.source_type === "human_verified" ? "University verified" : fact.source_type === "scraped" ? "Scraped information" : fact.source_type === "research" ? "Website research" : "Knowledge base"}</span>{fact.edited_at && <span>Updated {new Date(fact.edited_at).toLocaleString()}</span>}</div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-700">{fact.content}</p>
                  {!!Object.keys(fact.details || {}).length && <dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(fact.details).map(([key, value]) => <div key={key} className="rounded-lg bg-ink-50 p-3"><dt className="text-xs font-semibold text-ink-500">{label(key)}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-800">{display(value)}</dd></div>)}</dl>}
                  {/^https?:\/\//i.test(fact.source_url || "") && <a href={fact.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block max-w-full break-all text-xs text-brand-600 underline">Source: {fact.source_url}</a>}
                </>}
              </article>)}
              {rows.length > (limits[id] || 12) && <Button variant="secondary" disabled={editing !== null} onClick={() => setLimits(previous => ({ ...previous, [id]: (previous[id] || 12) + 12 }))}>Show more information</Button>}
            </div>
          </details>;
        })}
      </div>}
    {data?.pages > 1 && <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" disabled={loading || page <= 1 || editing !== null} onClick={() => setPage(value => value - 1)}>Previous</Button>
      <span className="text-sm">Page {data.page} of {data.pages} · {data.count} matching records</span>
      <Button variant="secondary" disabled={loading || page >= data.pages || editing !== null} onClick={() => setPage(value => value + 1)}>Next</Button>
    </div>}
  </div>;
}

function InformationEditor({ fact, onSaved, onCancel, onReload }) {
  const [topic, setTopic] = useState(fact.topic);
  const [content, setContent] = useState(fact.content);
  const [category, setCategory] = useState(categoryOf(fact));
  const [fields, setFields] = useState(Object.fromEntries(Object.entries(fact.details || {}).map(([key, value]) => [key, display(value)])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const details = {};
      for (const [key, value] of Object.entries(fields)) {
        try { details[key] = typeof fact.details[key] === "string" ? value : JSON.parse(value); }
        catch { throw new Error(`${label(key)} must contain valid structured data.`); }
      }
      const updated = await updateUniversityInformation(fact.id, { topic: topic.trim(), content: content.trim(), category, details, expected_revision: fact.revision });
      onSaved(updated, fact.id);
    } catch (err) { setError(err); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    {error && <><ErrorBanner error={error} /><Button type="button" variant="secondary" disabled={saving} onClick={onReload}>Discard draft and reload latest information</Button></>}
    <label className="block text-sm font-medium">Title<Input aria-label="Title" value={topic} maxLength={500} required disabled={saving} onChange={(e) => setTopic(e.target.value)} /></label>
    <label className="block text-sm font-medium">Category<Select aria-label="Category" value={category} disabled={saving} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</Select></label>
    <label className="block text-sm font-medium">Information<Textarea aria-label="Information" rows={7} value={content} required disabled={saving} onChange={(e) => setContent(e.target.value)} /></label>
    {Object.entries(fields).map(([key, value]) => <label key={key} className="block text-sm font-medium">{label(key)}{typeof fact.details[key] !== "string" && <span className="ml-2 text-xs font-normal text-ink-500">Structured data (JSON)</span>}<Textarea aria-label={label(key)} rows={3} value={value} disabled={saving} onChange={(e) => setFields((previous) => ({ ...previous, [key]: e.target.value }))} /></label>)}
    <p className="text-xs text-ink-500">Review both the information and any detailed criteria before saving. Changes apply to future student answers.</p>
    <div className="flex gap-2"><Button type="submit" icon={Check} loading={saving} disabled={!topic.trim() || !content.trim()}>Save information</Button><Button type="button" variant="secondary" icon={X} disabled={saving} onClick={onCancel}>Cancel</Button></div>
  </form>;
}

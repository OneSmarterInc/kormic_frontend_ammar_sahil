export default function Pagination({ pagination, loading, onPage }) {
  if (!pagination) return null;
  return <nav aria-label="Results pages" className="my-4 flex items-center justify-between gap-3 text-sm text-ink-600">
    <button disabled={loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} className="rounded-lg border border-ink-200 bg-white px-3 py-2 disabled:opacity-40">Previous</button>
    <span>Page {pagination.page} of {pagination.total_pages} · {pagination.total} results</span>
    <button disabled={loading || !pagination.has_next} onClick={() => onPage(pagination.page + 1)} className="rounded-lg border border-ink-200 bg-white px-3 py-2 disabled:opacity-40">Next</button>
  </nav>;
}

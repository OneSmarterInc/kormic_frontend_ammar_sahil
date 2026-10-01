import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Globe, Clock, BookOpen } from 'lucide-react';
import client from '../../api/client';
import PageHeader from '../../components/layout/PageHeader';

export default function UpdateInformationPage() {
  const [days, setDays] = useState(30);
  const [savedDays, setSavedDays] = useState(30);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const processing = useRef(false);
  processing.current = data.results.some(row => row.processing);
  const load = useCallback(async () => {
    const response = await client.get('/superuser/update-information/universities/', { params: { page } });
    return response.data;
  }, [page]);
  useEffect(() => {
    let active = true;
    client.get('/superuser/update-information/')
      .then(({data: policy}) => { if (active) { setDays(policy.refresh_days); setSavedDays(policy.refresh_days); setPolicyLoaded(true); } })
      .catch(() => { if (active) setError('Unable to load university research settings.'); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true, busy = false;
    const fetchList = async (initial = false) => {
      if (busy || (!initial && document.hidden)) return;
      busy = true;
      if (initial) setLoading(true);
      try { const list = await load(); if (active) setData(list); }
      catch { if (active) setError('Unable to load university research.'); }
      finally { busy = false; if (active && initial) setLoading(false); }
    };
    fetchList(true);
    const visible = () => { if (!document.hidden) fetchList(); };
    const timer = setInterval(() => { if (processing.current) fetchList(); }, 5000);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [load]);
  const save = async event => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const response = await client.patch('/superuser/update-information/', { refresh_days: Number(days) });
      setSavedDays(response.data.refresh_days); setNotice('Information freshness policy saved.');
      setData(await load());
    } catch (e) { setError(e.response?.data?.detail || 'Unable to save the freshness policy.'); }
    finally { setSaving(false); }
  };
  const refresh = async row => {
    setUpdating(row.id); setError(''); setNotice('');
    try {
      const result = await client.post(`/university-research/${row.id.replace('public:', '')}/refresh/`);
      setNotice(`${row.name}: ${result.data.university.processing ? 'research queued' : result.data.status}.`);
      setData(await load());
    } catch (e) { setError(e.response?.data?.detail || 'Unable to queue research.'); }
    finally { setUpdating(''); }
  };
  return <div className="mx-auto max-w-6xl space-y-6">
    <PageHeader title="University research" description="Manage the freshness of university information collected from official websites." />
    {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</div>}
    <form onSubmit={save} className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3"><Clock className="h-5 w-5 text-brand-600" /><h2 className="text-lg font-semibold">Information freshness</h2></div>
      <p className="mb-5 text-sm text-ink-600">Records older than this interval are marked as potentially outdated. Current policy: {savedDays} days. Use the controls below to refresh official information in the background.</p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="space-y-2 text-sm font-medium">Refresh age in days<input type="number" min="1" max="365" required value={days} onChange={e => setDays(e.target.value)} className="block w-40 rounded-lg border border-ink-200 px-3 py-2" /></label>
        <button disabled={saving || loading || !policyLoaded} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save policy'}</button>
      </div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ink-100 p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Globe className="h-5 w-5" />Researched universities</h2><span className="text-sm text-ink-500">{data.count} institutions</span></div>
      {loading ? <p className="p-8 text-ink-500">Loading research…</p> : !data.results.length ? <div className="p-10 text-center"><BookOpen className="mx-auto mb-3 h-8 w-8 text-ink-400" /><p>No public university research yet.</p><p className="mt-2 text-sm text-ink-500">Institutions appear here after a student resolves an official university website in chat.</p></div> : <div className="divide-y divide-ink-100">{data.results.map(row => <article key={row.id} className="flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-0 flex-1"><h3 className="font-semibold">{row.name}</h3><p className="mt-1 text-sm text-ink-500">{row.address}</p><a className="mt-1 block break-all text-sm text-brand-600" href={row.url} target="_blank" rel="noreferrer">Official website ↗</a>
          <p className="mt-3 text-sm">{row.courses} courses · {row.intakes} intake records · {row.updated_at ? `Collected ${new Date(row.updated_at).toLocaleDateString()}` : 'Awaiting first collection'}</p>
          {row.processing ? <p role="status" className="mt-2 text-sm text-brand-600">{row.progress}</p> : <p className={`mt-2 text-xs ${row.stale ? 'text-amber-700' : 'text-green-700'}`}>{row.stale ? 'Update available' : 'Within freshness policy'}</p>}
          {row.last_error && <p className="mt-2 text-sm text-red-700">{row.last_error}</p>}
          {row.coverage?.notes && <p className="mt-2 text-xs text-ink-500">Coverage: {row.coverage.notes}</p>}
        </div>
        <button onClick={() => void refresh(row)} disabled={!!updating || row.processing} className="flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${row.processing ? 'animate-spin' : ''}`} />{row.processing ? 'Processing' : 'Update information'}</button>
      </article>)}</div>}
      <div className="flex items-center justify-between border-t border-ink-100 p-4 text-sm"><button disabled={loading || page <= 1} onClick={() => setPage(p => p-1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {data.total_pages}</span><button disabled={loading || page >= data.total_pages} onClick={() => setPage(p => p+1)} className="disabled:opacity-40">Next</button></div>
    </section>
  </div>;
}

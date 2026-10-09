import { useEffect, useMemo, useState } from 'react';
import { Building2, GraduationCap, Wallet, House, Award, ClipboardList, Globe, HeartHandshake, BriefcaseBusiness, FolderOpen, Plus, Save, Search, ChevronDown, CheckCircle2, RotateCw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import { Input, Select, Textarea } from '../../components/common/Input';
import ErrorBanner from '../../components/common/ErrorBanner';
import Spinner from '../../components/common/Spinner';
import { useAsync } from '../../hooks/useAsync';
import { listInformationEntities, updateUniversityInformation, createUniversityInformation, getInformationOverview, updateInformationOverview } from '../../api/universityAdminApi';
import { FORM_SECTIONS, OVERVIEW_FIELDS, COURSE_LEVELS, courseLevel, missingFields, matchesMissingFilter, sectionFor, valuesFor, formPayload } from '../../lib/informationForms';

const ICONS = [Building2, GraduationCap, Wallet, House, Award, ClipboardList, Globe, HeartHandshake, BriefcaseBusiness, FolderOpen];

export default function UniversityInformationPage() {
  const { data, loading, error, refetch, setData } = useAsync(listInformationEntities, [], { cacheKey: 'information-entities' });
  const overview = useAsync(getInformationOverview, [], { cacheKey: 'information-overview' });
  const [sectionId, setSectionId] = useState('overview');
  const [query, setQuery] = useState('');
  const [missingFilter, setMissingFilter] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dirtyCost, setDirtyCost] = useState(false);
  const [destination, setDestination] = useState(null);
  const [limit, setLimit] = useState(12);
  const costSection = FORM_SECTIONS.find(item => item.id === 'fees');
  const costTargets = (data?.knowledge || []).filter(record => ['academics', 'housing'].includes(record.details?.information_type));
  const section = FORM_SECTIONS.find(item => item.id === sectionId);
  const groups = useMemo(() => {
    const result = Object.fromEntries(FORM_SECTIONS.map(item => [item.id, []]));
    (data?.knowledge || []).forEach(record => { const kind = sectionFor(record); if (kind) result[kind].push(record); });
    return result;
  }, [data]);
  const searchedRecords = groups[sectionId].filter(record => `${record.topic} ${record.content}`.toLowerCase().includes(query.toLowerCase().trim()));
  const records = searchedRecords.filter(record => matchesMissingFilter(record, section, missingFilter));
  const collections = sectionId === 'academics' ? COURSE_LEVELS : [{ id: sectionId, label: section.label, description: `Manage individual ${section.label.toLowerCase()} and their details.` }];

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function navigate(id) {
    if (id === sectionId) return;
    if (dirty) { setDestination(id); return; }
    setExpanded(false); setSectionId(id); setQuery(''); setMissingFilter('all'); setOpenId(null); setAdding(false); setLimit(12);
  }
  async function saved(record, originalId) {
    if (record.details?.information_type === 'fees') {
      const refreshed = await listInformationEntities();
      setData(refreshed); setDirty(false); setAdding(false);
      toast.success('Cost saved to the knowledge base and shown with its owner.');
      return;
    }
    setData(previous => ({ ...previous, knowledge: originalId == null ? [record, ...previous.knowledge] : previous.knowledge.map(item => item.id === originalId ? record : item) }));
    setDirty(false); setAdding(false); setOpenId(record.id);
    if (sectionId === 'academics') setExpanded(courseLevel(record));
    if (!matchesMissingFilter(record, section, missingFilter)) setMissingFilter('all');
    if (!`${record.topic} ${record.content}`.toLowerCase().includes(query.toLowerCase().trim())) setQuery('');
    toast.success('Saved. Students will receive the updated information.');
  }

  return <div className="space-y-6">
    <PageHeader title="University information" description="Maintain the details students need to choose, apply and prepare for university." />
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
      <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /><div><p className="text-sm font-semibold text-ink-900">One place for accurate university information</p><p className="mt-1 text-sm text-ink-600">Your saved changes update the knowledge base used in student answers.</p></div></div>
      <Button variant="secondary" size="sm" icon={RotateCw} disabled={dirty || loading || overview.loading} onClick={() => { refetch(); overview.refetch(); }}>Refresh information</Button>
    </div>
    {destination && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">You have unsaved changes. Save this form or discard your changes before switching sections.</p><div className="flex gap-2"><Button variant="secondary" onClick={() => setDestination(null)}>Keep editing</Button><Button onClick={() => { setDirty(false); setDirtyCost(false); setExpanded(false); setSectionId(destination); setDestination(null); setOpenId(null); setAdding(false); setQuery(''); setMissingFilter('all'); setLimit(12); }}>Discard and continue</Button></div></div>}
    <div className="grid items-start gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <label className="block text-sm font-medium text-ink-700 sm:hidden">Information section<Select aria-label="Information section" value={sectionId} onChange={event => navigate(event.target.value)}>{FORM_SECTIONS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></label>
      <nav aria-label="Information categories" className="hidden rounded-xl border border-ink-200 bg-white p-2 sm:block xl:sticky xl:top-5">
        <p className="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">Information sections</p>
        <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">{FORM_SECTIONS.map((item, index) => {
          const Icon = ICONS[index];
          return <button key={item.id} type="button" aria-pressed={sectionId === item.id} onClick={() => navigate(item.id)} className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors ${sectionId === item.id ? 'bg-brand-600 font-semibold text-white' : 'text-ink-600 hover:bg-ink-50'}`}><Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{item.label}</span>{item.id !== 'overview' && <span className={`rounded px-1.5 py-0.5 text-xs ${sectionId === item.id ? 'bg-white/20' : 'bg-ink-100 text-ink-500'}`}>{groups[item.id].length}</span>}</button>;
        })}</div>
      </nav>
      <section className="min-w-0 space-y-4" aria-labelledby="section-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="section-title" className="text-xl font-semibold text-ink-900">{section.label}</h2><p className="mt-1 text-sm text-ink-500">{section.description}</p></div></div>
        {sectionId === 'overview' ? (overview.loading ? <Spinner label="Loading university details…" /> : overview.error ? <ErrorBanner error={overview.error} onRetry={overview.refetch} /> : overview.data && <OverviewForm key={overview.data.revision} record={overview.data} onDirty={setDirty} onSaved={record => { overview.setData(record); setDirty(false); toast.success('University details saved to the knowledge base.'); }} />) : loading ? <Spinner label="Loading information forms…" /> : error ? <ErrorBanner error={error} onRetry={refetch} /> : <>
          <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
              <label className="block text-xs font-medium text-ink-600"><span className="mb-2 block">Search entries</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-400" /><Input aria-label={`Search ${section.label}`} className="pl-9" value={query} disabled={dirty || adding} onChange={event => { setQuery(event.target.value); setLimit(12); }} placeholder={`Search ${section.label.toLowerCase()}…`} /></span></label>
              <label className="block text-xs font-medium text-ink-600"><span className="mb-2 block">Missing information</span><Select aria-label="Filter by missing fields" value={missingFilter} disabled={dirty || adding} onChange={event => { setMissingFilter(event.target.value); setLimit(12); }}>
                <option value="all">All entries ({searchedRecords.length})</option>
                <option value="any">Any missing fields ({searchedRecords.filter(record => missingFields(record, section).length > 0).length})</option>
                <option value="complete">No missing fields ({searchedRecords.filter(record => !missingFields(record, section).length).length})</option>
                <optgroup label="Missing a specific field">{section.fields.filter(field => field.key !== 'notes').map(field => <option key={field.key} value={field.key}>{field.label} ({searchedRecords.filter(record => matchesMissingFilter(record, section, field.key)).length})</option>)}</optgroup>
              </Select></label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500"><p aria-live="polite">Showing {records.length} of {groups[sectionId].length} entries. Blank fields are review prompts; some may not apply.</p>{(query || missingFilter !== 'all') && <button type="button" disabled={dirty || adding} className="font-medium text-brand-600 disabled:opacity-50" onClick={() => { setQuery(''); setMissingFilter('all'); setLimit(12); }}>Clear filters</button>}</div>
          </div>
          {collections.map(collection => {
            const allInCollection = groups[sectionId].filter(record => sectionId !== 'academics' || courseLevel(record) === collection.id);
            const visible = records.filter(record => sectionId !== 'academics' || courseLevel(record) === collection.id);
            const isExpanded = expanded === collection.id;
            return <div key={collection.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <button type="button" aria-expanded={isExpanded} aria-controls={`collection-${collection.id}`} disabled={dirty} onClick={() => { setExpanded(isExpanded ? false : collection.id); setOpenId(null); setAdding(false); setLimit(12); }} className="flex w-full items-center justify-between gap-3 p-5 text-left disabled:opacity-60">
                <span><span className="font-semibold text-ink-900">{collection.label}</span><span className="ml-3 rounded bg-ink-100 px-2 py-1 text-xs text-ink-500">{query || missingFilter !== 'all' ? `${visible.length} / ${allInCollection.length}` : allInCollection.length}</span><span className="mt-1 block text-sm text-ink-500">{collection.description}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && <div id={`collection-${collection.id}`} className="space-y-4 border-t border-ink-100 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-500">Complete or correct each record below.</p><Button icon={Plus} disabled={dirty || adding} onClick={() => { setAdding(true); setOpenId(null); }}>Add {section.singular}</Button></div>
                {adding && <div className="rounded-xl border border-brand-200 bg-white p-5"><h3 className="mb-5 font-semibold text-ink-900">New {section.singular}</h3><RecordForm section={section} costTargets={costTargets} defaultOwner={section.id === 'fees' ? 'university' : undefined} defaultLevel={collection.defaultLevel} onDirty={setDirty} onSaved={saved} onCancel={() => { setAdding(false); setDirty(false); }} /></div>}
                {!visible.length && !adding && <div className="rounded-xl border border-dashed border-ink-200 bg-white p-8 text-center"><FolderOpen className="mx-auto h-8 w-8 text-ink-300" /><h3 className="mt-3 font-medium text-ink-900">{query || missingFilter !== 'all' ? 'No matching records' : 'No entries added yet'}</h3><p className="mt-2 text-sm text-ink-500">{query || missingFilter !== 'all' ? 'Adjust the filters to see more entries.' : 'Add a record above. Leave unknown values blank until they are confirmed.'}</p></div>}
                {visible.slice(0, limit).map(record => {
                  const recordSection = record.details?.information_type === 'fees' ? costSection : section;
                  const missing = missingFields(record, recordSection);
                  return <article key={record.id} className={`overflow-hidden rounded-xl border bg-white ${openId === record.id ? 'border-brand-200' : 'border-ink-200'}`}>
                    <button type="button" aria-expanded={openId === record.id} aria-controls={`form-${record.id}`} disabled={dirty && openId !== record.id || adding} onClick={() => { if (!dirty) setOpenId(openId === record.id ? null : record.id); }} className="flex w-full items-center justify-between gap-3 p-5 text-left disabled:opacity-60">
                      <span className="min-w-0"><span className={`mb-2 inline-block rounded px-2 py-1 text-xs font-medium ${missing.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{missing.length ? `${missing.length} missing fields` : 'No missing fields'}</span>{record.details?.information_type === 'fees' && sectionId === 'other' && <span className="mb-2 ml-2 inline-block rounded bg-ink-100 px-2 py-1 text-xs text-ink-600">Cost · needs assignment</span>}<span className="block break-words font-semibold text-ink-900">{record.topic}</span><span className="mt-1 block text-xs text-ink-500">{record.source_type === 'human_verified' ? 'University verified' : 'Auto-filled from university website'}{record.edited_at ? ` · Updated ${new Date(record.edited_at).toLocaleDateString()}` : ''}</span>{missing.length > 0 && <span className="mt-2 block text-xs leading-relaxed text-ink-500" title={missing.map(field => field.label).join(', ')}>Missing: {missing.slice(0, 3).map(field => field.label).join(', ')}{missing.length > 3 ? ` and ${missing.length - 3} more` : ''}</span>}</span><ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 ${openId === record.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openId === record.id && <div id={`form-${record.id}`} className="border-t border-ink-100 p-5">{missing.length > 0 && <p className="mb-5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">Missing information: {missing.map(field => field.label).join(', ')}.</p>}<RecordForm key={`${record.id}-${record.revision}`} record={record} section={recordSection} costTargets={costTargets} disabled={dirtyCost} onDirty={setDirty} onSaved={saved} onCancel={() => { setOpenId(null); setDirty(false); }} />{['academics', 'housing'].includes(record.details?.information_type) && <RelatedCosts key={record.id} owner={record} costs={(data?.knowledge || []).filter(cost => cost.cost_placement?.target_id === record.id)} section={costSection} targets={costTargets} disabled={dirty && !dirtyCost} onDirty={value => { setDirtyCost(value); setDirty(value); }} onSaved={async (cost, originalId) => { await saved(cost, originalId); setDirtyCost(false); }} />}</div>}
                  </article>;
                })}
                {visible.length > limit && <Button variant="secondary" disabled={dirty} onClick={() => setLimit(value => value + 12)}>Show more ({visible.length - limit} remaining)</Button>}
              </div>}
            </div>;
          })}
        </>}

      </section>
    </div>
  </div>;
}

function RelatedCosts({ owner, costs, section, targets, disabled, onDirty, onSaved }) {
  const [editing, setEditing] = useState(null);
  const [changed, setChanged] = useState(false);
  function dirty(value) { setChanged(value); onDirty(value); }
  return <section aria-label="Related costs" className="mt-8 space-y-4 border-t border-ink-200 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-ink-900">{owner.details.information_type === 'academics' ? 'Program fees & rate schedules' : 'Housing charges & rate schedules'}</h4><p className="mt-1 text-xs text-ink-500">Keep student categories, billing periods and academic years separate.</p></div><Button size="sm" icon={Plus} disabled={disabled || changed || editing === 'new'} onClick={() => setEditing('new')}>Add cost</Button></div>
    {!costs.length && editing !== 'new' && <p className="text-sm text-ink-500">No additional rate schedules linked. You can add costs for this record here.</p>}
    {costs.map(cost => <div key={cost.id} className="rounded-lg border border-ink-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-medium text-ink-900">{cost.topic}</p><p className="mt-1 text-sm text-ink-600">{[cost.details.currency, cost.details.amount].filter(Boolean).join(" ")}</p><p className="mt-1 text-xs text-ink-500">{[cost.details.billing_period, cost.details.academic_year, cost.details.applicant_scope].filter(Boolean).join(" · ")}</p></div><Button variant="secondary" size="sm" disabled={disabled || changed} onClick={() => setEditing(cost.id)}>Edit cost</Button></div>{editing === cost.id && <div className="mt-4"><RecordForm record={cost} section={section} costTargets={targets} disabled={disabled} onDirty={dirty} onSaved={async (value, id) => { await onSaved(value, id); setChanged(false); setEditing(null); }} onCancel={() => { dirty(false); setEditing(null); }} /></div>}</div>)}
    {editing === 'new' && <RecordForm section={section} defaultOwner={`${owner.details.information_type}:${owner.id}`} costTargets={targets} disabled={disabled} onDirty={dirty} onSaved={async (value, id) => { await onSaved(value, id); setChanged(false); setEditing(null); }} onCancel={() => { dirty(false); setEditing(null); }} />}
  </section>;
}

function FormFields({ fields, values, change, disabled, costTargets = [] }) {
  return <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">{fields.map(field => {
    const wide = field.type === 'textarea';
    const props = { 'aria-label': field.label, value: values[field.key] || '', disabled,
      required: field.key === 'name', maxLength: wide ? 20000 : field.key === 'name' ? 500 : 1000,
      onChange: event => change(field.key, event.target.value), placeholder: field.placeholder || 'Not provided' };
    return <label key={field.key} className={`block text-sm font-medium text-ink-700 ${wide ? 'md:col-span-2' : ''}`}><span className="mb-2 block">{field.label}{field.key === 'name' && <span className="ml-1 text-brand-600" aria-hidden="true">*</span>}</span>
      {field.type === 'cost-owner' ? <Select {...props}><option value="review">Needs assignment review</option><option value="university">University-wide fee</option>{['academics', 'housing'].map(kind => <optgroup key={kind} label={kind === 'academics' ? 'Programs' : 'Hostel & housing'}>{costTargets.filter(target => target.details.information_type === kind).map(target => <option key={target.id} value={`${kind}:${target.id}`}>{target.topic}</option>)}</optgroup>)}</Select> : wide ? <Textarea {...props} rows={field.key === 'notes' ? 6 : 3} /> : field.type === 'select' ? <Select {...props}><option value="">Not provided</option>{['Yes', 'No', 'Conditional', ...(values[field.key] && !['Yes', 'No', 'Conditional'].includes(values[field.key]) ? [values[field.key]] : [])].map(value => <option key={value}>{value}</option>)}</Select> : <Input {...props} type={field.type} />}
    </label>;
  })}</div>;
}

function RecordForm({ record, section, defaultLevel, defaultOwner, costTargets, disabled = false, onDirty, onSaved, onCancel }) {
  const [initial] = useState(() => ({ ...valuesFor(record, section), ...(!record && defaultLevel ? { level: defaultLevel } : {}), ...(!record && defaultOwner ? { cost_owner: defaultOwner } : {}) }));
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const changed = JSON.stringify(values) !== JSON.stringify(initial);
  function change(key, value) { const next = { ...values, [key]: value }; setValues(next); onDirty(JSON.stringify(next) !== JSON.stringify(initial)); }
  async function submit(event) {
    event.preventDefault(); setError(null);
    for (const [from, to] of [['opening_date', 'deadline'], ['contract_start', 'contract_end']]) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(values[from] || '') && /^\d{4}-\d{2}-\d{2}$/.test(values[to] || '') && values[from] > values[to]) {
        setError(new Error('The end date must be on or after the start date.')); return;
      }
    }
    setSaving(true);
    try { const payload = formPayload(record, section, values); const result = record ? await updateUniversityInformation(record.id, payload) : await createUniversityInformation(payload); await onSaved(result, record?.id); }
    catch (err) { setError(err); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    {!record?.details?.information_type && record && <p className="rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-ink-500">Existing source text is preserved under Additional details. Complete the labeled fields where the source confirms a value, and keep those details consistent with your edits.</p>}
    {error && <ErrorBanner error={error} />}
    <FormFields fields={section.fields} values={values} change={change} disabled={saving || disabled} costTargets={costTargets} />
    <div className="flex flex-wrap gap-3">{[...new Set([...(record?.source_urls || []), record?.source_url])].filter(source => /^https?:\/\//i.test(source || '')).map((source, index) => <a key={source} className="inline-flex max-w-full items-center gap-2 break-all text-xs text-brand-600 underline" href={source} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 shrink-0" />View source {index + 1}</a>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4"><span className="text-xs text-ink-500">{changed ? 'Unsaved changes' : 'Fields marked * are required. Unknown values can stay blank.'}</span><div className="flex gap-2"><Button type="button" variant="secondary" disabled={saving || disabled} onClick={onCancel}>{changed ? 'Discard changes' : 'Close'}</Button><Button type="submit" icon={Save} loading={saving} disabled={disabled || !values.name.trim() || record && !changed}>Save {section.singular}</Button></div></div>
  </form>;
}

function OverviewForm({ record, onDirty, onSaved }) {
  const [values, setValues] = useState(record.values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const changed = JSON.stringify(values) !== JSON.stringify(record.values);
  function change(key, value) { const next = { ...values, [key]: value }; setValues(next); onDirty(JSON.stringify(next) !== JSON.stringify(record.values)); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(null);
    try { onSaved(await updateInformationOverview({ values, expected_revision: record.revision })); }
    catch (err) { setError(err); } finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-6 rounded-xl border border-ink-200 bg-white p-5 sm:p-6">
    <div className="border-b border-ink-100 pb-4"><h3 className="font-semibold text-ink-900">Identity & contact details</h3><p className="mt-1 text-sm text-ink-500">The university details shown to students. Leave unconfirmed information blank.</p></div>
    {error && <ErrorBanner error={error} />}
    <FormFields fields={OVERVIEW_FIELDS} values={values} change={change} disabled={saving} />
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5"><span className="text-xs text-ink-500">{changed ? 'Unsaved changes' : 'University profile and student knowledge stay in sync.'}</span><div className="flex gap-2">{changed && <Button type="button" variant="secondary" disabled={saving} onClick={() => { setValues(record.values); onDirty(false); setError(null); }}>Discard changes</Button>}<Button type="submit" icon={Save} loading={saving} disabled={!changed}>Save university details</Button></div></div>
  </form>;
}

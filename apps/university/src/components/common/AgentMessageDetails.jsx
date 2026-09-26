import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, X } from 'lucide-react';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const label = value => value.replaceAll('_', ' ');
const display = value => {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return 'Not set';
  if (Array.isArray(value)) return value.map(display).join('\n\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${label(key)}: ${display(entry)}`).join('\n');
  return String(value);
};

export function latestChanges(messages) {
  const states = {};
  for (const message of messages) {
    for (const change of [...(message.meta?.pending_changes || []), ...(message.meta?.change_proposals || [])]) {
      states[change.id] = change;
    }
  }
  return states;
}

export default function AgentMessageDetails({ meta, universityId, changes = {}, onSend, loading }) {
  const cards = (meta?.student_cards || []).filter(card => card.university_id === universityId && uuid.test(card.student_id));
  const proposals = [...new Map([...(meta?.pending_changes || []), ...(meta?.change_proposals || [])].map(change => [change.id, changes[change.id] || change])).values()];
  return (
    <div className="space-y-3">
      {cards.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Student profiles">
          {cards.map(student => (
            <Link key={student.student_id} to={`/university/${universityId}/profiles/${student.student_id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-3 hover:border-brand-500 focus-visible:outline focus-visible:outline-brand-600">
              <span><span className="block font-semibold text-ink-900">{student.name}</span>
                <span className="block text-xs text-ink-500">{[student.program, student.institution].filter(Boolean).join(' · ')}</span>
                <span className="text-xs text-brand-700">View student profile</span></span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
      {proposals.map(change => (
        <section key={change.id} className="mt-3 rounded-xl border border-ink-200 bg-white p-3" aria-label="Proposed change">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{change.operation === 'create' ? 'Add new knowledge' : 'Update university information'}</strong>
            <span className="rounded-full bg-ink-100 px-2 py-1 text-xs capitalize">{change.status === 'pending' ? 'Awaiting confirmation' : change.status}</span>
          </div>
          <dl className="mt-2 space-y-2">
            {Object.entries(change.after || {}).map(([field, value]) => (
              <div key={field}>
                <dt className="text-xs font-semibold capitalize text-ink-500">{label(field)}</dt>
                {Object.hasOwn(change.before || {}, field) && <dd className="whitespace-pre-wrap text-xs text-ink-500">Current: {display(change.before[field])}</dd>}
                <dd className="whitespace-pre-wrap text-sm">Proposed: {display(value)}</dd>
              </div>
            ))}
          </dl>
          {change.status === 'pending' && <>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={loading} onClick={() => onSend(`Yes, approve change ${change.id} exactly as shown.`)}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check size={14} /> Yes, save</button>
              <button type="button" disabled={loading} onClick={() => onSend(`No, reject change ${change.id}.`)}
                className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"><X size={14} /> No, discard</button>
            </div>
            <p className="mt-2 text-xs text-ink-500">To revise this proposal, describe the changes in chat.</p>
          </>}
          {change.status === 'stale' && <p className="mt-2 text-xs text-amber-700">The saved record changed. Ask for a fresh proposal before saving.</p>}
        </section>
      ))}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownUp, ArrowRight, Bot, CheckCircle2, ChevronDown, Clock3, FileText, GitBranch, MessageSquare, Pause, Play, Search, Sparkles, Wrench, XCircle } from 'lucide-react';
import { listAgentAuditLog } from '../../api/superuserApi';
import { buildInteractions, buildWorkflows, modelCallCounts, activitySummary, eventError, isErrorEvent, isWarningEvent, isConversation, requestData, responseData, toolAction } from './telemetryInteractions';

const labels = {
  AGENT_COMMUNICATION_START: 'Requested information', AGENT_COMMUNICATION_REPLY: 'Returned information',
  AGENT_COMMUNICATION_ERROR: 'Request failed', AGENT_CONVERSATION_MESSAGE: 'Conversation message',
  TOOL_CALL_INTENT: 'Selected tool', TOOL_CALL_START: 'Called tool', TOOL_RESULT: 'Tool response', TOOL_ERROR: 'Tool failed',
  MODEL_START: 'Model started', MODEL_OUTPUT: 'Model response', MODEL_ERROR: 'Model failed',
  REASONING_START: 'Model started', FINAL_REPLY: 'Agent response',
  RUN_START: 'Run started', RUN_COMPLETE: 'Run completed', RUN_ERROR: 'Run interrupted',
  AGENT_STEP_START: 'Started work', AGENT_STEP_RESULT: 'Work result', AGENT_STEP_ERROR: 'Work failed', AGENT_STEP: 'Agent activity',
};
const modes = { saved_evidence: 'Saved information', queue_request: 'Background analysis request', execution: 'Agent execution' };
const operations = {
  github_evidence: 'Read the connected GitHub account’s processing status and saved findings.',
  queue_sync: 'Request a GitHub analysis job and return its processing status.',
  parse_resume: 'Read the uploaded CV, extract supported facts, validate them, and save the result.',
  analyze_linkedin: 'Read the uploaded LinkedIn files, extract profile information, and validate the evidence.',
  inspect_resume: 'Inspect the uploaded CV’s file type and size.',
  read_resume: 'Read the CV document and prepare its text for extraction.',
  extract_resume_facts: 'Extract education, employment, projects, skills, and other stated CV facts.',
  validate_resume_facts: 'Check extracted facts against the CV and remove unsupported claims.',
  finish_resume: 'Complete the CV extraction after validation.',
  get_github_processing_status: 'Check the GitHub analysis status and retrieve completed findings.',
  analyze_github_profile: 'Request analysis of the student’s connected GitHub account.',
  read_files: 'Read repository files to collect evidence for GitHub findings.',
  submit_finding: 'Submit repository findings supported by collected source evidence.',
  consult: 'Ask the university agent to answer from official records and verified information.',
  read_attachment: 'Read the student’s uploaded document for the current request.',
};
const merge = (previous, incoming) => [...new Map([...previous, ...incoming].map(row => [row.id, row])).values()].sort((a, b) => b.id - a.id);
const humanize = value => String(value || '').replaceAll('_', ' ');
const isExchange = row => /COMMUNICATION|CONVERSATION/.test(row.action_type || '');
function agentStyle(name = '') {
  if (/github/i.test(name)) return 'bg-violet-50 text-violet-700 border-violet-200';
  if (/linkedin/i.test(name)) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (/cv|resume|document/i.test(name)) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (/university/i.test(name)) return 'bg-teal-50 text-teal-700 border-teal-200';
  return 'bg-brand-50 text-brand-700 border-brand-200';
}
function AgentIcon({ name, size = 18 }) {
  if (/github/i.test(name || '')) return <GitBranch size={size}/>;
  if (/cv|resume|document/i.test(name || '')) return <FileText size={size}/>;
  return <Bot size={size}/>;
}

export default function AgentRuntimeLogPage({ initialRunId = '' }) {
  const [logs, setLogs] = useState([]);
  const [draft, setDraft] = useState('');
  const [studentId, setStudentId] = useState('');
  const [runId, setRunId] = useState(initialRunId);
  const [agent, setAgent] = useState('');
  const [category, setCategory] = useState('all');
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [older, setOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [chronological, setChronological] = useState(false);
  const generation = useRef(0);
  const polling = useRef(isPolling);
  polling.current = isPolling;

  useEffect(() => {
    const version = ++generation.current;
    let stopped = false, timer, cursor = null, initial = true;
    setLogs([]); setLoading(true); setHasOlder(false); setError(''); setOlder(false);
    async function poll() {
      if (stopped) return;
      if (!initial && (!polling.current || document.visibilityState === 'hidden')) { timer = setTimeout(poll, 500); return; }
      let delay = 1000;
      try {
        const data = await listAgentAuditLog({ studentId, runId, limit: 100, ...(cursor ? { sinceId: cursor } : {}) });
        if (stopped || generation.current !== version) return;
        const rows = data.logs || [];
        setLogs(previous => merge(previous, rows));
        if (initial) setHasOlder(Boolean(data.has_more));
        if (rows.length) cursor = Math.max(cursor || 0, ...rows.map(row => row.id));
        if (!initial && data.has_more) delay = 0;
        initial = false; setError('');
      } catch {
        if (!stopped) setError('Unable to refresh activity. Retrying automatically; existing events are retained.');
      } finally {
        if (!stopped) { setLoading(false); timer = setTimeout(poll, delay); }
      }
    }
    poll();
    return () => { stopped = true; clearTimeout(timer); ++generation.current; };
  }, [studentId, runId]);

  async function loadOlder() {
    const version = generation.current;
    setOlder(true);
    try {
      const data = await listAgentAuditLog({ studentId, runId, limit: 100, beforeId: Math.min(...logs.map(row => row.id)) });
      if (generation.current !== version) return;
      setLogs(previous => merge(previous, data.logs || []));
      setHasOlder(Boolean(data.has_more)); setError('');
    } catch {
      if (generation.current === version) setError('Unable to load earlier activity. Please try again.');
    } finally { if (generation.current === version) setOlder(false); }
  }
  const agents = [...new Set(logs.flatMap(row => [row.actor_agent, ...(isExchange(row) ? [row.target] : [])]).filter(Boolean))].sort();
  const interactions = buildWorkflows(logs);
  const visible = interactions.filter(item => (!agent || item.events.some(row => row.actor_agent === agent || row.target === agent)) &&
    (category === 'all' || (category === 'exchanges' && item.conversation) || (category === 'tools' && item.tool) || (category === 'errors' && item.failed)));
  if (chronological) visible.reverse();
  return <div className="mx-auto max-w-6xl space-y-6 pb-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-600"><Sparkles size={15}/> Agent observability</p><h1 className="text-3xl font-semibold tracking-tight text-ink-900">Inside the agent conversation.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">See who asked, which agent or tool handled it, and what came back. Requests and responses stay together.</p></div><span role="status" className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${error ? 'border-rose-200 bg-rose-50 text-rose-700' : isPolling ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-ink-200 bg-white text-ink-500'}`}><span className={`h-2 w-2 rounded-full ${error ? 'bg-rose-500' : isPolling ? 'bg-emerald-500' : 'bg-ink-400'}`}/>{error ? 'Connection interrupted' : isPolling ? 'Live polling active' : 'Polling paused'}</span></header>
    <TelemetryOverview logs={logs}/>
    <section aria-label="Activity filters" className="space-y-4 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm">
      <form className="flex flex-wrap items-center gap-3" onSubmit={event => { event.preventDefault(); setStudentId(draft.trim()); }}><label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 text-ink-400"><Search size={17}/><input aria-label="Filter by Student ID" placeholder="Filter by student ID…" className="w-full bg-transparent py-2.5 text-sm text-ink-800 outline-none" value={draft} onChange={event => setDraft(event.target.value)}/></label><button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">Apply</button><button type="button" onClick={() => setIsPolling(value => !value)} className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-600">{isPolling ? <Pause size={15}/> : <Play size={15}/>}{isPolling ? 'Pause' : 'Resume'}</button></form>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4"><div className="flex flex-wrap gap-1 rounded-xl bg-ink-50 p-1">{[['all','All activity'],['exchanges','Conversations'],['tools','Tool calls'],['errors','Errors']].map(([key,label]) => <button key={key} aria-pressed={category===key} onClick={() => setCategory(key)} className={`rounded-lg px-3 py-2 text-xs font-medium ${category===key ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>{label}</button>)}</div><div className="flex flex-wrap gap-2"><select aria-label="Filter by agent" value={agent} onChange={event => setAgent(event.target.value)} className="max-w-56 rounded-lg border border-ink-200 bg-white p-2 text-xs text-ink-600"><option value="">All agents</option>{agents.map(name => <option key={name}>{name}</option>)}</select><button onClick={() => setChronological(value => !value)} className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs text-ink-600"><ArrowDownUp size={14}/>{chronological ? 'Oldest first' : 'Newest first'}</button></div></div>
      {runId && <button className="break-all text-xs text-brand-700" onClick={() => setRunId('')}>Clear execution filter</button>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <section aria-label="Agent activity timeline"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-base font-semibold text-ink-800"><Clock3 size={17} className="text-ink-400"/> Communication stream</h2><span className="text-xs text-ink-400">{logs.length} events loaded · {visible.length} workflows</span></div>
      <div className="space-y-4">{!visible.length && <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-5 py-16 text-center"><Bot className="mx-auto mb-3 text-brand-400" size={32}/><p className="font-medium text-ink-700">{loading ? 'Loading agent activity…' : 'No activity matches these filters yet.'}</p><p className="mt-2 text-sm text-ink-400">New requests and agent responses will appear here.</p></div>}{visible.map(item => <WorkflowCard key={item.key} item={item} onRun={setRunId}/>)}</div>
    </section>
    {hasOlder && <div className="text-center"><button disabled={older} onClick={loadOlder} className="rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-600 disabled:opacity-50">{older ? 'Loading…' : 'Load earlier activity'}</button></div>}
    <p className="text-center text-xs leading-5 text-ink-400">Saved-information reads are labeled separately from new analysis. Counts and agent filters reflect loaded events.</p>
  </div>;
}

export function TelemetryOverview({ logs }) {
  const counts = modelCallCounts(logs);
  const total = counts.qwen + counts.claude + counts.unknown;
  const local = total - counts.claude;
  const errors = logs.filter(isErrorEvent).length;
  const activity = [
    { label: 'Agents observed', value: new Set(logs.map(row => row.actor_agent)).size, note: 'Participating in this activity', icon: Bot, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Exchange events', value: logs.filter(isExchange).length, note: 'Communication between agents', icon: MessageSquare, color: 'bg-violet-50 text-violet-600' },
    { label: 'Tool calls', value: logs.filter(row => row.action_type === 'TOOL_CALL_START').length, note: 'Recorded tool invocations', icon: Wrench, color: 'bg-sky-50 text-sky-700' },
  ];
  return <section aria-label="Activity overview" className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
      <h2 className="text-sm font-semibold text-ink-900">Activity overview</h2>
      <span className="text-xs text-ink-500">Based on {logs.length.toLocaleString()} loaded events</span>
    </div>
    <div className="grid gap-px bg-ink-100 sm:grid-cols-3">
      {activity.map(({ label, value, note, icon: Icon, color }) => <div key={label} aria-label={label} className="flex items-center gap-4 bg-white p-5 sm:p-6">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={21} aria-hidden="true"/></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-medium text-ink-500">{label}</p><p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink-900">{value.toLocaleString()}</p><p className="mt-1 text-[11px] leading-4 text-ink-400">{note}</p></div>
      </div>)}
    </div>
    <div className="grid gap-4 border-t border-ink-100 bg-ink-50/70 p-4 lg:grid-cols-4">
      <section aria-label="Model usage" className="min-w-0 rounded-xl border border-ink-200 bg-white p-5 lg:col-span-3">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-ink-700"><Sparkles size={15} className="text-brand-600" aria-hidden="true"/>Model usage</div>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          {[
            { label:'Model calls', value:total, note:'Total requests', color:'text-ink-900' },
            { label:'Local model calls', value:local, note:'Total minus Claude', color:'text-indigo-700' },
            { label:'Claude calls', value:counts.claude, note:'Total Claude requests', color:'text-amber-700' },
          ].map(({label,value,note,color}) => <div key={label} aria-label={label} className="min-w-0"><p className="text-xs font-medium leading-5 text-ink-500">{label}</p><p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${color}`}>{value.toLocaleString()}</p><p className="mt-1 text-[10px] leading-4 text-ink-400 sm:text-[11px]">{note}</p></div>)}
        </div>
        <div aria-hidden="true" className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-ink-100"><span className="bg-indigo-500 transition-all" style={{width:total ? `${local / total * 100}%` : '0%'}}/><span className="bg-amber-400 transition-all" style={{width:total ? `${counts.claude / total * 100}%` : '0%'}}/></div>
      </section>
      <section aria-label="Errors reported" className={`flex flex-col justify-between rounded-xl border p-5 ${errors ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/50'}`}>
        <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-medium text-ink-600">Errors reported</h3>{errors ? <Activity size={17} className="text-rose-600" aria-hidden="true"/> : <CheckCircle2 size={17} className="text-emerald-600" aria-hidden="true"/>}</div>
        <p className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${errors ? 'text-rose-700' : 'text-emerald-800'}`}>{errors.toLocaleString()}</p>
        <p className={`mt-2 text-[11px] leading-5 ${errors ? 'text-rose-700' : 'text-emerald-700'}`}>{errors ? 'Review highlighted steps in the activity flow.' : 'No errors in loaded activity.'}</p>
      </section>
    </div>
  </section>;
}

export function DataValue({ value, depth = 0 }) {
  if (value === null || value === undefined) return <span className="text-ink-400">Not provided</span>;
  if (typeof value !== 'object') return <span className="whitespace-pre-wrap break-words">{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</span>;
  const entries = Object.entries(value).filter(([key]) => !['student_id', 'canonical_student_id', 'message_id', 'task_id', 'run_id'].includes(key));
  if (!entries.length) return <span className="text-ink-400">No additional data</span>;
  if (depth > 4) return <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>;
  return <dl className="min-w-0 space-y-3">{entries.map(([key,item]) => <div key={key} className="min-w-0 border-l-2 border-ink-100 pl-3"><dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{Array.isArray(value) ? `Item ${Number(key)+1}` : humanize(key)}</dt><dd className="min-w-0 text-sm leading-6 text-ink-700"><DataValue value={item} depth={depth+1}/></dd></div>)}</dl>;
}


function Participant({ name, tool, role }) {
  return <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3 ${tool ? 'border-sky-200 bg-sky-50' : agentStyle(name)}`}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">{tool ? <Wrench size={20}/> : <AgentIcon name={name} size={20}/>}</span>
    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{role}</p><p className="mt-1 break-words text-sm font-semibold">{name}</p></div>
  </div>;
}

function MessagePayload({ title, from, to, value, missing, tone, time }) {
  return <section aria-label={title} className={`min-w-0 overflow-hidden rounded-2xl border ${tone === 'request' ? 'border-brand-100 bg-brand-50/40' : tone === 'error' ? 'border-rose-200 bg-rose-50/50' : 'border-teal-100 bg-teal-50/40'}`}>
    <header className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${tone === 'request' ? 'border-brand-100 text-brand-700' : tone === 'error' ? 'border-rose-100 text-rose-700' : 'border-teal-100 text-teal-700'}`}><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">{tone === 'request' ? <ArrowRight size={14}/> : <CheckCircle2 size={14}/>} {title}</h3>{time && <time className="text-[11px] font-normal">{new Date(time).toLocaleTimeString()}</time>}</header>
    <p className="flex flex-wrap items-center gap-1.5 px-4 pt-3 text-[11px] font-medium text-ink-500"><span>{from}</span><ArrowRight size={12}/><span>{to}</span></p>
    <div className="max-h-72 overflow-auto p-4 text-sm leading-6 text-ink-700">{value === undefined ? <p className="text-ink-400">{missing}</p> : typeof value === 'object' && value !== null && !Object.keys(value).length ? <p className="text-ink-500">{tone === 'request' ? 'Called without arguments.' : 'Returned an empty result.'}</p> : <DataValue value={value}/>}</div>
  </section>;
}

export function InteractionCard({ item, onRun }) {
  const [expanded, setExpanded] = useState(false);
  const {row,request,response,caller,receiver,tool,conversation,failed,operation,mode} = item;
  const type = row.action_type || 'EVENT';
  const intent = type === 'TOOL_CALL_INTENT';
  const paired = Boolean(request && response);
  const input = requestData(item), output = responseData(item);
  const hasResponse = Boolean(response || output !== undefined);
  const kind = tool ? 'Tool invocation' : conversation ? 'Agent communication' : 'Runtime activity';
  const status = failed ? 'Failed' : paired ? 'Completed' : response ? 'Response recorded' : intent ? 'Planned call' : request ? 'Request recorded' : labels[type] || humanize(type);
  const elapsed = paired ? new Date(response.timestamp)-new Date(request.timestamp) : null;
  const jobId = output?.job_id;
  const studentAgent = item.studentAgent || (/student agent/i.test(caller) ? caller : null);
  const description = operations[operation] || (tool ? `${caller} ${intent ? 'planned to use' : 'invoked'} ${receiver}.` : conversation ? `${caller} requested information from ${receiver}.` : labels[type] || humanize(type));
  const correlation = request?.inputs?.call_id || response?.inputs?.call_id || request?.inputs?.exchange_id || response?.outputs?.exchange_id;
  return <article aria-label={`${kind}: ${caller} to ${receiver}`} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${failed ? 'border-rose-200' : 'border-ink-200'}`}>
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5"><div className="flex items-center gap-2.5"><span className={`rounded-lg p-2 ${tool ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`}>{tool ? <Wrench size={16}/> : <MessageSquare size={16}/>}</span><span className="text-xs font-semibold text-ink-700">{kind}</span>{tool && <span className="rounded-md bg-ink-50 px-2 py-1 text-[10px] text-ink-500">{toolAction(receiver)}</span>}<span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${failed ? 'bg-rose-50 text-rose-700' : hasResponse ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{status}</span></div><div className="flex items-center gap-3 text-[11px] text-ink-400">{elapsed !== null && elapsed >= 0 && <span className="flex items-center gap-1"><Clock3 size={12}/>{elapsed < 1000 ? `${elapsed} ms` : `${(elapsed/1000).toFixed(1)} s`}</span>}<time>{new Date(row.timestamp).toLocaleString()}</time></div></header>
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"><Participant name={caller} role={tool ? 'Calling agent' : 'Sender'}/><div className="flex shrink-0 items-center justify-center gap-2 py-1 text-[10px] text-ink-400 sm:w-24 sm:flex-col"><span>{tool ? 'invokes' : 'sends request'}</span><ArrowRight size={24} className="text-brand-400"/>{hasResponse && <span className="text-teal-600">← returns response</span>}</div><Participant name={receiver} tool={tool} role={tool ? 'Tool' : 'Recipient'}/></div>
      <div className="flex flex-wrap items-start gap-x-8 gap-y-3 rounded-xl border border-ink-100 bg-ink-50/70 px-4 py-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">{studentAgent ? 'Student agent' : 'Initiated by'}</p><p className="mt-1 text-xs font-semibold text-ink-800">{studentAgent || caller}</p></div>

        {mode && <div><p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Source</p><p className="mt-1 text-xs font-medium text-ink-700">{modes[mode] || humanize(mode)}</p></div>}
      </div>
      <p className="text-sm leading-6 text-ink-500">{description}</p>
      <div className="grid gap-3 lg:grid-cols-2"><MessagePayload title={tool ? 'Tool input' : 'Request'} from={caller} to={receiver} value={input} missing="The request is not present in loaded activity. Load earlier activity to check for it." tone="request" time={request?.timestamp}/><MessagePayload title={failed ? 'Error output' : tool ? 'Tool output' : 'Response'} from={receiver} to={caller} value={output} missing={intent ? 'This event records a planned call, not a completed execution.' : 'No response recorded in loaded activity yet.'} tone={failed ? 'error' : 'response'} time={response?.timestamp}/></div>
      <details onToggle={event => setExpanded(event.currentTarget.open)} className="group border-t border-ink-100 pt-3"><summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-ink-500">Event IDs & full trace<ChevronDown size={14} className="group-open:rotate-180"/></summary>{expanded && <div className="mt-3 space-y-3 rounded-xl bg-ink-50 p-4 text-xs text-ink-600"><p className="break-all">Correlation ID: {correlation || row.run_id || 'Not recorded'}</p><p>Recorded events: {item.events.map(event => `#${event.id} · ${event.action_type}`).join(' → ')}</p><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(item.events,(key,value)=>['student_id','canonical_student_id','message_id','task_id','run_id'].includes(key)?undefined:value,2)}</pre></div>}</details>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/50 px-5 py-3 text-[11px]"><button className="break-all text-left text-brand-600 hover:underline" onClick={() => onRun(row.run_id)}>View this execution</button>{jobId && jobId !== row.run_id && <button className="text-brand-600 hover:underline" onClick={() => onRun(jobId)}>Follow background job →</button>}<span className="text-ink-400">{paired ? 'Request and response linked' : 'Single recorded event'}</span></footer>
  </article>;
}



function stepStyle(event) {
  if (isErrorEvent(event)) return 'border border-rose-200 bg-rose-50';
  if (isWarningEvent(event)) return 'border border-amber-200 bg-amber-50';
  if (isConversation(event)) return 'border border-emerald-200 bg-emerald-50';
  if ((event.action_type || '').startsWith('TOOL_')) return 'border border-sky-200 bg-sky-50';
  if (/MODEL|REASONING/.test(event.action_type || '')) return 'border border-violet-200 bg-violet-50';
  return 'border border-ink-100 bg-ink-50/60';
}

function WorkflowCard({item,onRun}) {
  const stepList=useRef(null), followSteps=useRef(true);
  const [flowOpen,setFlowOpen]=useState(false);
  const modelCounts=modelCallCounts(item.events);
  const toolCount=item.events.filter(event=>event.action_type==='TOOL_CALL_START').length;
  useEffect(()=>{if(followSteps.current && stepList.current)stepList.current.scrollTop=stepList.current.scrollHeight;},[item.latestId,flowOpen]);
  const last=item.events[item.events.length-1];
  const latestTool=[...item.events].reverse().find(event=>/^TOOL_/.test(event.action_type || '') && event.target && event.target!=='unknown');
  const currentAgent=last.action_type==='AGENT_COMMUNICATION_START' ? last.target : last.actor_agent || item.caller;
  const toolLabel=latestTool?.target || 'No tool called';
  const owner=item.events.find(event=>event.student_name)?.student_name;
  const activityType=({github_connection:'GitHub connection',cv_upload:'CV upload',linkedin_import:'LinkedIn import',parse_resume:'CV extraction',analyze_linkedin:'LinkedIn analysis',queue_sync:'GitHub sync'})[item.activityType] || 'Agent activity';
  const active=/START$/.test(last.action_type || '') || last.action_type==='TOOL_CALL_INTENT';
  return <section aria-label={`Live activity ${item.row.student_id || item.row.run_id}`} className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
    <details open={flowOpen} onToggle={event=>setFlowOpen(event.currentTarget.open)}><summary aria-label="Expand live activity" className="list-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"><header className="border-b border-brand-100 bg-brand-50/60 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900"><Activity size={18} className={active?'animate-pulse text-brand-600':'text-brand-600'}/> {item.studentAgent || item.caller}<span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-brand-700">{activityType}</span></h3><span className="min-w-0 flex-1 text-sm text-ink-600">{activitySummary(last)}</span><span className="text-xs text-ink-500">Step {item.events.length} · {toolCount} tool calls · {modelCounts.qwen+modelCounts.claude+modelCounts.unknown} model calls · {modelCounts.qwen+modelCounts.unknown} local model calls{item.failed && ` · ${item.events.filter(isErrorEvent).length-item.recoveredErrors.length} errors`}{item.recoveredErrors.length>0 && ` · ${item.recoveredErrors.length} validation retries addressed`}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{[
      ['Working agent',currentAgent],['Current operation',activitySummary(last)],['Most recent tool',toolLabel]
    ].map(([label,value])=><div key={label} className="rounded-xl border border-ink-200 bg-white p-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p><p className="break-words text-sm font-semibold leading-6 text-ink-900">{value}</p></div>)}</div><p className="mt-3 text-xs text-ink-500">{item.runCount} execution{item.runCount===1?'':'s'} · Updated {new Date(last.timestamp).toLocaleTimeString()}</p><p className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-700"><ChevronDown size={15} className={flowOpen?'rotate-180':''}/>{flowOpen?'Hide activity details':'Show full activity flow'}</p></header></summary>
    <div className="border-b border-ink-100 p-5"><p className="mb-3 text-sm text-ink-600"><strong>User: </strong>{owner || 'System activity'}</p>{latestTool && <details className="mb-4 rounded-xl border border-sky-100 bg-sky-50/40 p-3"><summary className="cursor-pointer text-sm font-medium text-sky-800">{toolLabel} · Parameters</summary><div className="mt-3"><DataValue value={[...item.events].reverse().find(event=>event.action_type==='TOOL_CALL_START' && event.target===latestTool.target)?.inputs}/></div></details>}{item.userMessage && <p className="mb-3 whitespace-pre-wrap break-words text-sm text-ink-700"><strong>Request: </strong>{item.userMessage}</p>}<div aria-label="Activity colour legend" className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Agent exchange</span><span className="rounded-full bg-sky-50 px-3 py-1 text-sky-800">Tool call / result</span><span className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">Model activity</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">Warning / waiting</span><span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">Error</span></div></div>
    <ol ref={stepList} onScroll={event=>{const box=event.currentTarget;followSteps.current=box.scrollHeight-box.scrollTop-box.clientHeight<60;}} className="max-h-[32rem] space-y-4 overflow-auto p-5" aria-label="Workflow steps">{item.events.map((event,index)=><li key={event.id} className={`flex gap-3 rounded-xl p-3 ${stepStyle(event)}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs text-brand-700">{index+1}</span><div className="min-w-0 flex-1"><p className={`text-sm leading-6 ${isErrorEvent(event)?'font-semibold text-rose-800':'text-ink-800'}`}>{isErrorEvent(event)?<XCircle size={16} className="mr-2 inline"/>:isConversation(event)?<MessageSquare size={16} className="mr-2 inline text-emerald-700"/>:(event.action_type || "").startsWith("TOOL_")?<Wrench size={16} className="mr-2 inline text-sky-700"/>:null}{activitySummary(event)}</p>{eventError(event)&&<p role={isErrorEvent(event)?'alert':undefined} className={`mt-2 whitespace-pre-wrap break-words text-sm ${isErrorEvent(event)?'text-rose-700':'text-amber-800'}`}>{String(eventError(event))}</p>}{item.recoveredErrors.includes(event) && <p className="mt-2 text-sm font-semibold text-emerald-700">A later submission was accepted. Unsupported records were corrected or omitted.</p>}{event.outputs?.result?.issues?.length>0 && <ul className="mt-2 space-y-1 text-xs text-rose-800">{event.outputs.result.issues.map((issue,i)=><li key={i}>{issue.record || "Record"}{issue.field ? ` · ${issue.field}` : ""}: {issue.problem}</li>)}</ul>}<p className="text-[11px] text-ink-400">{new Date(event.timestamp).toLocaleTimeString()} · {event.target || 'Agent activity'} · <button className="text-brand-600 hover:underline" onClick={()=>onRun(event.run_id)}>View this execution</button></p><details className="mt-2 rounded-lg border border-ink-100 px-3 py-2"><summary className="cursor-pointer text-xs text-brand-700">Inputs, results & recorded details</summary><div className="mt-3 grid gap-4 md:grid-cols-2"><div><p className="mb-2 text-xs font-semibold">Inputs</p><DataValue value={event.inputs}/></div><div><p className="mb-2 text-xs font-semibold">Outputs</p><DataValue value={event.outputs}/></div></div></details></div></li>)}</ol>
    <details className="border-t border-ink-100 p-4"><summary className="cursor-pointer text-xs font-semibold text-brand-700">Agent exchanges and tool results</summary><div className="mt-4 space-y-3">{buildInteractions(item.events).filter(interaction=>interaction.tool || interaction.conversation).map(interaction=><InteractionCard key={interaction.key} item={interaction} onRun={onRun}/>)}</div></details></details>
  </section>;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bot, CheckCircle2, Clock3, Search, ArrowRight, ChevronDown } from "lucide-react";
import client from "../../api/client";

export default function AgentQueriesPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("query");
  const [direction, setDirection] = useState("student_to_university");
  const [status, setStatus] = useState("unanswered");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const id = ++generation.current;
    try {
      const response = await client.get("/agent-queries/", {params:{page, search:term, ...(selected ? {query_id:selected} : {status, direction})}});
      if (id === generation.current) { setData(response.data); setError(""); }
    } catch (e) { if (id === generation.current) setError(e.message || "Unable to load agent queries."); }
  }, [page, term, status, direction, selected]);
  useEffect(() => { setData(null); load(); const timer=setInterval(load,30000); return () => { ++generation.current; clearInterval(timer); }; }, [load]);
  const answer = async () => {
    setBusy(true); setError("");
    try {
      await client.post(`/agent-queries/${draft.id}/answer/`, {answer:draft.answer, answer_scope:draft.scope, confirmed:true});
      setDraft(null); await load();
    } catch (e) { setError(typeof e.message === "string" ? e.message : "Your answer could not be saved."); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Agent collaboration</p><h1 className="mt-2 text-3xl font-semibold text-ink-900">Queries</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">Questions raised by student and university agents. Answer missing information once and keep the conversation moving.</p></header>
    <div role="tablist" aria-label="Query direction" className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 border border-ink-200">{[["student_to_university","Raised by students"],["university_to_student","Raised by you"]].map(([value,label])=><button key={value} role="tab" aria-selected={direction===value&&!selected} onClick={()=>{setDirection(value);setPage(1);setParams({});setDraft(null);}} className={`rounded-xl px-4 py-3 text-sm font-semibold ${direction===value&&!selected?"bg-brand-600 text-white":"text-ink-600 hover:bg-ink-50"}`}>{label}</button>)}</div>
    <p className="text-sm text-ink-500">{direction==="student_to_university"?"Answer questions raised by students’ agents. Your answer is sent to the student.":"Questions your agent raised with students. Students answer these from their Queries screen."}</p>
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white p-4">
      <div className="flex gap-2" role="tablist" aria-label="Query status">{["unanswered","answered"].map(value=><button key={value} role="tab" aria-selected={status===value&&!selected} onClick={()=>{setStatus(value);setPage(1);setParams({});setDraft(null);}} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${status===value&&!selected?"bg-brand-600 text-white":"bg-ink-50 text-ink-600"}`}>{value==="answered"?"Answered":"Unanswered"}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();setTerm(search.trim());setPage(1);}} className="flex min-w-0 flex-1 gap-2 sm:max-w-sm"><input aria-label="Search queries" placeholder="Search question, student or agent…" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm"/><button aria-label="Search" className="rounded-xl bg-ink-100 p-3"><Search size={18}/></button></form>
    </div>
    {selected&&<button onClick={()=>{setParams({});setPage(1);}} className="text-sm font-medium text-brand-700">Showing selected query · Show all queries</button>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!data&&!error&&<p className="py-12 text-center text-ink-500">Loading queries…</p>}
    {data?.results.length===0&&<div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-16 text-center"><Bot className="mx-auto mb-4 text-brand-600" size={32}/><h2 className="font-semibold text-ink-800">No {status} queries</h2><p className="mt-2 text-sm text-ink-500">New questions appear here when an agent needs information from a person.</p></div>}
    {data?.results.map(item=><article key={item.id} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink-900">{item.student_name || "Student"}</p><p className="mt-1 text-xs text-ink-500">{item.raised_by_agent} <ArrowRight size={12} className="inline"/> {item.recipient_agent}</p></div><span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${item.status==="answered"?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{item.status==="answered"?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {item.status==="answered"?"Answered":"Awaiting answer"}</span></div>
      <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink-900">{item.question}</p><p className="mt-3 text-xs text-ink-400">{item.university_name} · {new Date(item.created_at).toLocaleString()}</p>
      {item.status==="answered"?<details className="mt-4 rounded-xl bg-emerald-50/60 p-4"><summary className="cursor-pointer text-sm font-semibold text-emerald-800">View answer <ChevronDown className="inline" size={14}/></summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">{item.answer}</p><p className="mt-3 text-xs text-ink-500">{item.answer_scope==="university"?"Saved to university knowledge":"Private to this student and university"} · {new Date(item.answered_at).toLocaleString()}</p></details>:item.direction==="student_to_university"?<button onClick={()=>setDraft({id:item.id,question:item.question,answer:"",scope:"private",review:false})} className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">Answer query</button>:<p className="mt-4 text-sm text-ink-500">Sent to the student’s agent. The student has been notified.</p>}
      {draft?.id===item.id&&<div className="mt-5 space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
        <label className="block text-sm font-medium text-ink-800">Your answer<textarea aria-label="Your answer" rows={5} maxLength={12000} value={draft.answer} disabled={draft.review||busy} onChange={e=>setDraft({...draft,answer:e.target.value})} className="mt-2 w-full rounded-xl border border-ink-200 bg-white p-3 font-normal"/></label>
        <label className="block text-sm text-ink-700">Save this answer as<select aria-label="Answer visibility" disabled={draft.review||busy} value={draft.scope} onChange={e=>setDraft({...draft,scope:e.target.value})} className="mt-2 w-full rounded-lg border border-ink-200 bg-white p-2"><option value="private">Private answer for this student</option><option value="university">General university knowledge, available to all students</option></select></label>
        <p className="text-xs leading-5 text-ink-500">Use university knowledge only for general policies or facts. Personal student information must remain private. This saves an answer; it does not silently overwrite structured requirements.</p>
        {draft.review&&<p className="text-sm font-medium text-brand-800">Confirm this answer. It will be saved and the student will be notified.</p>}
        <div className="flex gap-3"><button disabled={busy||!draft.answer.trim()} onClick={()=>draft.review?answer():setDraft({...draft,review:true})} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":draft.review?"Confirm and send":"Review answer"}</button><button disabled={busy} onClick={()=>draft.review?setDraft({...draft,review:false}):setDraft(null)} className="px-3 text-sm text-ink-600">{draft.review?"Edit":"Cancel"}</button></div>
      </div>}
    </article>)}
    {data&&<div className="flex items-center justify-between text-sm text-ink-500"><button disabled={page<=1} onClick={()=>setPage(page-1)} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">Previous</button><span>Page {page} · {data.pagination.total} queries</span><button disabled={!data.pagination.has_next} onClick={()=>setPage(page+1)} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">Next</button></div>}
  </div>;
}

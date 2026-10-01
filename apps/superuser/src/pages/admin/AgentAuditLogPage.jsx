import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, MessageSquare, Search } from "lucide-react";
import client from "../../api/client";
import AgentRuntimeLogPage from "./AgentRuntimeLogPage";
import AgentConversationChat from "./AgentConversationChat";

export default function AgentAuditLogPage() {
  const [tab,setTab]=useState("conversations");
  const [selected,setSelected]=useState(null);
  const [page,setPage]=useState(1);
  const [selectedRun,setSelectedRun]=useState("");
  const [search,setSearch]=useState("");
  const [term,setTerm]=useState("");
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  const generation=useRef(0);
  const openConversation = (id) => {
    ++generation.current;
    setData(null);
    setError("");
    setSelected(id);

  };
  const load=useCallback(async()=>{
    const id=++generation.current;
    try {
      const {data:result}=await client.get("/agent-queries/conversations/",{params:{page,search:term}});
      if(id===generation.current){setData(result);setError("");}
    }catch(e){if(id===generation.current)setError(e.message||"Unable to load conversations.");}
  },[page,term]);
  useEffect(() => {
    if (tab !== 'conversations' || selected) return;
    let active = true, busy = false;
    const refresh = async () => {
      if (!active || busy || document.hidden) return;
      busy = true;
      try { await load(); } finally { busy = false; }
    };
    setData(null); refresh();
    const timer = setInterval(refresh, 15000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; ++generation.current; clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [load, tab, selected]);
  return <div className="mx-auto max-w-6xl space-y-6 pb-12"><div className="flex gap-2 border-b border-ink-200 pb-3">{["conversations","runtime"].map(t=><button key={t} onClick={()=>setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab===t?"bg-brand-600 text-white":"bg-white text-ink-600"}`}>{t==="conversations"?"Agent conversations":"Runtime events"}</button>)}</div>
    {tab==="runtime"?<AgentRuntimeLogPage initialRunId={selectedRun}/>:<>
    <header><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Telemetry</p><h1 className="mt-2 text-3xl font-semibold text-ink-900">{selected?"Conversation":"Agent conversations"}</h1><p className="mt-2 text-sm text-ink-500">Each student–university pair has one conversation, with timestamped requests, replies and human answers.</p></header>
    {selected?<button onClick={()=>{openConversation(null);}} className="flex items-center gap-2 text-sm font-medium text-brand-700"><ArrowLeft size={16}/> Back to conversations</button>:<form onSubmit={e=>{e.preventDefault();setTerm(search.trim());setPage(1);}} className="flex gap-2"><input aria-label="Search agent conversations" placeholder="Search student, university or agent…" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm"/><button aria-label="Search" className="rounded-xl bg-brand-600 px-4 text-white"><Search size={18}/></button></form>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!selected&&!data&&!error&&<p className="py-12 text-center text-ink-500">Loading conversation history…</p>}
    {selected&&<AgentConversationChat key={selected} conversationId={selected} onRun={id=>{setSelectedRun(id);setTab("runtime");}}/>}
    {!selected&&data?.results?.map(c=><button key={c.id} onClick={()=>{openConversation(c.id);}} className="block w-full rounded-2xl border border-ink-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300"><div className="flex items-center gap-3"><div className="rounded-xl bg-brand-50 p-3 text-brand-600"><MessageSquare size={22}/></div><div className="min-w-0 flex-1"><h2 className="font-semibold text-ink-900">{c.student_name || "Student"} <ArrowRight className="mx-1 inline" size={16}/> {c.university_name}</h2><p className="mt-1 text-sm text-ink-500">{c.student_agent} ↔ {c.university_agent}</p><p className="mt-2 text-xs text-ink-400">{c.message_count} messages · Updated {new Date(c.updated_at).toLocaleString()}</p></div><ArrowRight size={18} className="text-ink-400"/></div></button>)}
    {!selected&&data?.results?.length===0&&<p className="rounded-2xl border border-dashed p-12 text-center text-ink-500">{selected ? "No messages in this conversation yet." : "No conversations found."}</p>}
    {!selected&&data&&<div className="flex items-center justify-between text-sm text-ink-500"><button disabled={data.pagination.page<=1} onClick={()=>setPage(page-1)} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">Previous</button><span>Page {data.pagination.page} · {data.pagination.total} {selected?"messages":"conversations"}</span><button disabled={!data.pagination.has_next} onClick={()=>setPage(page+1)} className="rounded-xl border bg-white px-4 py-2 disabled:opacity-40">Next</button></div>}
    </>}
  </div>;
}

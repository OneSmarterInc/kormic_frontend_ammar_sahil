import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, Search, Trash2, X, ArrowUpRight } from "lucide-react";
import { useVisiblePolling } from "../../hooks/useVisiblePolling.js";

export default function NotificationBell({client,navigate,pollMs=30000}) {
  const [open,setOpen]=useState(false), [items,setItems]=useState([]), [unread,setUnread]=useState(0);
  const [loading,setLoading]=useState(false), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const [page,setPage]=useState(1), [hasNext,setHasNext]=useState(false), [search,setSearch]=useState("");
  const [expanded,setExpanded]=useState(null);
  const root=useRef(null), sequence=useRef(0), countSequence=useRef(0), openRef=useRef(open);
  openRef.current=open;
  const load=useCallback(async()=>{
    const id=++sequence.current;setLoading(true);
    try{const{data}=await client.get("/notifications/",{params:{page,page_size:10,search}});if(id===sequence.current){setItems(data.results||[]);setUnread(data.unread_count||0);setHasNext(data.pagination?.has_next||false);setError("");}}
    catch{if(id===sequence.current)setError("Unable to load notifications. Please try again.");}
    finally{if(id===sequence.current)setLoading(false);}
  },[client,page,search]);
  const count=useCallback(async()=>{const id=++countSequence.current;try{const{data}=await client.get("/notifications/unread-count/");if(id===countSequence.current&&!openRef.current)setUnread(data.unread_count||0);}catch{}},[client]);
  useEffect(()=>()=>{++countSequence.current;},[open,client]);
  // The open inbox response includes unread_count, so only one endpoint is polled at a time.
  useVisiblePolling(open?load:count,pollMs);
  useEffect(()=>{if(!open)return;const close=e=>{if(!root.current?.contains(e.target))setOpen(false);};const escape=e=>{if(e.key==="Escape")setOpen(false);};document.addEventListener("mousedown",close);document.addEventListener("keydown",escape);return()=>{++sequence.current;document.removeEventListener("mousedown",close);document.removeEventListener("keydown",escape);};},[open,load]);
  const action=async(path)=>{setBusy(true);++sequence.current;try{await client.post(path);setItems([]);setExpanded(null);if(page!==1)setPage(1);else await load();}catch{setError("Could not update notifications. Please retry.");}finally{setBusy(false);}};
  const read=async(item)=>{setExpanded(expanded===item.id?null:item.id);if(!item.read_at){try{const{data}=await client.post(`/notifications/${item.id}/read/`);setItems(old=>old.map(n=>n.id===item.id?data:n));setUnread(n=>Math.max(0,n-1));await load();}catch{setError("Unable to mark this notification read.");}}};
  return <div className="relative" ref={root}><button aria-label={unread?`Notifications, ${unread} unread`:"Notifications"} aria-expanded={open} onClick={()=>setOpen(!open)} className="relative rounded-xl p-2.5 text-ink-600 hover:bg-ink-100 focus:ring-2 focus:ring-brand-300"><Bell size={20}/>{unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold leading-4 text-white">{unread>99?"99+":unread}</span>}</button>
    {open&&<section aria-label="Notification inbox" className="fixed right-3 top-14 z-50 w-[calc(100vw-24px)] max-w-md overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
      <header className="border-b border-ink-100 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-ink-900">Notifications</h2><p className="mt-1 text-xs text-ink-500">{unread?`${unread} unread updates`:"You're all caught up"}</p></div><button aria-label="Close notifications" onClick={()=>setOpen(false)} className="rounded-lg p-2 hover:bg-ink-50"><X size={18}/></button></div>
      <div className="mt-4 flex flex-wrap items-center gap-4"><button disabled={busy||!unread} onClick={()=>action("/notifications/read-all/")} className="flex items-center gap-1.5 text-xs font-medium text-brand-700 disabled:opacity-40"><CheckCheck size={15}/> Mark all read</button><button disabled={busy} onClick={()=>action("/notifications/clear-all/")} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 disabled:opacity-40"><Trash2 size={14}/> Clear all</button></div>
      <label className="mt-4 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2"><Search size={16} className="text-ink-400"/><input aria-label="Search notifications" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search notifications" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/></label></header>
      {error&&<div role="alert" className="bg-red-50 px-5 py-3 text-xs text-red-700">{error}<button onClick={load} className="ml-2 underline">Retry</button></div>}
      <div className="max-h-[55vh] overflow-y-auto">{loading&&!items.length?<p className="p-10 text-center text-sm text-ink-500">Loading…</p>:!items.length?<div className="flex flex-col items-center gap-3 p-10 text-center"><Inbox size={30} className="text-ink-300"/><p className="text-sm font-medium text-ink-700">No notifications</p><p className="text-xs text-ink-500">New answers and requests will appear here.</p></div>:items.map(item=><article key={item.id} className={`border-b border-ink-100 px-5 py-4 ${item.read_at?"bg-white":"bg-brand-50/40"}`}>
        <div className="flex items-start gap-3"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${item.read_at?"bg-ink-200":"bg-brand-600"}`}/><button onClick={()=>read(item)} className="min-w-0 flex-1 text-left"><p className="text-sm font-semibold leading-5 text-ink-900">{item.title}</p>{item.data?.university_name&&<p className="mt-1 text-xs font-medium text-brand-700">{item.data.university_name}</p>}<p className="mt-1 text-xs leading-5 text-ink-600">{expanded===item.id?item.body:item.body?.slice(0,160)}</p><time className="mt-2 block text-[10px] text-ink-400">{new Date(item.created_at).toLocaleString()}</time></button><button aria-label={`Clear notification ${item.id}`} disabled={busy} onClick={()=>action(`/notifications/${item.id}/clear/`)} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100"><X size={15}/></button></div>
        {expanded===item.id&&<div className="ml-5 mt-3 space-y-3 rounded-xl bg-ink-50 p-3">{item.data?.question&&<div><p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Question</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">{item.data.question}</p></div>}{item.data?.answer&&<div><p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">Answer</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-700">{item.data.answer}</p></div>}{typeof item.data?.route==="string"&&item.data.route.startsWith("/")&&<button onClick={()=>{setOpen(false);navigate?.(item.data.route);}} className="flex items-center gap-1 text-xs font-semibold text-brand-700">{item.data.query_id?"Open query":"View details"}<ArrowUpRight size={14}/></button>}</div>}
      </article>)}</div>
      <footer className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-5 py-3 text-xs text-ink-500"><button disabled={page<=1||loading} onClick={()=>setPage(page-1)} className="disabled:opacity-30">Previous</button><span>Page {page}</span><button disabled={!hasNext||loading} onClick={()=>setPage(page+1)} className="disabled:opacity-30">Next</button></footer>
    </section>}
  </div>;
}

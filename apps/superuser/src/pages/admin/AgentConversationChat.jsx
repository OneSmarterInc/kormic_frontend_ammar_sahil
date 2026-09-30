import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, CheckCircle2, Bot, ChevronDown, GitBranch, Wrench } from 'lucide-react';
import client from '../../api/client';
import { InteractionCard, DataValue } from './AgentRuntimeLogPage';
import { buildInteractions, toolAction } from './telemetryInteractions';

const merge = (before, after) => [...new Map([...before,...after].map(row => [row.id,row])).values()].sort((a,b) => a.id-b.id);

export function groupReplyTools(messages) {
  const attached = new Map(), hidden = new Set();
  messages.forEach((message, index) => {
    if (message.kind !== 'tool') return;
    let next = index + 1;
    while (messages[next]?.kind === 'tool') next++;
    const reply = messages[next];
    if (!reply || reply.kind !== 'reply' || reply.actor !== message.actor || reply.actor_name !== message.actor_name) return;
    const exchange = message.metadata?.exchange_id;
    if ((exchange || reply.metadata?.exchange_id) && exchange !== reply.metadata?.exchange_id) return;
    attached.set(reply.id, [...(attached.get(reply.id) || []), message]);
    hidden.add(message.id);
  });
  return messages.filter(message => !hidden.has(message.id)).map(message => ({...message, tools: attached.get(message.id) || []}));
}

export default function AgentConversationChat({ conversationId, onRun }) {
  const [info,setInfo] = useState(null), [messages,setMessages] = useState([]), [error,setError] = useState('');
  const [hasOlder,setHasOlder] = useState(false), [loadingOlder,setLoadingOlder] = useState(false);
  const [openId,setOpenId] = useState(null), [following,setFollowing] = useState(true);
  const viewport = useRef(null), stick = useRef(true), olderHeight = useRef(null), alive = useRef(true);
  const positioned = useRef(false);
  const url = `/agent-queries/conversations/${conversationId}/`;
  useEffect(() => {
    let stopped=false, timer, cursor=null;
    alive.current=true;
    async function poll() {
      let delay=5000;
      try {
        const {data}=await client.get(url,{params:cursor ? {after_id:cursor} : {latest:1}});
        if(stopped)return;
        setInfo(data); setMessages(previous=>merge(previous,data.results || []));
        if(!cursor)setHasOlder(Boolean(data.has_older));
        if(cursor && data.has_more)delay=0;
        if(data.results?.length)cursor=Math.max(...data.results.map(row=>row.id),cursor || 0);
        setError('');
      } catch(e) {if(!stopped)setError(e.message || 'Unable to load conversation.');}
      finally {if(!stopped)timer=setTimeout(poll,delay);}
    }
    poll();
    return()=>{stopped=true;alive.current=false;clearTimeout(timer);};
  },[url]);
  useLayoutEffect(()=>{
    const box=viewport.current;
    if(!box)return;
    if(olderHeight.current !== null){box.scrollTop += box.scrollHeight-olderHeight.current;olderHeight.current=null;}
    else if(stick.current)box.scrollTop=box.scrollHeight;
    if(messages.length && !positioned.current){positioned.current=true;box.scrollIntoView?.({block:'end'});}
  },[messages]);
  async function loadOlder() {
    setLoadingOlder(true);
    try {
      const {data}=await client.get(url,{params:{before_id:messages[0]?.id}});
      if(!alive.current)return;
      olderHeight.current=viewport.current?.scrollHeight || 0;
      stick.current=false;setFollowing(false);
      setMessages(previous=>merge(previous,data.results || []));setHasOlder(Boolean(data.has_older));
    } catch(e){if(alive.current)setError(e.message || 'Unable to load earlier messages.');}
    finally {if(alive.current)setLoadingOlder(false);}
  }
  function latest(){stick.current=true;setFollowing(true);if(viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;}
  const displayMessages=groupReplyTools(messages);
  return <section className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm" aria-label="Agent conversation chat">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-5"><div><h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900"><Bot size={18} className="text-brand-600"/>{info?.student_agent || info?.student_name || 'Student agent'}<span className="text-ink-400">↔</span>{info?.university_agent || info?.university_name || 'University agent'}</h2><p className="mt-1.5 text-xs text-ink-500">{info?.student_name} · {info?.university_name}</p>{info?.student_id && <p className="mt-1 break-all text-[11px] text-ink-400">Student ID: {info.student_id}</p>}</div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">Live conversation</span></header>
    {error && <p role="alert" className="border-b border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div ref={viewport} onScroll={event=>{const box=event.currentTarget;stick.current=box.scrollHeight-box.scrollTop-box.clientHeight<70;setFollowing(stick.current);}} className="h-[65vh] min-h-80 overflow-y-auto bg-ink-50/60 p-4 sm:p-6" aria-label="Chat messages">
      {hasOlder && <div className="mb-6 text-center"><button disabled={loadingOlder} onClick={loadOlder} className="rounded-full border border-ink-200 bg-white px-4 py-2 text-xs text-ink-600">{loadingOlder?'Loading…':'Load earlier messages'}</button></div>}
      {!info&&!error&&<p className="py-12 text-center text-sm text-ink-500">Loading conversation history…</p>}
      {info&&!messages.length&&<p className="py-12 text-center text-sm text-ink-500">No messages in this conversation yet.</p>}
      <div className="mx-auto max-w-5xl space-y-6">{displayMessages.map((message,index)=>{
        const student=(message.actor || '').startsWith('student');
        const tool=message.kind==='tool';
        const open=openId===message.id;
        const outgoing=student&&!tool;
        const showDate=index===0 || new Date(displayMessages[index-1].created_at).toDateString()!==new Date(message.created_at).toDateString();
        return <article key={message.id} className={`flex min-w-0 flex-col ${outgoing?'items-end':'items-start'}`}>
          {showDate&&<div className="mb-6 flex w-full items-center gap-4"><div className="h-px flex-1 bg-ink-200/70"/><time className="text-[11px] font-medium text-ink-500">{new Date(message.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time><div className="h-px flex-1 bg-ink-200/70"/></div>}
          <div className={`w-full min-w-0 sm:max-w-[85%] ${tool?'sm:pl-10':''}`}>
          <div className={`mb-2 flex items-center gap-2 px-1 text-xs ${outgoing?'justify-end':''}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tool?'bg-sky-100 text-sky-700':outgoing?'bg-brand-100 text-brand-700':'bg-white text-ink-600 ring-1 ring-ink-200'}`}>{tool?<Wrench size={14}/>:<Bot size={14}/>}</span><span className="font-semibold text-ink-800">{message.actor_name || 'Agent'}</span><span className="text-ink-500">{tool?'used a tool':outgoing?'sent a request':'sent a reply'}</span><time title={new Date(message.created_at).toLocaleString()} className="ml-1 shrink-0 text-[10px] text-ink-400">{new Date(message.created_at).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}</time></div>
          <div aria-label={message.tools.length?`Reply from ${message.actor_name} with tools`:undefined} role={message.tools.length?'group':undefined} className={message.tools.length?'overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm':''}>
          <button aria-label={`Show flow for message #${message.id}`} aria-expanded={open} onClick={()=>{stick.current=false;setFollowing(false);setOpenId(open?null:message.id);}} className={`w-full min-w-0 border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:p-5 ${message.tools.length?'rounded-none border-0':open?'rounded-t-2xl':'rounded-2xl shadow-sm hover:shadow-md'} ${tool?'border-sky-200 bg-sky-50/60 text-ink-700':outgoing?'border-brand-200 bg-brand-50 text-ink-900':'border-ink-200 bg-white text-ink-800'}`}>
            {tool && <div className="mb-2 flex flex-wrap items-center gap-2"><span className="min-w-0 break-all text-sm font-semibold text-sky-800">{message.metadata?.tool || 'Tool execution'}</span><span className="rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-medium text-sky-700">{toolAction(message.metadata?.tool || '')}</span></div>}
            <p className={`whitespace-pre-wrap break-words text-sm leading-7 ${open?'':'line-clamp-5'}`}>{message.content}</p>
            <div className={`mt-4 flex items-center justify-between gap-2 border-t pt-3 text-xs font-medium ${tool?'border-sky-100 text-sky-700':'border-ink-200/60 text-brand-700'}`}><span className="flex items-center gap-2"><GitBranch size={14}/>{open?'Hide execution flow':'Explore tools, inputs & response'}</span><ChevronDown size={15} className={`shrink-0 transition-transform ${open?'rotate-180':''}`}/></div>
          </button>
          {open && <MessageFlow key={message.id} url={url} message={message} onRun={onRun}/>}
          {message.tools.length>0&&<div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5"><p className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Tools used for this reply</p>{message.tools.map(entry=><div key={entry.id} className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50/60"><button aria-label={`Show flow for message #${entry.id}`} aria-expanded={openId===entry.id} onClick={()=>{stick.current=false;setFollowing(false);setOpenId(openId===entry.id?null:entry.id);}} className="w-full p-4 text-left text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"><span className="flex items-center gap-2 text-sm font-semibold"><Wrench size={15} className="shrink-0"/><span className="min-w-0 break-all">{entry.metadata?.tool || 'Tool execution'}</span><ChevronDown size={15} className={`ml-auto shrink-0 ${openId===entry.id?'rotate-180':''}`}/></span><span className="mt-2 block text-xs leading-5 text-ink-600">{entry.content}</span><span className="mt-3 block text-xs font-medium">{openId===entry.id?'Hide execution flow':'Explore inputs, outputs & flow'}</span></button>{openId===entry.id&&<MessageFlow url={url} message={entry} onRun={onRun}/>}</div>)}</div>}
          </div>
          </div>
        </article>;
      })}</div>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 px-5 py-3"><p className="text-[11px] text-ink-400">Click a message to explore the work behind it.</p><button onClick={latest} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700"><ArrowDown size={13}/>{following?'Latest message':'Jump to latest'}</button></footer>
  </section>;
}

function MessageFlow({url,message,onRun}) {
  const [data,setData]=useState(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    let stopped=false,timer;
    async function load(){
      try {const response=await client.get(url,{params:{message_id:message.id}});if(!stopped){setData(response.data);setError('');}}
      catch(e){if(!stopped)setError(e.message || 'Unable to load execution flow.');}
      finally{if(!stopped)timer=setTimeout(load,5000);}
    }
    load();return()=>{stopped=true;clearTimeout(timer);};
  },[url,message.id,retry]);
  const interactions=buildInteractions(data?.logs || []).reverse();
  return <section aria-label={`Execution flow for message #${message.id}`} className="w-full min-w-0 overflow-hidden rounded-b-2xl border border-t-0 border-ink-200 bg-white p-4 shadow-sm sm:p-5">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800"><GitBranch size={16} className="text-brand-600"/> What happened in this exchange</h3>
    <p className="mt-1 text-xs text-ink-400">Request → tool execution → response</p>
    {error&&<div role="alert" className="mt-3 text-sm text-rose-600">{error} <button onClick={()=>setRetry(value=>value+1)} className="underline">Retry</button></div>}
    {!data&&!error&&<p className="py-5 text-sm text-ink-400">Loading execution flow…</p>}
    {data&&<><ol className="mt-5 space-y-5 border-l-2 border-brand-100 pl-5">{(data.steps || []).map((step,index)=><li key={step.id} className="relative"><span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">{index+1}</span><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-semibold text-ink-800">{step.actor_name} <span className="font-normal text-ink-400">· {step.kind}</span>{step.metadata?.tool && <span className="ml-2 rounded bg-sky-50 px-2 py-1 text-sky-700">{step.metadata.tool} · {toolAction(step.metadata.tool)}</span>}</h4><time className="text-[10px] text-ink-400">{new Date(step.created_at).toLocaleTimeString()}</time></div>{step.kind==='reply'?<div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"><CheckCircle2 size={14} aria-hidden="true"/>Replied</div>:<p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink-600">{step.content}</p>}{step.kind==='tool'&&<div className="mt-3 grid gap-3 md:grid-cols-2">{['inputs','outputs'].map(key=><div key={key} className="min-w-0 rounded-xl border border-ink-100 bg-ink-50 p-3"><p className="mb-2 text-[10px] font-semibold uppercase text-ink-400">Tool {key}</p><div className="max-h-80 overflow-auto">{Object.hasOwn(step.metadata || {},key)?<DataValue value={step.metadata[key]}/>:<p className="text-xs text-ink-400">Not recorded for this event.</p>}</div></div>)}</div>}</li>)}</ol>
    {!data.trace_available&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">This older exchange has no linked runtime trace. The recorded messages and tool names are shown above; missing inputs and outputs cannot be reconstructed.</p>}
    {!!interactions.length&&<details className="mt-5"><summary className="cursor-pointer text-xs font-semibold text-brand-700">Detailed runtime trace · {interactions.length} interactions</summary><div className="mt-3 space-y-3">{interactions.map(item=><InteractionCard key={item.key} item={item} onRun={onRun}/>)}</div></details>}
    </>}
  </section>;
}

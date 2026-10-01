import { useState } from "react";
import client from "../../api/client";
import { useAsync } from "../../hooks/useAsync";
import Button from "../common/Button";
import ErrorBanner from "../common/ErrorBanner";
import { Field, Input } from "../common/Input";
const load = signal => client.get("/university-admin/department-users/", {signal}).then(r=>r.data);
const empty = {name:"",email:"",password:"",departments:[]};
export default function DepartmentUsers({groups}) {
 const {data,error,refetch}=useAsync(load,[]);
 const [open,setOpen]=useState(false),[form,setForm]=useState(empty),[busy,setBusy]=useState(false),[failure,setFailure]=useState(null);
 async function submit(e){e.preventDefault();setBusy(true);setFailure(null);try{await client.post("/university-admin/department-users/",form);setForm(empty);setOpen(false);refetch();}catch(err){setFailure(err);}finally{setBusy(false);}}
 return <section className="rounded-2xl border border-ink-200 bg-white p-6">
 <div className="flex flex-wrap justify-between gap-4"><div><h2 className="text-xl font-semibold text-ink-900">Department users</h2><p className="mt-2 text-sm text-ink-500">Colleagues can sign in and answer only their assigned departments’ queries.</p></div><Button onClick={()=>setOpen(!open)}>{open?"Cancel":"Create user"}</Button></div>
 {error&&<ErrorBanner error={error} onRetry={refetch}/>}
 {open&&<form onSubmit={submit} className="mt-6 space-y-5 border-t border-ink-100 pt-5">{failure&&<ErrorBanner error={failure}/>}
 <div className="grid gap-4 sm:grid-cols-2">{[["name","Full name","text"],["email","Email","email"],["password","Password","password"]].map(([key,label,type])=><Field key={key} label={label} required><Input required type={type} autoComplete={key==="password"?"new-password":"off"} maxLength={key==="email"?254:128} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></Field>)}</div>
 <fieldset><legend className="mb-3 text-sm font-semibold">Assigned departments</legend><div className="grid gap-3 sm:grid-cols-2">{groups.map(g=><label key={g.slug} className="flex items-center gap-3 rounded-xl border border-ink-200 p-3 text-sm"><input type="checkbox" checked={form.departments.includes(g.slug)} onChange={e=>setForm({...form,departments:e.target.checked?[...form.departments,g.slug]:form.departments.filter(x=>x!==g.slug)})}/>{g.label}</label>)}</div></fieldset>
 <p className="text-xs text-ink-500">Two-factor setup is required on first sign-in.</p><Button type="submit" loading={busy} disabled={!form.departments.length}>Create department user</Button></form>}
 <div className="mt-6 divide-y divide-ink-100">{data?.users.map(u=><div key={u.id} className="flex flex-wrap justify-between gap-3 py-4"><div><p className="font-semibold">{u.name}</p><p className="text-sm text-ink-500">{u.email}</p></div><div className="flex flex-wrap items-center gap-2">{u.departments.map(slug=><span key={slug} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">{groups.find(g=>g.slug===slug)?.label||slug}</span>)}</div></div>)}{data?.users.length===0&&<p className="text-sm text-ink-500">No department users yet.</p>}</div></section>;
}

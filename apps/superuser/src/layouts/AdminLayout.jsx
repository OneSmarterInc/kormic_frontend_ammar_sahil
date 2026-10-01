import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { Building2, ClipboardList, ChevronLeft, GraduationCap, History, Landmark, LayoutDashboard, Settings, ShieldCheck, Sparkles, TrendingUp, UsersRound, RefreshCw } from "lucide-react";
import TopBar from "../components/layout/TopBar";

const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [{ to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "MANAGE",
    items: [
      { to: "/admin/students", label: "Students", icon: GraduationCap },
      { to: "/admin/universities", label: "Universities", icon: Building2 },
      { to: '/admin/update-information', label: 'University research', icon: RefreshCw },
      { to: "/admin/institutes", label: "Institutes", icon: Landmark },
      { to: "/admin/roster-students", label: "Roster Students", icon: ClipboardList },
      { to: "/admin/users", label: "Users & Access", icon: UsersRound },
    ],
  },
  {
    label: "INSIGHTS",
    items: [{ to: "/admin/metrics/escalations", label: "Escalation Metrics", icon: TrendingUp }],
  },
  {
    label: "MONITORING",
    items: [
      { to: "/admin/audit-log", label: "Audit Log", icon: History },
      { to: "/admin/agent-telemetry", label: "Agent Telemetry", icon: Sparkles },
    ],
  },
];

export default function AdminLayout() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('kormic.admin.sidebar.collapsed') === 'true'; } catch { return false; } });
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = useRef(null);
  const toggle = useRef(null);
  const location = useLocation();
  const open = desktop ? !collapsed : mobileOpen;
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const change = () => { setDesktop(media.matches); setMobileOpen(false); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { try { localStorage.setItem('kormic.admin.sidebar.collapsed', String(collapsed)); } catch {} }, [collapsed]);
  useEffect(() => {
    if (desktop || !mobileOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar.current.querySelector('button').focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); }
      if (event.key === 'Tab') {
        const items = sidebar.current.querySelectorAll('a[href], button');
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [desktop, mobileOpen]);
  const toggleSidebar = () => desktop ? setCollapsed(value => !value) : setMobileOpen(value => !value);
  const closeSidebar = () => { desktop ? setCollapsed(true) : setMobileOpen(false); toggle.current?.focus(); };
  return <div className="min-h-screen bg-ink-50">
    <div inert={!desktop && mobileOpen ? true : undefined}>
      <TopBar sidebarOpen={open} desktop={desktop} onToggleSidebar={toggleSidebar} toggleRef={toggle} />
      <main className={clsx('min-w-0 transition-[margin] duration-200 motion-reduce:transition-none', desktop && open && 'ml-72')}>
        <div className="mx-auto max-w-[1650px] px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div role="status" className="rounded-xl border border-ink-200 bg-white p-8 text-ink-600">Loading pageâ€¦</div>}><Outlet /></Suspense>
        </div>
      </main>
    </div>
    {!desktop && open && <button tabIndex={-1} aria-label="Close navigation backdrop" onClick={closeSidebar} className="fixed inset-0 z-40 bg-ink-900/50" />}
    <aside ref={sidebar} id="admin-navigation" aria-label="Admin navigation" role={desktop ? undefined : 'dialog'} aria-modal={!desktop && open ? true : undefined} aria-hidden={!open} inert={!open ? true : undefined}
      className={clsx('fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#08142F] text-white transition-transform duration-200 motion-reduce:transition-none', !open && '-translate-x-full')}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <span className="flex items-center gap-3 text-xl font-semibold"><ShieldCheck className="h-8 w-8" />Kormic</span>
        <button onClick={closeSidebar} aria-label="Close navigation" className="rounded-lg p-2 text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft size={20} /></button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {NAV_GROUPS.map(group => <div key={group.label}><p className="mb-2 px-3 text-xs font-semibold tracking-wider text-slate-300">{group.label}</p>{group.items.map(item => <NavItem key={item.to} item={item} />)}</div>)}
      </nav>
      <div className="border-t border-white/10 p-3"><NavItem item={{to:'/admin/settings', label:'Settings', icon:Settings}} /></div>
    </aside>
  </div>;
}
function NavItem({item}) {
  return <NavLink to={item.to} className={({isActive}) => clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-white', isActive ? 'bg-brand-600 text-white' : 'text-slate-200 hover:bg-white/10')}><item.icon className="h-5 w-5 shrink-0" /><span>{item.label}</span></NavLink>;
}

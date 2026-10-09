import { Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import clsx from "clsx";
import { Building2, ClipboardList, ChevronLeft, GraduationCap, History, Landmark, LayoutDashboard, Settings, ShieldCheck, BookOpenCheck, Bot, Compass, Globe, MessagesSquare, Split, Users, Sparkles, TrendingUp, UsersRound, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/universityAdminApi";
import { useAsync } from "../hooks/useAsync";
import TopBar from "../components/layout/TopBar";

const NAV_GROUPS = [
  {
    label: "SETUP",
    items: [
      {
        to: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
      },
      {
        to: "settings/profile",
        label: "University Profile",
        icon: Compass,
      },
      {
        to: "information",
        label: "University Information",
        icon: BookOpenCheck,
      },
      {
        to: "settings/sources",
        label: "Knowledge Sources",
        icon: Globe,
      },
      {
        to: "settings/knowledge-base",
        label: "Knowledge Base",
        icon: Sparkles,
      },
      {
        to: "settings/knowledge-groups",
        label: "Knowledge Groups",
        icon: Split,
      },
      {
        to: "settings/agent-preview",
        label: "Assistant Chat",
        icon: Bot,
      },
    ],
  },

  {
    label: "ACTIONS",
    items: [
      {
        to: "profiles",
        label: "Student Profiles",
        icon: Users,
      },

      {
        to: "agent-queries",
        label: "Queries",
        icon: Bot,
      },


      {
        to: "knowledge",
        label: "Verified Knowledge",
        icon: BookOpenCheck,
      },

      // {
      //   to: "questions",
      //   label: "Question Log",
      //   icon: History,
      // },
    ],
  },
];

export default function UniversityLayout() {
  const { user } = useAuth();
  const location = useLocation();
  if (user.role === "department") {
    if (!location.pathname.endsWith("/agent-queries")) return <Navigate to={`/university/${user.university_id}/agent-queries?tab=departments`} replace />;
    return <><TopBar organizationName={user.university_name} /><main className="p-4 sm:p-8"><Suspense fallback={<p>Loading queries…</p>}><Outlet /></Suspense></main></>;
  }
  return <UniversityAdminLayout />;
}

function UniversityAdminLayout() {
  const { user } = useAuth();
  const profileState = useAsync(getProfile, [user.university_id]);
  const groups = NAV_GROUPS.map(group => ({...group, items: group.items.map(item => ({...item, to: `/university/${user.university_id}/${item.to}`}))}));
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('kormic.university.sidebar.collapsed') === 'true'; } catch { return false; } });
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
  useEffect(() => { try { localStorage.setItem('kormic.university.sidebar.collapsed', String(collapsed)); } catch {} }, [collapsed]);
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
      <TopBar sidebarOpen={open} desktop={desktop} onToggleSidebar={toggleSidebar} toggleRef={toggle} organizationName={profileState.data?.name} />
      <main className={clsx('min-w-0 transition-[margin] duration-200 motion-reduce:transition-none', desktop && open && 'ml-72')}>
        <div className="mx-auto max-w-[1650px] px-4 py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div role="status" className="rounded-xl border border-ink-200 bg-white p-8 text-ink-600">Loading pageâ€¦</div>}><Outlet context={profileState} /></Suspense>
        </div>
      </main>
    </div>
    {!desktop && open && <button tabIndex={-1} aria-label="Close navigation backdrop" onClick={closeSidebar} className="fixed inset-0 z-40 bg-ink-900/50" />}
    <aside ref={sidebar} id="university-navigation" aria-label="University navigation" role={desktop ? undefined : 'dialog'} aria-modal={!desktop && open ? true : undefined} aria-hidden={!open} inert={!open ? true : undefined}
      className={clsx('fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#08142F] text-white transition-transform duration-200 motion-reduce:transition-none', !open && '-translate-x-full')}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <span className="flex items-center gap-3 text-xl font-semibold"><ShieldCheck className="h-8 w-8" />Kormic</span>
        <button onClick={closeSidebar} aria-label="Close navigation" className="rounded-lg p-2 text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"><ChevronLeft size={20} /></button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map(group => <div key={group.label}><p className="mb-2 px-3 text-xs font-semibold tracking-wider text-slate-300">{group.label}</p>{group.items.map(item => <NavItem key={item.to} item={item} />)}</div>)}
      </nav>
    </aside>
  </div>;
}
function NavItem({item}) {
  return <NavLink to={item.to} className={({isActive}) => clsx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-white', isActive ? 'bg-brand-600 text-white' : 'text-slate-200 hover:bg-white/10')}><item.icon className="h-5 w-5 shrink-0" /><span>{item.label}</span></NavLink>;
}

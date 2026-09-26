import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  ClipboardList,
  ChevronLeft,
  GraduationCap,
  HelpCircle,
  History,
  Landmark,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UsersRound,
  RefreshCw,
} from "lucide-react";

import TopBar from "../components/layout/TopBar";
import Badge, { roleTone } from "../components/common/Badge";
import { useAuth } from "../context/AuthContext";

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
      { to: '/admin/update-information', label: 'Update information', icon: RefreshCw },
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
    label: "SECURITY",
    items: [
      { to: "/admin/audit-log", label: "Audit Log", icon: History },
      { to: "/admin/agent-telemetry", label: "Agent Telemetry", icon: Sparkles },
    ],
  },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const allItems = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-ink-50">
      <TopBar />

      {/* Sidebar */}
      <aside
        className="
          fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-white/10
          bg-[#08142F] text-white lg:flex lg:flex-col
        "
      >
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-[22px] font-semibold tracking-tight text-white">Kormic</span>
          </div>
          <ChevronLeft className="h-5 w-5 cursor-pointer text-white/70" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-8">
              <p className="mb-3 px-2 text-xs font-semibold tracking-[0.12em] text-white/50">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-5 py-6 space-y-1">
          <NavItem item={{ to: "/admin/settings", label: "Settings", icon: Settings }} />
          <BottomItem icon={HelpCircle} label="Help & Support" />
        </div>
      </aside>

      {/* Main */}
      <main className="ml-0 lg:ml-72">
        <div className="w-full px-8 pt-2 pb-4">
          <MobileAdminBar user={user} allItems={allItems} />
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
          isActive ? "bg-brand-600 text-white shadow-lg" : "text-white/75 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
      <span>{item.label}</span>
    </NavLink>
  );
}

function BottomItem({ icon: Icon, label }) {
  return (
    <button
      className="
        group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium
        text-white/75 transition-all duration-300 hover:bg-white/10 hover:text-white
      "
    >
      <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
      {label}
    </button>
  );
}

function SignedInAs({ user }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium text-ink-400">Signed in as</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{user.name}</p>
      <p className="truncate text-xs text-ink-500">{user.email}</p>
      <Badge tone={roleTone(user.role)} className="mt-2 capitalize">
        <Sparkles className="h-3 w-3" />
        {user.role}
      </Badge>
    </div>
  );
}

function MobileAdminBar({ user, allItems }) {
  return (
    <div className="mb-6 lg:hidden">
      <SignedInAs user={user} />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {allItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all",
                isActive ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-600"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

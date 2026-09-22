import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import {
  BookOpenCheck,
  Bot,
  Compass,
  Globe,
  History,
  LayoutDashboard,
  MessagesSquare,
  Sparkles,
  Split,
  Users,
  HelpCircle,
} from "lucide-react";

import TopBar from "../components/layout/TopBar";
import Badge from "../components/common/Badge";
import { useAuth } from "../context/AuthContext";
import { getProfile } from "../api/universityAdminApi";
import { useAsync } from "../hooks/useAsync";
import { setupPercent } from "../lib/university";

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
        to: "queries",
        label: "Escalated Queries",
        icon: MessagesSquare,
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

  const activeUniversityId = user.university_id;

  const { data: profile } = useAsync(
    getProfile,
    [activeUniversityId]
  );

  return (
    <div className="min-h-screen bg-ink-50">

      {/* Header */}

      <TopBar universityName={profile?.name} withSidebar />

      {/* Sidebar */}

      <aside
        className="
          fixed
          left-0
          top-0
          z-40
          hidden
          h-screen
          w-64
          border-r
          border-white/10
          bg-[#08142F]
          text-white
          lg:flex
          lg:flex-col
        "
      >

        {/* Logo */}

        <div
          className="
            flex
            h-[72px]
            items-center
            justify-between
            border-b
            border-white/10
            px-6
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="


                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-brand-600
              "
            >
              <Sparkles className="h-6 w-6 text-white" />
            </div>

            <span
                className="
                    text-[22px]
                    font-semibold
                    tracking-tight
                    text-white
                "
            >
                Kormic
            </span>

          </div>

          
        </div>

        {/* Navigation */}

        <div className="flex-1 overflow-y-auto px-5 py-6">

          {NAV_GROUPS.map((group) => (

            <div
              key={group.label}
              className="mb-8"
            >

              <p
                className="
                  mb-3
                  px-2
                  text-xs
                  font-semibold
                  tracking-[0.12em]
                  text-white/50
                "
              >
                {group.label}
              </p>

              <div className="space-y-1">

                {group.items.map((item) => (

                  <NavItem
                    key={item.to}
                    item={item}
                    activeUniversityId={activeUniversityId}
                  />

                ))}

              </div>

            </div>

          ))}

        </div>

        {/* Bottom */}

        <div
          className="
            border-t
            border-white/10
            px-5
            py-6
            space-y-1
          "
        >

          <BottomItem
            icon={HelpCircle}
            label="Help & Support"
            disabled
          />

        </div>

      </aside>

      {/* Main */}

      <main
        className="
          ml-0
          pt-12
          lg:ml-64
          min-h-screen
        "
      >

        <div
          className="
            
            w-full
            px-3
            pt-3
            pb-4
          "

        >

          <MobileUniversityBar
            activeUniversityId={activeUniversityId}
            user={user}
            profile={profile}
          />

          <Outlet />

        </div>

      </main>

    </div>
  );
}

function NavItem({ item, activeUniversityId }) {
  return (
    <NavLink
      to={`/university/${activeUniversityId}/${item.to}`}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
          isActive
            ? "bg-brand-600 text-white shadow-lg"
            : "text-white/75 hover:bg-white/10 hover:text-white"
        )
      }
    >
      <item.icon
        className="
          h-5
          w-5
          shrink-0
          transition-transform
          duration-300
          group-hover:scale-110
        "
      />

      <span>{item.label}</span>
    </NavLink>
  );
}
function BottomItem({ icon: Icon, label, to, disabled }) {
  const content = (
    <>
      <Icon
        className="
          h-5
          w-5
          transition-transform
          duration-300
          group-hover:scale-110
        "
      />

      {label}
    </>
  );

  if (disabled) {
    return (
      <div
        title="Coming soon"
        className="
          group
          flex
          w-full
          cursor-not-allowed
          items-center
          gap-4
          rounded-xl
          px-4
          py-3
          text-sm
          font-medium
          text-white/30
        "
      >
        {content}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      className="
        group
        flex
        w-full
        items-center
        gap-4
        rounded-xl
        px-4
        py-3
        text-sm
        font-medium
        text-white/75
        transition-all
        duration-300
        hover:bg-white/10
        hover:text-white
      "
    >
      {content}
    </NavLink>
  );
}
function SignedInAs({ user, profile, activeUniversityId }) {
  const percent = setupPercent(profile);
  return (
    <div
     className="
     rounded-2xl
     border
     border-ink-200
     bg-white
     p-7
     shadow-sm

     transition-all
     duration-300

     hover:shadow-lg
     "
     >
      <p className="text-xs font-medium text-ink-400">Signed in as</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink-900">{user.name}</p>
      {user.email && (
        <p className="truncate text-xs text-ink-500">{user.email}</p>
      )}
      <p className="mt-1 truncate text-xs text-ink-500">{profile?.name || activeUniversityId}</p>
      {profile?.agent_name && (
        <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-brand-600">
          <Sparkles className="h-3 w-3 shrink-0" />
          Agent: {profile.agent_name}
        </p>
      )}
      {profile && (
        <NavLink
          to={`/university/${activeUniversityId}/dashboard`}
          className="
          mt-4
          flex
          items-center
          justify-between
          gap-2
          rounded-xl
          bg-ink-50
          px-3
          py-2
          text-xs

          transition-all
          duration-300

          hover:bg-brand-50
          hover:shadow-sm
          "
        >
          <span className="text-ink-500">Setup progress</span>
          <Badge tone={percent === 100 ? "success" : "brand"}>{percent}%</Badge>
        </NavLink>
      )}
    </div>
  );
}

function MobileUniversityBar({
  activeUniversityId,
  user,
  profile,
}) {
  const allItems = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <div className="mb-6 lg:hidden">

      <SignedInAs
        user={user}
        profile={profile}
        activeUniversityId={activeUniversityId}
      />

      <div
        className="
          mt-4
          flex
          gap-2
          overflow-x-auto
          pb-2
        "
      >
        {allItems.map((item) => (
          <NavLink
            key={item.to}
            to={`/university/${activeUniversityId}/${item.to}`}
            className={({ isActive }) =>
              clsx(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all",
                isActive
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 bg-white text-ink-600"
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
import { Link, useParams } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  History,
  MessagesSquare,
  Rocket,
  Sparkles,
  Users,
  ArrowRight,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import { getProfile, getKnowledgeSections } from "../../api/universityAdminApi";
import { listActiveQueries, listUniversityProfiles } from "../../api/universityApi";
import { useAsync } from "../../hooks/useAsync";
import { SETUP_STEPS, setupPercent } from "../../lib/university";
import { formatDateTime } from "../../lib/text";

const QUICK_LINKS = [
  {
    to: "profiles",
    label: "Student Profiles",
    description: "Browse applicant profiles.",
    icon: Users,
  },
  {
    to: "queries",
    label: "Escalated Queries",
    description: "Answer what the agent couldn't.",
    icon: MessagesSquare,
  },
  {
    to: "knowledge",
    label: "Verified Knowledge",
    description: "Answers resolved from escalations.",
    icon: BookOpenCheck,
  },
  // {
  //   to: "questions",
  //   label: "Question Log",
  //   description: "Everything students have asked.",
  //   icon: History,
  // },
];

export default function DashboardPage() {
  const { universityId } = useParams();

  const {
    data: profile,
    loading,
    error,
    refetch,
  } = useAsync(getProfile, [universityId]);

  const { data: sectionsData } = useAsync(getKnowledgeSections, [universityId]);
  const { data: queriesData } = useAsync(
    (signal) => listActiveQueries(universityId, signal),
    [universityId]
  );
  const { data: profilesData } = useAsync(
    (signal) => listUniversityProfiles(universityId, signal),
    [universityId]
  );

  const percent = setupPercent(profile);
  const complete = profile?.setup_status?.setup_complete;

  const knowledgeFactCount = (sectionsData?.sections || []).reduce((sum, s) => sum + s.count, 0);
  const pendingCount = queriesData?.queries?.length ?? 0;
  const profileCount = profilesData?.profiles?.length ?? 0;

  const stats = [
    {
      title: "Setup Complete",
      value: `${percent}%`,
      subtitle: complete ? "Fully briefed" : "Finish the checklist below",
      color: "blue",
      icon: Rocket,
      to: "settings/profile",
    },
    {
      title: "Knowledge Facts",
      value: String(knowledgeFactCount),
      subtitle: "View knowledge base",
      color: "green",
      icon: BookOpenCheck,
      to: "settings/knowledge-base",
    },
    {
      title: "Pending Tasks",
      value: String(pendingCount),
      subtitle: "View tasks",
      color: "orange",
      icon: CircleDashed,
      to: "queries",
    },
    {
      title: "Student Profiles",
      value: String(profileCount),
      subtitle: "View all",
      color: "purple",
      icon: Users,
      to: "profiles",
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-ink-900">
            Good morning, {profile?.name || "University"} 👋
          </h1>
          <p className="mt-3 text-lg text-ink-500">
            Manage your university AI assistant and monitor setup progress.
          </p>
        </div>

        <Card className="px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-ink-500" />
            <div>
              <p className="text-[13px] text-ink-500">Last Updated</p>
              <p className="font-semibold text-ink-900">
                {formatDateTime(profile?.updated_at)}
              </p>
            </div>
          </div>
        </Card>
      </div> */}

      {loading ? (
        <Spinner label="Loading dashboard..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : !profile ? (
        <ErrorBanner
          error="We couldn't load your profile. Please refresh the page."
          onDismiss={refetch}
        />
      ) : (
        <>
          {/* ================= HERO CARD ================= */}
          {/* ================= HERO CARD ================= */}

         <Card className="overflow-hidden rounded-xl shadow-sm ">

           <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 px-5 py-2 text-white">

             <div className="grid items-center gap-2 lg:grid-cols-[1.2fr_auto_auto]">

      {/* LEFT */}

               <div className="flex items-center gap-3">

                 <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15">
                   <Sparkles className="h-5 w-5" />
                 </div>

                 <div>

                   <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                     YOUR AI ASSISTANT
                   </p>

                   <h2 className="mt-0.5 text-2xl font-bold leading-none">
                     {profile.agent_name}
                   </h2>

                   <p className="mt-1 text-sm text-white/80">
                     {profile.name}
                   </p>

                   <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">

                     <span className="flex items-center gap-1.5">

                       <span
                         className={`h-2 w-2 rounded-full ${
                           complete ? "bg-green-400" : "bg-amber-300"
                         }`}
                       />

                       {complete ? "Active" : "Setup incomplete"}

                     </span>

                     <span className="text-white/60">

                       Updated {formatDateTime(profile.updated_at)}

                     </span>

                   </div>
         
                 </div>

               </div>

      {/* CENTER */}

               <div className="flex justify-center">

                 <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white/20">

                   <div
                     className="absolute inset-0 rounded-full"
                              style={{
                       background: `conic-gradient(white ${percent * 3.6}deg, rgba(255,255,255,.15) 0deg)`,
                     }}
                   />

                   <div className="absolute inset-2 rounded-full bg-brand-700" />

                   <div className="relative text-center">

                     <p className="text-base font-bold">
                       {percent}%
                     </p>

                     <p className="text-[11px] text-white/80">
                       Setup
                     </p>

                   </div>

                 </div>

               </div>

      {/* RIGHT */}

               {/* RIGHT */}

             <div className="flex h-full items-center justify-center">
               <Link
                 to={`/university/${universityId}/settings/profile`}
                 className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-white px-3 text-xs font-medium text-brand-700 shadow-sm transition hover:bg-gray-100"
               >
                 <ArrowRight className="h-3 w-3" />
                 {complete ? "View Profiles" : "Continue Setup"}
               </Link>
             </div>

             </div>

           </div>

         </Card>

          {/* ================= QUICK STATS ================= */}
          {/* ================= QUICK STATS ================= */}

           <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
             {stats.map((stat) => {
               const Icon = stat.icon;

               const colorStyles = {
                 blue: {
                   bg: "bg-blue-50",
                   text: "text-blue-600",
                 },
                 green: {
                   bg: "bg-green-50",
                   text: "text-green-600",
                 },
                 orange: {
                   bg: "bg-orange-50",
                   text: "text-orange-600",
                 },
                 purple: {
                              bg: "bg-purple-50",
                   text: "text-purple-600",
                            },
                          };

               const style = colorStyles[stat.color];

               return (
                 <Link key={stat.title} to={`/university/${universityId}/${stat.to}`}>
                   <Card className="h-full rounded-xl p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">

                     <div className="flex items-center gap-3">

                       <div
                         className={`flex h-9 w-9 items-center justify-center rounded-lg ${style.bg}`}
                       >
                         <Icon className={`h-5 w-5 ${style.text}`} />
                       </div>

                       <div className="min-w-0 flex-1">

                         <h3 className="text-xl font-bold leading-none text-ink-900">
                           {stat.value}
                         </h3>

                         <p className="mt-1 text-sm font-semibold text-ink-800">
                           {stat.title}
                         </p>

                         <p className={`mt-1 text-xs ${style.text}`}>
                           {stat.subtitle}
                         </p>

                       </div>

                     </div>

                   </Card>
                 </Link>
               );
             })}
           </div>

          {/* ================= SETUP CHECKLIST ================= */}

<Card className="overflow-hidden rounded-xl shadow-sm">

  <CardHeader
    icon={Rocket}
    title="Setup Checklist"
    subtitle={
      complete
        ? "Your AI assistant is fully configured."
        : "Complete the remaining setup steps."
    }
    action={
      <Badge
        tone={complete ? "success" : "warning"}
        className="px-3 py-1 text-xs"
      >
        {complete ? "Complete" : `${percent}%`}
      </Badge>
    }
  />

  <CardBody className="space-y-1">

    {SETUP_STEPS.map((step) => {

      const done = step.done(profile);

      return (

        <Link
          key={step.key}
          to={`/university/${universityId}/${step.to}`}
          className="group flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-2 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/20 hover:shadow-sm"
        >

          {/* LEFT */}

          <div className="flex items-start gap-2">

            <div>

              {done ? (

                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">

                  <CircleCheck className="h-4 w-4 text-green-600" />

                </div>

              ) : (

                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed border-ink-300">

                  <CircleDashed className="h-4 w-4 text-ink-400" />

                </div>

              )}

            </div>

            <div>

              <h3
                className={`text-sm font-semibold ${
                  done
                    ? "text-ink-400 line-through"
                    : "text-ink-900"
                }`}
              >
                {step.label}
              </h3>

              <p className="mt-0.5 text-xs leading-4 text-ink-500">
                {step.hint}
              </p>

            </div>

          </div>

          {/* RIGHT */}

          <Badge
            tone={done ? "success" : "neutral"}
            className="min-w-[72px] justify-center px-3 py-1 text-xs"
          >
            {done ? "Done" : "To Do"}
          </Badge>

        </Link>

      );

    })}

  </CardBody>

</Card>

   
        </>
      )}
    </div>
  );
}

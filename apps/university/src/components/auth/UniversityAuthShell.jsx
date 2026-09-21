import { Link } from "react-router-dom";
import { CheckCircle2, LayoutDashboard, Sparkles } from "lucide-react";

const VALUE_PROPS = [
  {
    title: "Your own AI admissions agent",
    body: "A named, on-brand agent that answers applicant questions instantly, day or night.",
  },
  {
    title: "A knowledge base that builds itself",
    body: "Feed it your profile, your official pages, and one-off facts — it stays current with every edit.",
  },
  {
    title: "Nothing falls through the cracks",
    body: "Anything the agent can't answer confidently escalates straight to your team's queue.",
  },
];

/**
 * Split-screen shell shared by the university register/login pages — a distinct,
 * more premium identity for the officer-facing portal vs. the student auth pages.
 */
export default function UniversityAuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 px-10 py-12 text-white lg:flex lg:w-[46%] lg:flex-col lg:justify-between xl:w-2/5">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 85% 75%, rgba(255,255,255,0.25) 0, transparent 40%)",
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <Sparkles className="h-4 w-4" />
            </span>
            Kormic
          </Link>

          <span className="mt-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <LayoutDashboard className="h-3.5 w-3.5" />
            University Portal
          </span>
          <h1 className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight">
            Give every applicant an always-on admissions expert.
          </h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Kormic turns your program's own facts into a live AI agent — set up once, editable
            forever, no engineering required.
          </p>
        </div>

        <div className="relative mt-10 space-y-5">
          {VALUE_PROPS.map((item) => (
            <div key={item.title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-xs text-white/60">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2 font-semibold text-ink-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            Kormic
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <LayoutDashboard className="h-3.5 w-3.5" />
            University Portal
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
          {eyebrow && (
            <span className="mb-4 hidden items-center gap-1.5 self-start rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 lg:inline-flex">
              {eyebrow}
            </span>
          )}
          {title && <h2 className="text-xl font-semibold text-ink-900">{title}</h2>}
          {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
          <div className={title || subtitle ? "mt-6" : ""}>{children}</div>
        </div>
      </div>
    </div>
  );
}

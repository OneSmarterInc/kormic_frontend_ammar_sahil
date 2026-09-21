import { Link, Navigate } from "react-router-dom";
import { BookOpenCheck, MessagesSquare, Sparkles, Users } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../lib/constants";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Your own AI admissions agent",
    body: "Stand up a named, on-brand agent that answers applicant questions instantly, day or night.",
  },
  {
    icon: Users,
    title: "Review applicant profiles",
    body: "See every applicant's profile, chat with a presenter agent about their fit, and dig into the details.",
  },
  {
    icon: MessagesSquare,
    title: "Clear the escalated queue",
    body: "Anything the agent can't answer confidently lands in your team's queue, ready to resolve.",
  },
  {
    icon: BookOpenCheck,
    title: "A knowledge base that builds itself",
    body: "Feed it your program's facts, official pages, and one-off notes — it stays current with every edit.",
  },
];

export default function LandingPage() {
  const { status, user } = useAuth();

  if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white">
      <TopBar />
      <div className="mx-auto max-w-6xl px-6 pt-32 pb-20">
        <div className="text-center">
          <span
          className="
          mb-4
          inline-flex
          items-center
          gap-1.5
          rounded-full
        bg-brand-50
          px-3
          py-1
          text-xs
          font-medium
          text-brand-700

          transition-all
          duration-300

          hover:bg-brand-600
          hover:text-white
          hover:shadow-md
          cursor-default
          "
          >
            <Sparkles className="h-3.5 w-3.5" />
            Kormic University Portal
          </span>
          <h1
          className="
          text-3xl
          font-bold
          tracking-tight
          leading-tight
          text-ink-900
          sm:text-[44px]
              
          "
          >
            Give every applicant an always-on admissions expert.
          </h1>
          <p
          className="
          mx-auto
          mt-5
          max-w-2xl
          text-base
          leading-relaxed
          text-ink-500
          "
          >
            Stand up your program's AI admissions agent, feed it your facts, review applicant
            profiles, and clear the escalated-question queue — all from one dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {/* University registration is superuser-only — not offered from this frontend.
            <Link to="/register">
              <Button
                 size="lg"
                 className="
                      transition-all
                      duration-300
                      hover:scale-105
                      hover:shadow-lg
                  "
             >Register your university</Button>
            </Link>
            */}
            <Link to="/login">
              <Button
                   size="lg"
                   className="
                       transition-all
                       duration-300
                       hover:scale-105
                       hover:shadow-lg
                   "
               >
                Log in
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <Card
               key={feature.title}
               className="
                 group
                 h-full
                 p-6
                 cursor-pointer
                 transition-all
                 duration-300
                 hover:-translate-y-2
                 hover:shadow-xl
                 hover:border-brand-500
                 hover:bg-brand-50/30
               "
             >
              <span
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-brand-600
                  text-white
                  transition-all
                  duration-300
                  group-hover:scale-110
                  group-hover:rotate-3
              "
              >
                  <feature.icon className="h-5 w-5" />
              </span>
              <h2
                className="
                  mt-4
                  text-base
                  font-semibold
                  text-ink-900
                  transition-colors
                  duration-300
                  group-hover:text-brand-700
              "
              >{feature.title}</h2>
              <p
                  className="
                    mt-1.5
                    text-sm
                    text-ink-500
                    transition-colors
                    duration-300
                    group-hover:text-ink-700
                "
                >{feature.body}</p>
                <div
                  className="
                    mt-5
                    flex
                    items-center
                    text-sm
                    font-medium
                    text-brand-600
                    opacity-0
                    transition-all
                    duration-300
                    translate-x-0
                    group-hover:opacity-100
                    group-hover:translate-x-2
                  "
                >
                   Learn more →
                 </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Link, Navigate } from "react-router-dom";
import { Building2, GraduationCap, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../lib/constants";

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Manage every student",
    body: "Search, review, and manage every student account on the platform — profiles, onboarding, and full account purges.",
  },
  {
    icon: Building2,
    title: "Manage every university",
    body: "Create institutions, edit their profile and agent, and keep officer access tidy — all from one console.",
  },
  {
    icon: UsersRound,
    title: "Cross-role user access",
    body: "Activate, deactivate, or remove any account across students, universities, and fellow superusers.",
  },
  {
    icon: ShieldCheck,
    title: "TOTP-protected access",
    body: "Every superuser login is backed by two-factor authentication, with backup codes for recovery.",
  },
];

export default function LandingPage() {
  const { status, user } = useAuth();

  if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 via-white to-white">
      <TopBar />
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <span
            className="
              mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1
              text-xs font-medium text-brand-700 transition-all duration-300
              hover:bg-brand-600 hover:text-white hover:shadow-md cursor-default
            "
          >
            <Sparkles className="h-3.5 w-3.5" />
            Kormic Superuser Console
          </span>
          <h1 className="text-3xl font-bold tracking-tight leading-tight text-ink-900 sm:text-[44px]">
            Run the entire Kormic platform from one console.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-500">
            Manage every student and university account, control access across the whole
            platform, and keep the system healthy — all from a single admin dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link to="/login">
              <Button
                size="lg"
                className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                group h-full p-6 cursor-default transition-all duration-300
                hover:-translate-y-2 hover:shadow-xl hover:border-brand-500 hover:bg-brand-50/30
              "
            >
              <span
                className="
                  flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white
                  transition-all duration-300 group-hover:scale-110 group-hover:rotate-3
                "
              >
                <feature.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-ink-900 transition-colors duration-300 group-hover:text-brand-700">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm text-ink-500 transition-colors duration-300 group-hover:text-ink-700">
                {feature.body}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

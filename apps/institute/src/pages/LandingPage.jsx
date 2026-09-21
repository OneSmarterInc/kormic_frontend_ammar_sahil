import { Link, Navigate } from "react-router-dom";
import { FileSpreadsheet, Mail, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import TopBar from "../components/layout/TopBar";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../lib/constants";

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Upload student rosters",
    body: "Bulk-upload a CSV of your students and generate claimable invitations in seconds.",
  },
  {
    icon: Mail,
    title: "Send claim invites",
    body: "Email every unclaimed row a one-time link — students confirm and build their own profile from there.",
  },
  {
    icon: FileSpreadsheet,
    title: "Track claim status",
    body: "See exactly which students have claimed their invitation and which are still pending, per list.",
  },
  {
    icon: ShieldCheck,
    title: "TOTP-protected access",
    body: "Every institute login is backed by two-factor authentication, with backup codes for recovery.",
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
            Kormic Institute Portal
          </span>
          <h1 className="text-3xl font-bold tracking-tight leading-tight text-ink-900 sm:text-[44px]">
            Get your students onto Kormic in minutes.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-500">
            Upload your student roster, send claim invitations, and track who has joined —
            all from a single dashboard built for your institute.
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

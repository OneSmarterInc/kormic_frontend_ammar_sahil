import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import { listInstituteLists } from "../../api/instituteApi";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useAsync(
    () => listInstituteLists(user.institute_id).then((res) => res.lists || []),
    [user.institute_id]
  );

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <ErrorBanner error={error} onDismiss={refetch} />;

  const lists = data || [];
  const totalRows = lists.reduce((sum, l) => sum + (l.row_count || 0), 0);
  const totalClaimed = lists.reduce((sum, l) => sum + (l.claimed_count || 0), 0);
  const totalUnclaimed = lists.reduce((sum, l) => sum + (l.unclaimed_count || 0), 0);

  const stats = [
    {
      title: "Uploaded lists",
      value: lists.length,
      subtitle: "View all lists",
      color: "blue",
      icon: FileSpreadsheet,
      to: "/institute/lists",
    },
    {
      title: "Students on rosters",
      value: totalRows,
      subtitle: "Across every uploaded list",
      color: "purple",
      icon: Users,
      to: "/institute/lists",
    },
    {
      title: "Claimed invites",
      value: totalClaimed,
      subtitle: "Students who confirmed their profile",
      color: "green",
      icon: CheckCircle2,
      to: "/institute/lists",
    },
    {
      title: "Pending invites",
      value: totalUnclaimed,
      subtitle: "Not yet claimed",
      color: "orange",
      icon: Clock,
      to: "/institute/lists",
    },
  ];

  const colorStyles = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    green: { bg: "bg-green-50", text: "text-green-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
  };

  const recentLists = [...lists]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-[1650px] px-6 pt-3 pb-6 space-y-5">
      {/* HERO */}
      <Card className="overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 px-8 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Sparkles className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                  INSTITUTE PORTAL
                </p>
                <h1 className="mt-1 text-4xl font-bold">Welcome back, {user.name}</h1>
                <p className="mt-1 text-sm text-white/80">
                  Upload student rosters and track who has claimed their invitation.
                </p>
              </div>
            </div>
            <Link to="/institute/upload">
              <Button className="bg-black text-white hover:bg-black/90" icon={UploadCloud}>
                Upload a list
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const style = colorStyles[stat.color];
          return (
            <Link key={stat.title} to={stat.to}>
              <Card className="h-full rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                    <Icon className={`h-6 w-6 ${style.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-3xl font-bold leading-none text-ink-900">{stat.value}</h3>
                    <p className="mt-1 text-sm font-semibold text-ink-700">{stat.title}</p>
                    <p className={`mt-2 text-xs font-medium ${style.text}`}>{stat.subtitle}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent lists */}
      <Card>
        <CardHeader
          icon={FileSpreadsheet}
          title="Recently uploaded lists"
          subtitle={`${lists.length} list${lists.length === 1 ? "" : "s"} in total`}
          action={
            <Link to="/institute/lists" className="flex items-center gap-1 text-sm font-medium text-brand-600">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
        <CardBody className="space-y-2 p-3">
          {recentLists.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title="No lists uploaded yet"
              description="Upload your first student roster to start inviting students."
              action={
                <Link to="/institute/upload">
                  <Button icon={UploadCloud}>Upload a list</Button>
                </Link>
              }
            />
          ) : (
            recentLists.map((l) => (
              <Link
                key={l.list_id}
                to={`/institute/lists/${l.list_id}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">List #{l.list_id}</p>
                  <p className="truncate text-xs text-ink-500">
                    {l.contact_name} · {l.row_count} rows
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone="success">{l.claimed_count} claimed</Badge>
                  <Badge tone="warning">{l.unclaimed_count} pending</Badge>
                </div>
              </Link>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

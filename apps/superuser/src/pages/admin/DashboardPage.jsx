import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  UsersRound,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import { getDashboard } from "../../api/superuserApi";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useAsync(
    () => getDashboard(),
    []
  );

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <ErrorBanner error={error} onRetry={refetch} />;

  const { students, universities, counts } = data;
  const inactiveCount = counts.inactive_users;

  const stats = [
    {
      title: "Students",
      value: counts.students,
      subtitle: "View all students",
      color: "blue",
      icon: GraduationCap,
      to: "/admin/students",
    },
    {
      title: "Universities",
      value: counts.universities,
      subtitle: "View all universities",
      color: "green",
      icon: Building2,
      to: "/admin/universities",
    },
    {
      title: "Total Users",
      value: counts.users,
      subtitle: `${inactiveCount} deactivated`,
      color: "purple",
      icon: UsersRound,
      to: "/admin/users",
    },
  ];

  const colorStyles = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    green: { bg: "bg-green-50", text: "text-green-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
  };

  const recentStudents = [...students]
  .sort((a, b) => new Date(b.date_joined) - new Date(a.date_joined))
  .slice(0, 3);

const recentUniversities = [...universities].slice(0, 3);

return (
  <div className="mx-auto max-w-[1650px] pb-6 space-y-5">

    <header><p className="text-sm font-medium text-brand-700">Superuser console</p><h1 className="mt-1 text-2xl font-semibold text-ink-900">Welcome back, {user.name}</h1><p className="mt-2 text-sm text-ink-600">Manage students, institutions and account access.</p></header>

      {/* Stats */}
            {/* ========================= */}
      {/* Stats */}
      {/* ========================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">

        {stats.map((stat) => {

          const Icon = stat.icon;
          const style = colorStyles[stat.color];

          return (

            <Link
              key={stat.title}
              to={stat.to}
            >

              <Card className="h-full rounded-2xl border border-slate-200 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">

                <div className="flex items-center gap-4">

                  {/* Icon */}

                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.bg}`}
                  >
                    <Icon
                      className={`h-6 w-6 ${style.text}`}
                    />
                  </div>

                  {/* Text */}

                  <div className="min-w-0 flex-1">

                    <h3 className="text-3xl font-bold leading-none text-ink-900">
                      {stat.value}
                    </h3>

                    <p className="mt-1 text-sm font-semibold text-ink-700">
                      {stat.title}
                    </p>

                    <p
                      className={`mt-2 text-xs font-medium ${style.text}`}
                    >
                      {stat.subtitle}
                    </p>

                  </div>

                </div>

              </Card>

            </Link>

          );

        })}

      </div>

      {/* Recent activity */}
            {/* ======================================= */}
      {/* Recent Activity */}
      {/* ======================================= */}

      {/* Recent activity */}
<div className="grid gap-5 lg:grid-cols-2">

        {/* Students */}

        <Card className="h-full">
          <CardHeader
            icon={GraduationCap}
            title="Recently Joined Students"
            subtitle={`${counts.students} students in total`}
            action={
              <Link
                to="/admin/students"
                className="flex items-center gap-1 text-sm font-medium text-brand-600"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          <CardBody className="space-y-2 p-3">

            {recentStudents.length === 0 ? (

              <EmptyState
                icon={GraduationCap}
                title="No students yet"
              />

            ) : (

              recentStudents.map((s) => (

                <Link
                  key={s.student_id}
                  to={`/admin/students/${s.student_id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 transition hover:border-brand-300 hover:bg-brand-50"
                >

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-ink-900">
                      {s.name || s.email}
                    </p>

                    <p className="truncate text-xs text-ink-500">
                      {s.email}
                    </p>

                  </div>

                  <Badge
                    tone={s.is_active ? "success" : "danger"}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>

                </Link>

              ))

            )}

          </CardBody>

        </Card>
        

        {/* Universities */}

        <Card className="h-full">
          <CardHeader
            icon={Building2}
            title="Universities"
            subtitle={`${counts.universities} universities`}
            action={
              <Link
                to="/admin/universities"
                className="flex items-center gap-1 text-sm font-medium text-brand-600"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />

          <CardBody className="space-y-2 p-4">

            {recentUniversities.length === 0 ? (

              <EmptyState
                icon={Building2}
                title="No universities yet"
              />

            ) : (

              recentUniversities.map((u) => (

                <Link
                  key={u.id}
                  to={`/admin/universities/${u.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 transition hover:border-brand-300 hover:bg-brand-50"
                >

                  <div className="min-w-0">

                    <p className="truncate text-sm font-semibold text-ink-900">
                      {u.name}
                    </p>

                    <p className="truncate text-xs text-ink-500">
                      {u.agent_name}
                    </p>

                  </div>

                  <Badge
                    tone={
                      u.setup_status?.setup_complete
                        ? "success"
                        : "warning"
                    }
                  >
                    Setup: {u.setup_status?.completion_percentage ?? 0}%
                  </Badge>

                </Link>

              ))

            )}

          </CardBody>

        </Card>
        </div>

      </div>

    

  );

}
  

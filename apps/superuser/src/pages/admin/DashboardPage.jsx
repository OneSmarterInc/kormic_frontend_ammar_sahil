import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import { listStudents, listUniversities, listUsers } from "../../api/superuserApi";
import { useAsync } from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useAsync(
    () =>
      Promise.all([listStudents(), listUniversities(), listUsers()]).then(
        ([studentsRes, universitiesRes, usersRes]) => ({
          students: studentsRes.students || [],
          universities: universitiesRes.universities || [],
          users: usersRes.users || [],
        })
      ),
    []
  );

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <ErrorBanner error={error} onDismiss={refetch} />;

  const { students, universities, users } = data;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  const stats = [
    {
      title: "Students",
      value: students.length,
      subtitle: "View all students",
      color: "blue",
      icon: GraduationCap,
      to: "/admin/students",
    },
    {
      title: "Universities",
      value: universities.length,
      subtitle: "View all universities",
      color: "green",
      icon: Building2,
      to: "/admin/universities",
    },
    {
      title: "Total Users",
      value: users.length,
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
  <div className="mx-auto max-w-[1650px] px-6 pt-3 pb-6 space-y-5">

    {/* HERO */}

    <Card className="overflow-hidden rounded-2xl">

      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 px-8 py-4 text-white">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-5">

            {/* LOGO */}

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">

              {/* Replace with your logo */}

              <Sparkles className="h-8 w-8" />

            </div>

            <div>

              <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                SUPERUSER CONSOLE
              </p>

              <h1 className="mt-1 text-4xl font-bold">
                Welcome back, {user.name}
              </h1>

              <p className="mt-1 text-sm text-white/80">
                Full oversight of every student, university and admin account.
              </p>

            </div>

          </div>

        </div>

      </div>

    </Card>

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
            subtitle={`${students.length} students in total`}
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
            subtitle={`${universities.length} universities`}
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
                    {u.setup_status?.completion_percentage ?? 0}%
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
  

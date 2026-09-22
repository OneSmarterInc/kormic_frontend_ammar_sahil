import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserCheck, UserRoundX, UsersRound } from "lucide-react";

import { listInstitutes, listRosterStudents } from "../../api/superuserApi";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import EmptyState from "../../components/common/EmptyState";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import PageHeader from "../../components/layout/PageHeader";
import { useAsync } from "../../hooks/useAsync";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["unclaimed", "Unclaimed"],
  ["claimed", "Claimed"],
  ["revoked", "Revoked"],
  ["expired", "Expired"],
];

const ACCOUNT_OPTIONS = [
  ["", "All account states"],
  ["with_account", "Has login account"],
  ["without_account", "No login account"],
];

export default function RosterStudentsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [accountState, setAccountState] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: institutesData } = useAsync(() => listInstitutes(), []);
  const institutes = institutesData?.institutes || [];

  const { data, loading, error, refetch } = useAsync(
    () =>
      listRosterStudents({
        page,
        pageSize,
        search: debouncedSearch,
        status,
        instituteId,
        accountState,
      }),
    [page, debouncedSearch, status, instituteId, accountState]
  );

  const rows = data?.results || [];
  const pagination = data?.pagination || { page: 1, page_size: pageSize, total: 0, has_next: false };
  const summary = data?.summary || {};

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Roster Students"
        description="Every student row accepted from institute roster uploads, including people who have not created an account yet."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Roster rows" value={summary.total ?? "—"} icon={UsersRound} />
        <SummaryCard label="Claimed" value={summary.claimed ?? "—"} icon={UserCheck} />
        <SummaryCard label="Unclaimed" value={summary.unclaimed ?? "—"} icon={UserRoundX} />
      </div>

      <Card className="mb-5">
        <div className="grid gap-3 p-4 lg:grid-cols-[minmax(260px,1fr)_180px_220px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, program, institute..."
              className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <select
            value={status}
            onChange={updateFilter(setStatus)}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700"
          >
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={instituteId}
            onChange={updateFilter(setInstituteId)}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700"
          >
            <option value="">All institutes</option>
            {institutes.map((institute) => (
              <option key={institute.id} value={institute.id}>{institute.name}</option>
            ))}
          </select>

          <select
            value={accountState}
            onChange={updateFilter(setAccountState)}
            className="rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-700"
          >
            {ACCOUNT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading roster students..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={UsersRound} title="No roster students match this view" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Institute</th>
                  <th className="px-4 py-3 font-medium">Study</th>
                  <th className="px-4 py-3 font-medium">Roster status</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Uploaded</th>
                  <th className="px-4 py-3 font-medium text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{row.full_name || "—"}</p>
                      <p className="text-xs text-ink-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/institutes/${row.institute_id}`}
                        className="font-medium text-brand-600 hover:text-brand-700"
                      >
                        {row.institute_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-800">{row.program_name || row.field_of_study || "—"}</p>
                      <p className="text-xs text-ink-400">{row.degree_level || row.expected_graduation || ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === "claimed" ? "success" : row.status === "unclaimed" ? "neutral" : "danger"} className="capitalize">
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {row.account_user_id ? (
                        <Link to={`/admin/users/${row.account_user_id}`} className="block">
                          <Badge tone="brand">Login created</Badge>
                          <p className="mt-1 text-xs text-brand-600">Manage account</p>
                        </Link>
                      ) : (
                        <div>
                          <Badge tone="neutral">No login yet</Badge>
                          {row.status === "claimed" && (
                            <p className="mt-1 text-xs text-amber-600">Claimed; registration pending</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/institutes/${row.institute_id}/lists/${row.list_id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Roster #{row.list_id}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-ink-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500">
              Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1}
              {"–"}
              {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!pagination.has_next}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
          <p className="text-xl font-semibold text-ink-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

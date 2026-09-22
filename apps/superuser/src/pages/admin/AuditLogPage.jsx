import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  History,
  KeyRound,
  ShieldOff,
  Wifi,
  X,
  Filter,
} from "lucide-react";

import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge from "../../components/common/Badge";
import { Field, Input, Select } from "../../components/common/Input";
import { listAuditLog } from "../../api/superuserApi";
import { useAsync } from "../../hooks/useAsync";

const ACTIONS = [
  {
    key: "totp_removed",
    label: "2FA Removed",
    tone: "warning",
    icon: ShieldOff,
  },
  {
    key: "password_reset",
    label: "Password Reset",
    tone: "brand",
    icon: KeyRound,
  },
  {
    key: "sessions_revoked",
    label: "Sessions Revoked",
    tone: "danger",
    icon: Wifi,
  },
];

function actionMeta(action) {
  return (
    ACTIONS.find((a) => a.key === action) || {
      label: action,
      tone: "neutral",
      icon: History,
    }
  );
}

export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const email = searchParams.get("email") || "";
  const action = searchParams.get("action") || "";
  const limit = searchParams.get("limit") || "100";

  const [emailInput, setEmailInput] = useState(email);

  useEffect(() => {
    setEmailInput(email);
  }, [email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = emailInput.trim();

      if (trimmed === email) return;

      const next = new URLSearchParams(searchParams);

      if (trimmed) next.set("email", trimmed);
      else next.delete("email");

      setSearchParams(next);
    }, 300);

    return () => clearTimeout(timer);
  }, [emailInput]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) next.set(key, value);
    else next.delete(key);

    setSearchParams(next);
  };

  const {
    data,
    loading,
    error,
    refetch,
  } = useAsync(
    () =>
      listAuditLog({
        action: action || undefined,
        limit,
      }),
    [action, limit]
  );

  // The backend only filters by numeric user_id, which we don't expose in the
  // UI — filter the fetched page by actor/target email instead.
  const allEntries = data?.entries || [];
  const needle = email.trim().toLowerCase();
  const entries = needle
    ? allEntries.filter(
        (e) =>
          (e.actor_email || "").toLowerCase().includes(needle) ||
          (e.target_email || "").toLowerCase().includes(needle)
      )
    : allEntries;
  const hasFilters = Boolean(email || action);

  return (
    <div className="space-y-6">

      <PageHeader
        title="Audit log"
        description="Read-only trail of TOTP removals, password resets, and session revocations across every account."
      />

      {/* ========================= */}
      {/* FILTER CARD */}
      {/* ========================= */}

      <Card className="rounded-2xl border border-slate-200 shadow-sm">

        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">

          {/* Left */}

          <div className="grid flex-1 gap-5 md:grid-cols-3">

            <Field
              label="Email"
              hint="Matches actor or target, within the loaded limit"
            >
              <Input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. admin@university.edu"
              />
            </Field>

            <Field label="Action">
              <Select
                value={action}
                onChange={(e) =>
                  setParam("action", e.target.value)
                }
              >
                <option value="">
                  All actions
                </option>

                {ACTIONS.map((a) => (
                  <option
                    key={a.key}
                    value={a.key}
                  >
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Limit">
              <Select
                value={limit}
                onChange={(e) =>
                  setParam("limit", e.target.value)
                }
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
                <option value="500">500</option>
              </Select>
            </Field>

          </div>

          {/* Right */}

          <div className="flex items-center gap-3">

            {hasFilters && (
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}

            <button
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-700"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>

          </div>

        </div>

      </Card>

            {loading ? (
        <Spinner label="Loading audit log..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : entries.length === 0 ? (
        <Card className="rounded-2xl">
          <EmptyState
            icon={History}
            title="No audit entries found"
            description={
              hasFilters
                ? "Try clearing the filters."
                : "Security events will appear here automatically."
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full">

              {/* ====================== */}
              {/* TABLE HEADER */}
              {/* ====================== */}

              <thead className="border-b border-slate-200 bg-slate-50">

                <tr className="text-left">

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actor
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Target
                  </th>

                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    When
                  </th>

                </tr>

              </thead>

              {/* ====================== */}
              {/* TABLE BODY */}
              {/* ====================== */}

              <tbody className="divide-y divide-slate-100 bg-white">

                {entries.map((entry) => {

                  const meta = actionMeta(entry.action);

                  const Icon = meta.icon;

                  return (

                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-brand-50/30"
                    >

                      {/* ACTION */}

                      <td className="px-6 py-5">

                        <ActionBadge
                          label={meta.label}
                          tone={meta.tone}
                          Icon={Icon}
                        />

                      </td>

                      {/* ACTOR */}

                      <td className="px-6 py-5">

                        <div>

                          <p className="font-medium text-ink-900">
                            {entry.actor_email || "—"}
                          </p>

                        </div>

                      </td>

                      {/* TARGET */}

                      <td className="px-6 py-5">

                        <div>

                          <p className="font-medium text-ink-900">
                            {entry.target_email || "—"}
                          </p>

                        </div>

                      </td>

                      {/* DATE */}

                      <td className="whitespace-nowrap px-6 py-5 text-sm text-ink-500">

                        {formatDateTime(entry.created_at)}

                      </td>

                    </tr>

                  );

                })}

              </tbody>

            </table>

          </div>

        </Card>
      )}

      <p className="mt-4 text-xs text-ink-400">
        Emails are point-in-time snapshots — entries stay readable even after an account is deleted.{" "}
        <Link to="/admin/users" className="text-brand-600 hover:text-brand-700">
          Back to users
        </Link>
      </p>
    </div>
  );
}

/* ========================================================= */
/* ACTION BADGE */
/* ========================================================= */

function ActionBadge({ label, tone, Icon }) {
  const styles = {
    success:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",

    warning:
      "bg-amber-50 text-amber-700 border border-amber-200",

    danger:
      "bg-red-50 text-red-600 border border-red-200",

    brand:
      "bg-blue-50 text-blue-700 border border-blue-200",

    neutral:
      "bg-slate-100 text-slate-700 border border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        styles[tone] || styles.neutral
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/* ========================================================= */
/* FOOTER */
/* ========================================================= */

function AuditFooter() {
  return (
    <Card className="rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
            <History className="h-4 w-4 text-brand-600" />
          </div>

          <p className="text-sm text-ink-500">
            Emails are point-in-time snapshots. Entries remain readable even
            after an account has been deleted.
          </p>
        </div>

        <Link
          to="/admin/users"
          className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
        >
          Back to users →
        </Link>
      </div>
    </Card>
  );
}

/* ========================================================= */
/* DATE FORMATTER */
/* ========================================================= */

function formatDateTime(iso) {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
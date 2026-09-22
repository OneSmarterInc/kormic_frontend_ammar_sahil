import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Users, ArrowRight, Search } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import EmptyState from "../../components/common/EmptyState";
import Badge, { matchTierTone } from "../../components/common/Badge";
import { listUniversityProfiles } from "../../api/universityApi";
import { useAsync } from "../../hooks/useAsync";
import { previewText } from "../../lib/text";

export default function ProfilesListPage() {
  const { universityId } = useParams();

  const { data, loading, error, refetch } = useAsync(
    (signal) => listUniversityProfiles(universityId, signal),
    [universityId]
  );

  const profiles = data?.profiles || [];
  const [search, setSearch] = useState("");

  const filteredProfiles = profiles.filter((p) => {
    const query = search.toLowerCase();

    return (
      (p.name || "").toLowerCase().includes(query) ||
      (p.profile_id || "").toLowerCase().includes(query) ||
      (p.major || "").toLowerCase().includes(query) ||
      (p.institution || "").toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <PageHeader
        title="Interested Student"
        description="Students who have searched your university and expressed interest in your program."
      />

      <div className="mb-5 flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />

          <input
            type="text"
            placeholder="Search by name, ID, major or institution..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-10 pr-4 text-sm transition-all duration-300 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading profiles..." />
      ) : error ? (
        <ErrorBanner error={error} onDismiss={refetch} />
      ) : profiles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No profiles yet"
            description="Students haven't created profiles yet."
          />
        </Card>
      ) : filteredProfiles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No matching profiles"
            description="Try searching with another name, major, institution, or student ID."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredProfiles.map((p) => (
            <Link
              key={p.profile_id}
              to={`/university/${universityId}/profiles/${p.profile_id}`}
            >
              <Card className="h-full cursor-pointer p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white shadow-md ring-2 ring-brand-100">
                      {getInitials(p.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {p.name || p.profile_id}
                      </p>

                      <p className="truncate text-xs text-ink-500">
                        {p.major || "—"}
                        {p.institution ? ` · ${p.institution}` : ""}
                      </p>

                      {(p.student_email || p.email) && (
                        <p className="truncate text-[11px] text-ink-400">
                          {p.student_email || p.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <Badge tone={matchTierTone(p.match_tier)}>
                    {p.match_tier || "Unassessed"}
                  </Badge>
                </div>

                {(() => {
                  const stats = [
                    ["GPA", p.gpa],
                    ["GRE-Q", p.gre_quant],
                    ["TOEFL", p.toefl],
                  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

                  return (
                    stats.length > 0 && (
                      <dl className="mt-3 grid grid-cols-3 gap-2">
                        {stats.map(([label, value]) => (
                          <Stat key={label} label={label} value={value} />
                        ))}
                      </dl>
                    )
                  );
                })()}

                {previewText(p.ai_summary || p.summary) && (
                  <p className="mt-3 line-clamp-1 text-xs leading-relaxed text-ink-500">
                    {previewText(p.ai_summary || p.summary, 90)}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end border-t border-ink-100 pt-3">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                    View
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getInitials(name) {
  if (!name) return "?";

  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50 p-1.5 text-center">
      <dt className="text-[9px] uppercase tracking-wide text-ink-400">
        {label}
      </dt>

      <dd className="mt-0.5 text-xs font-semibold text-ink-800">
        {value ?? "—"}
      </dd>
    </div>
  );
}
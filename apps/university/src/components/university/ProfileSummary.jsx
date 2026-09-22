import { FileQuestion, UserRound } from "lucide-react";
import EmptyState from "../common/EmptyState";
import Badge, { matchTierTone } from "../common/Badge";
import Spinner from "../common/Spinner";
import { previewText } from "../../lib/text";
import { getProfileImage } from "../../api/profileApi";
import { useBlobUrl } from "../../hooks/useAsync";

function pick(obj, ...paths) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce((o, k) => (o == null ? undefined : o[k]), obj);

    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatAiSummary(summary) {
  if (!summary) return [];

  let text = String(summary).replace(/\s+/g, " ").trim();

  const labels = [
    "Student Profile Summary",
    "Name",
    "Student ID",
    "GPA",
    "GRE Quant",
    "TOEFL/IELTS",
    "Budget",
    "Target Country",
    "Preferred Specialization",
    "Conversation Insights",
    "University Assessments",
  ];

  labels.forEach((label) => {
    const regex = new RegExp(`\\s*(${escapeRegex(label)}\\s*:)`, "gi");
    text = text.replace(regex, "\n$1");
  });

  text = text.replace(/^Student Profile Summary\s*/i, "Student Profile Summary\n");

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const STAT_FIELDS = [
  [["profile.institution", "institution"], "Institution"],
  [["profile.major", "major"], "Major"],
  [["profile.program", "target_degree"], "Program"],
  [["profile.graduation_year", "graduation_year"], "Grad. year"],
  [["profile.gpa", "gpa"], "GPA"],
  [["test_scores.gre_quant", "gre_quant"], "GRE Quant"],
  [["test_scores.toefl", "toefl"], "TOEFL"],
  [["financials.budget", "budget"], "Budget"],
];

export default function ProfileSummary({ profile }) {
  const studentId = profile?.student_id || profile?.profile_id;

  const { url: imageUrl, loading: imageLoading } = useBlobUrl(
    () =>
      getProfileImage(studentId).catch((err) => {
        if (err.status === 404) return null;
        throw err;
      }),
    [studentId],
    { enabled: !!studentId }
  );

  if (!profile) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="No profile yet"
        description="No profile has been created for this student ID yet."
      />
    );
  }

  const name = pick(profile, "profile.name", "name") || studentId;
  const email = pick(profile, "student_email", "profile.student_email", "profile.email", "email");
  const skills =
    pick(profile, "skills.all_skills") ||
    profile.skills ||
    profile.technical_skills ||
    [];

  const assessments = profile.assessments || {};
  const projects = profile.projects || [];
  const gaps = profile.gaps || [];
  const targetDisciplines = pick(profile, "career.target_disciplines") || [];
  const overallScore = pick(
    profile,
    "profile_scoring.overall_profile_score",
    "overall_profile_score"
  );
  const aiSummary = pick(profile, "profile_scoring.ai_summary", "ai_summary", "summary");
  const aiSummaryLines = formatAiSummary(aiSummary);
  const workSummary = pick(profile, "work_experience.summary");
  const researchText = pick(profile, "research.research");

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100">
          {imageLoading ? (
            <Spinner />
          ) : imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6 text-ink-300" />
          )}
        </div>

        <div>
          <p className="text-base font-semibold text-ink-900">{name}</p>
          {email && <p className="text-xs text-ink-500">{email}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        {STAT_FIELDS.map(([paths, label]) => {
          const value = pick(profile, ...paths);

          return value !== undefined ? (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-ink-400">
                {label}
              </dt>
              <dd className="font-medium text-ink-800">{String(value)}</dd>
            </div>
          ) : null;
        })}

        {/* {overallScore !== undefined && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-400">
              Profile score
            </dt>
            <dd className="font-medium text-ink-800">{overallScore}</dd>
          </div>
        )} */}
      </dl>

      {workSummary && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            Work experience
          </p>
          <p className="text-sm text-ink-700">{previewText(workSummary, 220)}</p>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 20).map((skill, i) => (
              <Badge key={`${skill}-${i}`} tone="brand">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            Projects
          </p>

          <div className="space-y-2">
            {projects.slice(0, 5).map((project, i) => (
              <div key={i} className="rounded-lg border border-ink-100 px-3 py-2">
                {project.title && (
                  <p className="text-xs font-semibold text-ink-800">
                    {project.title}
                  </p>
                )}

                {project.description && (
                  <p className="mt-0.5 text-xs text-ink-500">
                    {previewText(project.description, 160)}
                  </p>
                )}

                {project.technologies?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {project.technologies.map((t, j) => (
                      <Badge key={`${t}-${j}`} tone="neutral">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {researchText && researchText.toLowerCase() !== "none stated" && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            Research
          </p>
          <p className="text-sm text-ink-700">
            {previewText(researchText, 200)}
          </p>
        </div>
      )}

      {targetDisciplines.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            Target disciplines
          </p>

          <ul className="space-y-1 text-xs text-ink-700">
            {targetDisciplines.map((d, i) => (
              <li key={i}>• {d}</li>
            ))}
          </ul>
        </div>
      )}

      {gaps.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            Gaps
          </p>

          <div className="flex flex-wrap gap-1.5">
            {gaps.map((gap, i) => (
              <Badge key={`${gap}-${i}`} tone="warning">
                {gap}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {Object.keys(assessments).length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
            Fit assessments
          </p>

          <div className="space-y-1.5">
            {Object.entries(assessments).map(([uniId, a]) => (
              <div
                key={uniId}
                className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs font-medium text-ink-700">
                  {uniId}
                </span>

                <div className="flex shrink-0 items-center gap-2">
                  {a.match_score !== undefined && a.match_score !== null && (
                    <span className="text-xs text-ink-500">
                      {a.match_score}
                    </span>
                  )}

                  <Badge tone={matchTierTone(a.match_tier)}>
                    {a.match_tier || "unassessed"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* {aiSummaryLines.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            AI summary
          </p>

          <div className="space-y-1 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2">
            {aiSummaryLines.map((line, index) => (
              <p key={`${line}-${index}`} className="text-xs leading-relaxed text-ink-600">
                {line}
              </p>
            ))}
          </div>
        </div>
      )} */}

      {(profile.created_at || profile.updated_at) && (
        <p className="text-[11px] text-ink-400">
          {profile.updated_at
            ? `Updated ${profile.updated_at}`
            : `Created ${profile.created_at}`}
        </p>
      )}
    </div>
  );
}
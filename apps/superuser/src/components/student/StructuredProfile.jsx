import {
  Building2,
  ChevronDown,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Badge from "../common/Badge";
import Card, { CardBody, CardHeader } from "../common/Card";

const EMPTY_VALUES = [null, undefined, ""];

const EMPTY_TEXT_VALUES = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "none",
  "none stated",
  "not stated",
  "not provided",
  "not available",
  "unavailable",
  "unknown",
  "null",
  "undefined",
  "no data",
  "no data available",
]);

// These fields currently use 0 as a placeholder when no real value has been calculated.
// A genuine zero in other fields (for example work_months) is still displayed.
const ZERO_AS_EMPTY_KEYS = new Set([
  "overall_profile_score",
  "publications_count",
  "publication_count",
]);

export function normalizeStructuredValue(value) {
  let current = value;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) break;

    try {
      current = JSON.parse(trimmed);
    } catch {
      break;
    }
  }

  return current;
}

export function hasDisplayValue(value, key = "") {
  const normalized = normalizeStructuredValue(value);

  if (EMPTY_VALUES.includes(normalized)) return false;

  if (typeof normalized === "string") {
    const trimmed = normalized.trim();
    return !EMPTY_TEXT_VALUES.has(trimmed.toLowerCase());
  }

  if (typeof normalized === "number") {
    if (!Number.isFinite(normalized)) return false;
    if (normalized === 0 && ZERO_AS_EMPTY_KEYS.has(String(key))) return false;
    return true;
  }

  // false is meaningful data (for example verified=false or a negative skill signal).
  if (typeof normalized === "boolean") return true;

  if (Array.isArray(normalized)) {
    return normalized.some((item) => hasDisplayValue(item));
  }

  if (normalized && typeof normalized === "object") {
    return Object.entries(normalized).some(([childKey, item]) =>
      hasDisplayValue(item, childKey)
    );
  }

  return true;
}

export function isStructuredValue(value) {
  const normalized = normalizeStructuredValue(value);
  if (Array.isArray(normalized)) {
    return normalized.some((item) => item && typeof item === "object");
  }
  return Boolean(normalized && typeof normalized === "object");
}

export function PrettyValue({ value, depth = 0 }) {
  const normalized = normalizeStructuredValue(value);

  if (!hasDisplayValue(normalized)) return null;

  if (typeof normalized === "boolean") {
    return <Badge tone={normalized ? "success" : "neutral"}>{normalized ? "Yes" : "No"}</Badge>;
  }

  if (typeof normalized === "number") {
    return <span className="text-sm text-ink-800">{normalized.toLocaleString()}</span>;
  }

  if (typeof normalized === "string") {
    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-ink-800">
        {normalized}
      </p>
    );
  }

  if (Array.isArray(normalized)) {
    if (!hasDisplayValue(normalized)) return null;

    const primitivesOnly = normalized.every(
      (item) => item === null || ["string", "number", "boolean"].includes(typeof item)
    );

    if (primitivesOnly) {
      return (
        <div className="flex flex-wrap gap-2">
          {normalized.map((item, index) => (
            <span
              key={`${String(item)}-${index}`}
              className="rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700"
            >
              {formatPrimitive(item)}
            </span>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {normalized.map((item, index) => (
          <div key={index} className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
            {item && typeof item === "object" && !Array.isArray(item) ? (
              <>
                {getObjectTitle(item) && (
                  <p className="mb-3 text-sm font-semibold text-ink-900">{getObjectTitle(item)}</p>
                )}
                <ObjectGrid value={item} depth={depth + 1} hideTitleKeys />
              </>
            ) : (
              <PrettyValue value={item} depth={depth + 1} />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof normalized === "object") {
    if (!hasDisplayValue(normalized)) return null;
    return <ObjectGrid value={normalized} depth={depth + 1} />;
  }

  return <span className="text-sm text-ink-800">{String(normalized)}</span>;
}

export function StructuredProfileCard({ entries }) {
  const visibleEntries = (entries || []).filter(([key, value]) => hasDisplayValue(value, key));
  if (!visibleEntries.length) return null;

  return (
    <Card>
      <CardHeader
        icon={Settings2}
        title="Structured profile data"
        subtitle="Projects, assessments, preferences, intelligence fields, and other structured profile information."
      />
      <CardBody className="space-y-4">
        {visibleEntries.map(([key, value]) => (
          <section key={key} className="rounded-2xl border border-ink-100 bg-white p-5">
            <h3 className="text-sm font-semibold text-ink-900">{humanize(key)}</h3>
            <div className="mt-3">
              <PrettyValue value={value} />
            </div>
          </section>
        ))}
      </CardBody>
    </Card>
  );
}

export function GitHubAssessmentCard({ value }) {
  const raw = normalizeStructuredValue(value);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !hasDisplayValue(raw)) return null;

  const data = normalizeStructuredValue(raw.result ?? raw);
  if (!data || typeof data !== "object" || Array.isArray(data) || !hasDisplayValue(data)) return null;

  const languages = asArray(data.languages);
  const strengths = asArray(data.strengths);
  const gaps = asArray(data.honest_gaps ?? data.gaps);
  const repositories = asArray(data.strongest_repos);
  const tools = asArray(data.frameworks_and_tools ?? data.frameworks_and_tools_detected);
  const skillSignals = normalizeStructuredValue(data.skill_signals);

  const knownKeys = new Set([
    "name",
    "source",
    "username",
    "verified",
    "languages",
    "strengths",
    "aria_notes",
    "honest_gaps",
    "gaps",
    "generated_at",
    "months_active",
    "overall_level",
    "skill_signals",
    "strongest_repos",
    "primary_language",
    "work_consistency",
    "admissions_summary",
    "raw_signal_summary",
    "public_repos",
    "forked_repos_count",
    "original_repos_count",
    "language_breakdown_percent",
    "total_commits_by_student_approx",
    "original_work_ratio",
    "frameworks_and_tools",
    "frameworks_and_tools_detected",
  ]);

  const extraEntries = Object.entries(data).filter(
    ([key, item]) => !knownKeys.has(key) && hasDisplayValue(item, key)
  );

  return (
    <Card>
      <CardHeader
        icon={Sparkles}
        title="GitHub assessment"
        subtitle="Technical evidence from the student's public GitHub activity, organized into readable signals."
      />
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {hasDisplayValue(data.username, "username") && <Badge tone="brand">@{data.username}</Badge>}
          {data.verified !== undefined && (
            <Badge tone={data.verified ? "success" : "warning"}>
              {data.verified ? "Verified" : "Not verified"}
            </Badge>
          )}
          {hasDisplayValue(data.overall_level, "overall_level") && <Badge tone="neutral">{humanize(data.overall_level)}</Badge>}
          {hasDisplayValue(data.work_consistency, "work_consistency") && (
            <Badge tone="neutral">{humanize(data.work_consistency)} activity</Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Primary language" value={data.primary_language} fieldKey="primary_language" />
          <Stat label="Months active" value={data.months_active} fieldKey="months_active" />
          <Stat label="Public repositories" value={data.public_repos} fieldKey="public_repos" />
          <Stat label="Original work ratio" value={formatRatio(data.original_work_ratio)} fieldKey="original_work_ratio" />
        </div>

        {languages.length > 0 && (
          <Section title="Languages">
            <div className="grid gap-3 md:grid-cols-2">
              {languages.map((language, index) => {
                if (!language || typeof language !== "object") {
                  return <Chip key={index}>{String(language)}</Chip>;
                }
                const percent = numberOrNull(language.percent);
                return (
                  <div key={`${language.name ?? "language"}-${index}`} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink-900">{language.name || "Language"}</span>
                      <div className="flex items-center gap-2">
                        {language.level && <Badge tone="neutral">{humanize(language.level)}</Badge>}
                        {percent !== null && <span className="text-xs font-semibold text-ink-600">{percent}%</span>}
                      </div>
                    </div>
                    {percent !== null && (
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {tools.length > 0 && (
          <Section title="Frameworks & tools">
            <ChipList items={tools} />
          </Section>
        )}

        {skillSignals && typeof skillSignals === "object" && !Array.isArray(skillSignals) && (
          <Section title="Skill signals">
            <div className="flex flex-wrap gap-2">
              {Object.entries(skillSignals).map(([key, enabled]) => (
                <Badge key={key} tone={enabled ? "success" : "neutral"}>
                  {enabled ? "✓" : "–"} {humanize(key)}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {strengths.length > 0 && (
            <ListPanel title="Strengths" items={strengths} tone="success" />
          )}
          {gaps.length > 0 && (
            <ListPanel title="Development gaps" items={gaps} tone="warning" />
          )}
        </div>

        {repositories.length > 0 && (
          <Section title="Strongest repositories">
            <div className="grid gap-3 md:grid-cols-2">
              {repositories.map((repo, index) => (
                <div key={index} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                  <p className="font-semibold text-ink-900">
                    {typeof repo === "object" ? repo.name || `Repository ${index + 1}` : String(repo)}
                  </p>
                  {typeof repo === "object" && repo.why && (
                    <p className="mt-2 text-sm leading-6 text-ink-600">{repo.why}</p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {hasDisplayValue(data.admissions_summary, "admissions_summary") && (
          <TextPanel title="Admissions summary" text={data.admissions_summary} />
        )}

        {hasDisplayValue(data.aria_notes, "aria_notes") && <TextPanel title="Advisor note" text={data.aria_notes} />}

        {hasDisplayValue(data.raw_signal_summary, "raw_signal_summary") && (
          <Collapsible title="Additional GitHub signals">
            <PrettyValue value={data.raw_signal_summary} />
          </Collapsible>
        )}

        {extraEntries.length > 0 && (
          <Collapsible title="Other assessment details">
            <ObjectGrid value={Object.fromEntries(extraEntries)} />
          </Collapsible>
        )}

        {hasDisplayValue(data.generated_at, "generated_at") && (
          <p className="text-xs text-ink-400">Generated {formatDateTime(data.generated_at)}</p>
        )}
      </CardBody>
    </Card>
  );
}

export function LinkedInProfileCard({ value }) {
  const raw = normalizeStructuredValue(value);
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !hasDisplayValue(raw)) return null;

  const data = normalizeStructuredValue(raw.result ?? raw);
  if (!data || typeof data !== "object" || Array.isArray(data) || !hasDisplayValue(data)) return null;

  const skills = asArray(data.skills);
  const education = asArray(data.education);
  const experience = asArray(data.experience);
  const projects = asArray(data.projects);
  const languages = asArray(data.languages);
  const certifications = asArray(data.certifications);
  const volunteering = asArray(data.volunteering);
  const interests = asArray(data.professional_interests);
  const missingSections = asArray(data.missing_sections);

  const knownKeys = new Set([
    "name",
    "skills",
    "source",
    "headline",
    "location",
    "projects",
    "verified",
    "education",
    "languages",
    "experience",
    "input_files",
    "current_role",
    "linkedin_url",
    "volunteering",
    "certifications",
    "current_company",
    "career_direction",
    "confidence_level",
    "confidence_notes",
    "missing_sections",
    "professional_interests",
    "manual_profile_api",
  ]);

  const extraEntries = Object.entries(data).filter(
    ([key, item]) => !knownKeys.has(key) && hasDisplayValue(item, key)
  );

  return (
    <Card>
      <CardHeader
        icon={Building2}
        title="LinkedIn profile"
        subtitle="Professional profile data grouped into identity, skills, education, and experience."
      />
      <CardBody className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {data.verified !== undefined && (
            <Badge tone={data.verified ? "success" : "warning"}>
              {data.verified ? "Verified" : "Not verified"}
            </Badge>
          )}
          {hasDisplayValue(data.confidence_level, "confidence_level") && (
            <Badge tone="brand">{humanize(data.confidence_level)} confidence</Badge>
          )}
          {hasDisplayValue(data.source, "source") && <Badge tone="neutral">{humanize(data.source)}</Badge>}
        </div>

        {hasDisplayValue(data.headline, "headline") && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Headline</p>
            <p className="mt-2 text-base font-medium leading-7 text-ink-900">{data.headline}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Name" value={data.name} fieldKey="name" />
          <Stat label="Current role" value={data.current_role} fieldKey="current_role" />
          <Stat label="Company" value={data.current_company} fieldKey="current_company" />
          <Stat label="Location" value={data.location} fieldKey="location" />
        </div>

        {skills.length > 0 && (
          <Section title="Skills">
            <ChipList items={skills} />
          </Section>
        )}

        {education.length > 0 && (
          <Section title="Education">
            <RecordList items={education} fallbackPrefix="Education" />
          </Section>
        )}

        {experience.length > 0 && (
          <Section title="Experience">
            <RecordList items={experience} fallbackPrefix="Experience" />
          </Section>
        )}

        {projects.length > 0 && (
          <Section title="Projects">
            <RecordList items={projects} fallbackPrefix="Project" />
          </Section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {languages.length > 0 && <SimpleCollection title="Languages" items={languages} />}
          {certifications.length > 0 && <SimpleCollection title="Certifications" items={certifications} />}
          {volunteering.length > 0 && <SimpleCollection title="Volunteering" items={volunteering} />}
          {interests.length > 0 && <SimpleCollection title="Professional interests" items={interests} />}
        </div>

        {hasDisplayValue(data.career_direction, "career_direction") && <TextPanel title="Career direction" text={data.career_direction} />}

        {hasDisplayValue(data.confidence_notes, "confidence_notes") && (
          <TextPanel title="Profile extraction notes" text={data.confidence_notes} />
        )}

        {missingSections.length > 0 && (
          <ListPanel title="Missing / incomplete sections" items={missingSections} tone="warning" />
        )}

        {hasDisplayValue(data.linkedin_url, "linkedin_url") && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">LinkedIn URL</p>
            <a
              href={data.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block break-all text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline"
            >
              {data.linkedin_url}
            </a>
          </div>
        )}

        {hasDisplayValue(data.input_files, "input_files") && (
          <Collapsible title="Source files">
            <PrettyValue value={data.input_files} />
          </Collapsible>
        )}

        {hasDisplayValue(data.manual_profile_api, "manual_profile_api") && (
          <Collapsible title="Manual profile data">
            <PrettyValue value={data.manual_profile_api} />
          </Collapsible>
        )}

        {extraEntries.length > 0 && (
          <Collapsible title="Other LinkedIn details">
            <ObjectGrid value={Object.fromEntries(extraEntries)} />
          </Collapsible>
        )}
      </CardBody>
    </Card>
  );
}

export function EvidenceCard({ value }) {
  const evidence = normalizeStructuredValue(value);
  if (!evidence || typeof evidence !== "object" || !hasDisplayValue(evidence)) return null;

  const sources = (Array.isArray(evidence)
    ? evidence.map((item, index) => [`Evidence ${index + 1}`, item])
    : Object.entries(evidence)
  ).filter(([key, item]) => hasDisplayValue(item, key));

  if (sources.length === 0) return null;

  return (
    <Card>
      <CardHeader
        icon={ShieldCheck}
        title="Evidence"
        subtitle="Source evidence is summarized first. Full structured details remain available without exposing raw JSON."
      />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        {sources.map(([sourceKey, sourceValue], index) => (
          <EvidenceSource key={`${sourceKey}-${index}`} name={sourceKey} value={sourceValue} />
        ))}
      </CardBody>
    </Card>
  );
}

function EvidenceSource({ name, value }) {
  const normalized = normalizeStructuredValue(value);
  const payload =
    normalized && typeof normalized === "object" && !Array.isArray(normalized)
      ? normalizeStructuredValue(normalized.result ?? normalized)
      : normalized;

  const summary = payload && typeof payload === "object" && !Array.isArray(payload)
    ? [
        ["Name", payload.name],
        ["Username", payload.username ? `@${payload.username}` : null],
        ["Headline", payload.headline],
        ["Role", payload.current_role],
        ["Company", payload.current_company],
        ["Location", payload.location],
        ["Overall level", payload.overall_level ? humanize(payload.overall_level) : null],
        ["Primary language", payload.primary_language],
      ].filter(([, item]) => !isEmpty(item))
    : [];

  const verified = payload && typeof payload === "object" ? payload.verified : undefined;
  const sourceName = humanize(String(name));
  const SourceIcon = String(name).toLowerCase().includes("github")
    ? Sparkles
    : String(name).toLowerCase().includes("linkedin")
      ? Building2
      : ShieldCheck;

  return (
    <section className="rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-ink-600 shadow-sm">
            <SourceIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-semibold text-ink-900">{sourceName}</h3>
            <p className="text-xs text-ink-500">Evidence source</p>
          </div>
        </div>
        {verified !== undefined && (
          <Badge tone={verified ? "success" : "warning"}>{verified ? "Verified" : "Unverified"}</Badge>
        )}
      </div>

      {summary.length > 0 && (
        <dl className="mt-4 space-y-3">
          {summary.slice(0, 6).map(([label, item]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-800">{String(item)}</dd>
            </div>
          ))}
        </dl>
      )}

      <details className="group mt-4 border-t border-ink-200 pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-brand-700">
          View structured evidence
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4 rounded-xl bg-white p-4">
          <PrettyValue value={normalized} />
        </div>
      </details>
    </section>
  );
}

function ObjectGrid({ value, depth = 0, hideTitleKeys = false }) {
  const normalized = normalizeStructuredValue(value);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
    return <PrettyValue value={normalized} depth={depth} />;
  }

  const titleKeys = new Set(["name", "title", "label"]);
  const entries = Object.entries(normalized).filter(
    ([key, item]) => !(hideTitleKeys && titleKeys.has(key)) && hasDisplayValue(item, key)
  );

  if (entries.length === 0) return null;

  if (depth > 3) {
    return (
      <div className="space-y-2">
        {entries.map(([key, item]) => (
          <div key={key} className="text-sm text-ink-700">
            <span className="font-medium text-ink-500">{humanize(key)}:</span>{" "}
            {typeof item === "object" ? "Structured data" : String(item)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {entries.map(([key, item]) => (
        <div key={key} className={isWideValue(item) ? "sm:col-span-2" : ""}>
          <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">{humanize(key)}</dt>
          <dd className="mt-1">
            <PrettyValue value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function RecordList({ items, fallbackPrefix }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return (
            <div key={index} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
              <PrettyValue value={item} />
            </div>
          );
        }

        const title = getObjectTitle(item) || `${fallbackPrefix} ${index + 1}`;
        return (
          <div key={index} className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
            <p className="font-semibold text-ink-900">{title}</p>
            <div className="mt-3">
              <ObjectGrid value={item} hideTitleKeys />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TextPanel({ title, text }) {
  if (!hasDisplayValue(text)) return null;

  return (
    <section className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">{text}</p>
    </section>
  );
}

function ListPanel({ title, items, tone = "neutral" }) {
  const visibleItems = (items || []).filter((item) => hasDisplayValue(item));
  if (!visibleItems.length) return null;
  const toneClasses = {
    success: "border-emerald-100 bg-emerald-50/60",
    warning: "border-amber-100 bg-amber-50/60",
    neutral: "border-ink-100 bg-ink-50/60",
  };

  return (
    <section className={`rounded-2xl border p-5 ${toneClasses[tone] || toneClasses.neutral}`}>
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <ul className="mt-3 space-y-2">
        {visibleItems.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm leading-6 text-ink-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
            <span>{typeof item === "object" ? getObjectTitle(item) || humanizeObject(item) : String(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SimpleCollection({ title, items }) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <div className="mt-3">
        <PrettyValue value={items} />
      </div>
    </section>
  );
}

function Collapsible({ title, children }) {
  return (
    <details className="group rounded-2xl border border-ink-100 bg-ink-50/40 p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-800">
        {title}
        <ChevronDown className="h-4 w-4 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 border-t border-ink-100 pt-4">{children}</div>
    </details>
  );
}

function Stat({ label, value, fieldKey = "" }) {
  if (!hasDisplayValue(value, fieldKey)) return null;

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/70 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink-900">
        {String(value)}
      </p>
    </div>
  );
}

function ChipList({ items }) {
  const visibleItems = (items || []).filter((item) => hasDisplayValue(item));
  if (!visibleItems.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item, index) => (
        <Chip key={`${typeof item === "string" ? item : index}-${index}`}>
          {typeof item === "object" ? getObjectTitle(item) || humanizeObject(item) : String(item)}
        </Chip>
      ))}
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
      {children}
    </span>
  );
}

function EmptyValue() {
  return null;
}

function asArray(value) {
  const normalized = normalizeStructuredValue(value);
  if (!hasDisplayValue(normalized)) return [];
  const items = Array.isArray(normalized) ? normalized : [normalized];
  return items.filter((item) => hasDisplayValue(item));
}

function isEmpty(value) {
  return !hasDisplayValue(value);
}

function formatPrimitive(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatRatio(value) {
  const num = numberOrNull(value);
  if (num === null) return null;
  const percent = num <= 1 ? num * 100 : num;
  return `${Math.round(percent * 10) / 10}%`;
}

function getObjectTitle(value) {
  if (!value || typeof value !== "object") return null;
  return (
    value.name ||
    value.title ||
    value.label ||
    value.institution ||
    value.company ||
    value.role ||
    null
  );
}

function humanizeObject(value) {
  const entries = Object.entries(value || {})
    .filter(([, item]) => ["string", "number", "boolean"].includes(typeof item) && !isEmpty(item))
    .slice(0, 3);
  return entries.map(([key, item]) => `${humanize(key)}: ${formatPrimitive(item)}`).join(" • ");
}

function isWideValue(value) {
  const normalized = normalizeStructuredValue(value);
  if (Array.isArray(normalized)) return normalized.length > 3 || normalized.some((item) => typeof item === "object");
  if (normalized && typeof normalized === "object") return true;
  return typeof normalized === "string" && normalized.length > 90;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function humanize(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
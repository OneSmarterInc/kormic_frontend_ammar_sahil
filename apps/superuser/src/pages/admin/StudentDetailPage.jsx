import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CircleCheck,
  CircleDashed,
  GraduationCap,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import {
  EvidenceCard,
  GitHubAssessmentCard,
  LinkedInProfileCard,
  PrettyValue,
  StructuredProfileCard,
  humanize,
  hasDisplayValue,
  isStructuredValue,
  normalizeStructuredValue,
} from "../../components/student/StructuredProfile";
import { deleteStudent, getStudent } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

const ONBOARDING_LABELS = {
  profile_exists: "Profile created",
  resume_uploaded: "Resume uploaded",
  github_connected: "GitHub connected",
  linkedin_connected: "LinkedIn connected",
  setup_complete: "Onboarding complete",
};

const SPECIAL_PROFILE_KEYS = new Set([
  "github_assessment",
  "githubAssessment",
  "linkedin_profile",
  "linkedinProfile",
  "evidence",
]);

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const { data: student, loading, error, refetch } = useAsync(() => getStudent(studentId), [studentId]);

  const { execute: remove, loading: removing, error: removeError } = useAction(() => deleteStudent(studentId));

  const handleDelete = async () => {
    try {
      await remove();
      toast.success("Student deleted");
      navigate("/admin/students");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Spinner label="Loading student..." />;
  if (error) return <ErrorBanner error={error} onDismiss={refetch} />;

  const profile = normalizeStructuredValue(student.profile) || {};
  const onboarding = student.onboarding || {};

  const allProfileEntries = Object.entries(profile).filter(
    ([key, value]) =>
      !["student_id", "name"].includes(key) &&
      hasDisplayValue(value, key) &&
      !SPECIAL_PROFILE_KEYS.has(key)
  );

  const basicEntries = allProfileEntries.filter(([, value]) => !isStructuredValue(value));
  const structuredEntries = allProfileEntries.filter(([, value]) => isStructuredValue(value));

  const githubAssessment = profile.github_assessment ?? profile.githubAssessment;
  const linkedinProfile = profile.linkedin_profile ?? profile.linkedinProfile;
  const evidence = profile.evidence;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <button
        onClick={() => navigate("/admin/students")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </button>

      <PageHeader
        title={student.name || student.email}
        description={student.email}
        action={
          <Button
            variant="danger"
            icon={Trash2}
            onClick={() => setDeleting(true)}
          >
            Delete student
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone={student.is_active ? "success" : "danger"}>
          {student.is_active ? "Active" : "Inactive"}
        </Badge>
        <Badge tone={student.totp_enrolled ? "brand" : "neutral"}>
          <ShieldCheck className="h-3 w-3" />
          {student.totp_enrolled ? "2FA enrolled" : "2FA not enrolled"}
        </Badge>
        <Badge tone="neutral">Joined {formatDate(student.date_joined)}</Badge>
      </div>

      <Card>
        <CardHeader
          icon={GraduationCap}
          title="Profile overview"
          subtitle={student.email}
        />
        <CardBody>
          {basicEntries.length === 0 ? (
            <p className="text-sm text-ink-500">No basic profile fields on record yet.</p>
          ) : (
            <ProfileOverviewFields entries={basicEntries} />
          )}
        </CardBody>
      </Card>

      <StructuredProfileCard entries={structuredEntries} />

      <GitHubAssessmentCard value={githubAssessment} />

      <LinkedInProfileCard value={linkedinProfile} />

      <EvidenceCard value={evidence} />

      <Card>
        <CardHeader title="Onboarding" subtitle="Setup progress for this student's account." />
        <CardBody className="space-y-3">
          {Object.entries(ONBOARDING_LABELS).map(([key, label]) => {
            const done = Boolean(onboarding[key]);
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {done ? (
                    <CircleCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <CircleDashed className="h-5 w-5 text-ink-300" />
                  )}
                  <span className={done ? "text-ink-900" : "text-ink-500"}>{label}</span>
                </div>
                <Badge tone={done ? "success" : "neutral"}>{done ? "Done" : "Pending"}</Badge>
              </div>
            );
          })}
        </CardBody>
      </Card>

      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
        loading={removing}
        error={removeError}
        title="Delete student"
        confirmLabel="Delete permanently"
        description={`This permanently deletes ${student.email}'s login and purges their profile, resumes, GitHub/LinkedIn analyses, fit assessments, roadmaps, and chat history. This can't be undone.`}
      />
    </div>
  );
}

function ProfileOverviewFields({ entries }) {
  const byKey = new Map(entries);

  const source = getFirstEntry(byKey, ["source"]);
  const verified = getFirstEntry(byKey, ["verified"]);
  const skills = getFirstEntry(byKey, ["skills"]);
  const summary = getFirstEntry(byKey, ["summary"]);
  const disciplines = getFirstEntry(byKey, ["disciplines"]);
  const gaps = getFirstEntry(byKey, ["gaps"]);

  const arrangedEntries = [source, verified, skills, summary, disciplines, gaps].filter(Boolean);
  const arrangedKeys = new Set(arrangedEntries.map(([key]) => key));

  // Keep all ordinary profile fields in their original API order. Only the
  // Source/Verified/Skills/Summary/Disciplines/Gaps block gets a custom layout.
  const arrangedIndexes = arrangedEntries
    .map(([key]) => entries.findIndex(([entryKey]) => entryKey === key))
    .filter((index) => index >= 0);

  const firstArrangedIndex = arrangedIndexes.length ? Math.min(...arrangedIndexes) : entries.length;
  const lastArrangedIndex = arrangedIndexes.length ? Math.max(...arrangedIndexes) : -1;

  const beforeArranged = entries
    .slice(0, firstArrangedIndex)
    .filter(([key]) => !arrangedKeys.has(key));

  const afterArranged = entries
    .slice(lastArrangedIndex + 1)
    .filter(([key]) => !arrangedKeys.has(key));

  // If a normal field happens to appear between the custom fields in the API,
  // preserve it below the custom block rather than dropping or reordering it wildly.
  const middleOrdinary = entries
    .slice(firstArrangedIndex, lastArrangedIndex + 1)
    .filter(([key]) => !arrangedKeys.has(key));

  const remaining = [...middleOrdinary, ...afterArranged];

  return (
    <div className="space-y-6">
      {beforeArranged.length > 0 && (
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {beforeArranged.map((entry) => (
            <ProfileField
              key={entry[0]}
              entry={entry}
              wide={isWideText(entry[1])}
            />
          ))}
        </dl>
      )}

      {(source || verified || skills) && (
        <div className="space-y-5 lg:max-w-4xl">
          {(source || verified) && (
            <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
              {source && <ProfileField entry={source} />}
              {verified && <ProfileField entry={verified} />}
            </dl>
          )}

          {skills && (
            <dl>
              <ProfileField entry={skills} />
            </dl>
          )}
        </div>
      )}

      {(summary || disciplines || gaps) && (
        <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
          <div>
            {summary && (
              <dl>
                <ProfileField entry={summary} />
              </dl>
            )}
          </div>

          <div>
            {disciplines && (
              <dl>
                <ProfileField entry={disciplines} />
              </dl>
            )}
          </div>

          <div>
            {gaps && (
              <dl>
                <ProfileField entry={gaps} />
              </dl>
            )}
          </div>
        </div>
      )}

      {remaining.length > 0 && (
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {remaining.map((entry) => (
            <ProfileField
              key={entry[0]}
              entry={entry}
              wide={isWideText(entry[1])}
            />
          ))}
        </dl>
      )}
    </div>
  );
}

function ProfileField({ entry, wide = false }) {
  const [key, value] = entry;

  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {humanize(key)}
      </dt>
      <dd className="mt-1.5">
        <PrettyValue value={value} />
      </dd>
    </div>
  );
}

function getFirstEntry(byKey, keys) {
  for (const key of keys) {
    if (byKey.has(key)) return [key, byKey.get(key)];
  }
  return null;
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function isWideText(value) {
  const normalized = normalizeStructuredValue(value);
  return typeof normalized === "string" && normalized.length > 120;
}
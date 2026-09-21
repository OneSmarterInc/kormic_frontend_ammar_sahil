import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronUp,
  Globe,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  SquarePen,
  UserRound,
} from "lucide-react";

import PageHeader from "../../components/layout/PageHeader";
import Card, {
  CardBody,
  CardHeader,
} from "../../components/common/Card";
import Spinner from "../../components/common/Spinner";
import ErrorBanner from "../../components/common/ErrorBanner";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";

import { getUniversity } from "../../api/superuserApi";
import { useAsync } from "../../hooks/useAsync";

const EMPTY_FORM = {
  name: "",
  location: "",
  tagline: "",
  description: "",
  website_url: "",
  contact_email: "",
  contact_phone: "",
  admissions_office_address: "",
  eligibility_criteria: [],
  scrape_urls: [],
  tone_descriptors: [],
  best_fit_notes: "",
  not_best_fit_notes: "",
  communication_style_notes: "",
  never_do_notes: "",
};

export default function UniversityViewPage() {
  const { universityId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);

  const [showSources, setShowSources] = useState(false);

  const {
    data: university,
    loading,
    error,
    refetch,
  } = useAsync(
    () => getUniversity(universityId),
    [universityId]
  );

  useEffect(() => {
    if (!university) return;

    setForm({
      name: university.name || "",
      location: university.location || "",
      tagline: university.tagline || "",
      description: university.description || "",
      website_url: university.website_url || "",
      contact_email: university.contact_email || "",
      contact_phone: university.contact_phone || "",
      admissions_office_address:
        university.admissions_office_address || "",
      eligibility_criteria:
        university.eligibility_criteria || [],
      scrape_urls:
        university.scrape_urls || [],
      tone_descriptors:
        university.tone_descriptors || [],
      best_fit_notes:
        university.best_fit_notes || "",
      not_best_fit_notes:
        university.not_best_fit_notes || "",
      communication_style_notes:
        university.communication_style_notes || "",
      never_do_notes:
        university.never_do_notes || "",
    });
  }, [university]);

  if (loading)
    return <Spinner label="Loading university..." />;

  if (error)
    return (
      <ErrorBanner
        error={error}
        onDismiss={refetch}
      />
    );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pb-8">

      <button
        onClick={() =>
          navigate("/admin/universities")
        }
        className="flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to universities
      </button>

      <PageHeader
        title={form.name}
        description={university.admin_email || "No admin email on file"}
        action={
          <Button
            icon={SquarePen}
            onClick={() =>
              navigate(
                `/admin/universities/${universityId}`
              )
            }
          >
            Edit University
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">

        <Badge tone="brand">
          <Sparkles className="h-3 w-3" />
          Agent : {university.agent_name}
        </Badge>

        <Badge tone={university.admin_is_active ? "success" : "danger"}>
          {university.admin_is_active ? "Admin Active" : "Admin Inactive"}
        </Badge>

        <Badge tone={university.admin_totp_enrolled ? "brand" : "neutral"}>
          <ShieldCheck className="h-3 w-3" />
          {university.admin_totp_enrolled ? "2FA Enrolled" : "2FA Not Enrolled"}
        </Badge>

        <Badge
          tone={
            university.setup_status?.setup_complete
              ? "success"
              : "warning"
          }
        >
          {university.setup_status
            ?.completion_percentage ?? 0}
          % Complete
        </Badge>

      </div>
            {/* ===================================================== */}
      {/* University Information */}
      {/* ===================================================== */}

      <Card>
        <CardHeader
          icon={Building2}
          title="University Information"
          subtitle="Basic details and admissions contact information."
        />

        <CardBody className="space-y-5">

          {/* First Row */}

          <dl className="grid gap-4 lg:grid-cols-3">

            <Detail
              label="University Name"
              value={form.name}
            />

            <Detail
              label="Location"
              value={form.location}
            />

            <Detail
              label="Website"
              value={form.website_url}
              isLink
            />

          </dl>

          {/* Second Row */}

          <dl className="grid gap-4 lg:grid-cols-3">

            <Detail
              label="Tagline"
              value={form.tagline}
            />

            <Detail
              label="Contact Email"
              value={form.contact_email}
            />

            <Detail
              label="Contact Phone"
              value={form.contact_phone}
            />

          </dl>

          {/* Description */}

          <div>

            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Description
            </dt>

            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
              {formatValue(form.description)}
            </dd>

          </div>

          {/* Address */}

          <div>

            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Admissions Office Address
            </dt>

            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
              {formatValue(form.admissions_office_address)}
            </dd>

          </div>

        </CardBody>

      </Card>
            {/* ===================================================== */}
      {/* Admin Account */}
      {/* ===================================================== */}

      <Card>
        <CardHeader
          icon={UserRound}
          title="Admin Account"
          subtitle="The login this university uses to sign in."
          action={
            university.admin_user_id ? (
              <Link
                to={`/admin/users/${university.admin_user_id}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Manage in Users & Access
              </Link>
            ) : null
          }
        />

        <CardBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Name" value={university.admin_name} />
            <Detail label="Email" value={university.admin_email} />
          </dl>
        </CardBody>
      </Card>
            {/* ===================================================== */}
      {/* Eligibility Criteria */}
      {/* ===================================================== */}

      <Card>
        <CardHeader
          icon={ShieldCheck}
          title="Eligibility Criteria"
          subtitle="Admission requirements for applicants."
        />

        <CardBody>

          {form.eligibility_criteria?.length ? (

            <div className="overflow-x-auto">

              <table className="min-w-full border-collapse">

                <thead>

                  <tr className="border-b border-slate-200">

                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Requirement
                    </th>

                    <th className="py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Details
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {form.eligibility_criteria.map((item, index) => (

                    <tr
                      key={index}
                      className="border-b border-slate-100 last:border-0"
                    >

                      <td className="py-3 pr-6 align-top">

                        <span className="font-medium text-ink-800">

                          {item.requirement || "—"}

                        </span>

                      </td>

                      <td className="py-3 text-sm leading-6 text-ink-700">

                        {item.details || "—"}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-sm text-ink-500">
              No eligibility criteria available.
            </p>

          )}

        </CardBody>

      </Card>
            {/* ===================================================== */}
      {/* AI Configuration */}
      {/* ===================================================== */}

      <Card>
        <CardHeader
          icon={Sparkles}
          title="AI Configuration"
          subtitle="Configuration used by the university AI agent."
        />

        <CardBody className="space-y-6">

          {/* Tone */}

          <div>

            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Tone Descriptors
            </dt>

            <dd className="mt-2 flex flex-wrap gap-2">

              {form.tone_descriptors?.length ? (

                form.tone_descriptors.map((tone, index) => (

                  <Badge
                    key={index}
                    tone="brand"
                  >
                    {tone}
                  </Badge>

                ))

              ) : (

                <span className="text-sm text-ink-500">
                  —
                </span>

              )}

            </dd>

          </div>

          {/* Notes */}

          <div className="grid gap-6 lg:grid-cols-2">

            <div>

              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Best Fit Notes
              </dt>

              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {formatValue(form.best_fit_notes)}
              </dd>

            </div>

            <div>

              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Not Best Fit Notes
              </dt>

              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {formatValue(form.not_best_fit_notes)}
              </dd>

            </div>

            <div>

              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Communication Style
              </dt>

              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {formatValue(form.communication_style_notes)}
              </dd>

            </div>

            <div>

              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Never Do
              </dt>

              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                {formatValue(form.never_do_notes)}
              </dd>

            </div>

          </div>

        </CardBody>

      </Card>

      {/* ===================================================== */}
      {/* Knowledge Sources */}
      {/* ===================================================== */}

      <Card>

        <CardHeader
          icon={Globe}
          title="Knowledge Sources"
          subtitle="Websites used for university knowledge."
        />

        <CardBody>

          <button
            onClick={() => setShowSources(!showSources)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition hover:bg-slate-50"
          >

            <div className="flex items-center gap-3">

              <MessageSquare className="h-5 w-5 text-brand-600" />

              <span className="font-medium text-ink-800">

                Show {form.scrape_urls?.length || 0} Source
                {(form.scrape_urls?.length || 0) !== 1 && "s"}

              </span>

            </div>

            {showSources ? (

              <ChevronUp className="h-5 w-5" />

            ) : (

              <ChevronDown className="h-5 w-5" />

            )}

          </button>

          {showSources && (

            <div className="mt-4 space-y-3">

              {form.scrape_urls?.length ? (

                form.scrape_urls.map((url, index) => (

                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-brand-600 hover:underline"
                    >
                      {url}
                    </a>

                  </div>

                ))

              ) : (

                <p className="text-sm text-ink-500">
                  No knowledge sources available.
                </p>

              )}

            </div>

          )}

        </CardBody>

      </Card>
            {/* End of page */}
    </div>
  );
}

/* ===================================================== */
/* Helper Components */
/* ===================================================== */

function Detail({ label, value, isLink = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </dt>

      <dd className="mt-1 break-words text-sm leading-6 text-ink-800">
        {isLink && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 hover:underline"
          >
            {value}
          </a>
        ) : (
          formatValue(value)
        )}
      </dd>
    </div>
  );
}

/* ===================================================== */
/* Utilities */
/* ===================================================== */

function formatValue(value) {
  if (value === null || value === undefined) return "—";

  if (typeof value === "string") {
    if (value.trim() === "") return "—";
    return value;
  }

  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  ChevronUp,
  Globe,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Textarea } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import Badge from "../../components/common/Badge";
import ConfirmModal from "../../components/common/ConfirmModal";
import StickySaveBar from "../../layouts/StickySaveBar";
import { deleteUniversity, getUniversity, updateUniversity } from "../../api/superuserApi";
import { useAction, useAsync } from "../../hooks/useAsync";

const EMPTY_FORM = {
  name: "",
  location: "",
  tagline: "",
  description: "",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  admissions_office_address: "",
  eligibility_criteria: [],
  scrape_urls: [],
  tone_descriptors: [],
  best_fit_notes: "",
  not_best_fit_notes: "",
  communication_style_notes: "",
  never_do_notes: "",
};

export default function UniversityDetailPage() {
  const { universityId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [openSection, setOpenSection] = useState("basics");
  const [deleting, setDeleting] = useState(false);

  const {
    data: university,
    loading,
    error: loadError,
    refetch,
    setData: setUniversity,
  } = useAsync(() => getUniversity(universityId), [universityId]);

  useEffect(() => {
    if (!university) return;
    setForm({
      name: university.name || "",
      location: university.location || "",
      tagline: university.tagline || "",
      description: university.description || "",
      contact_email: university.contact_email || "",
      contact_phone: university.contact_phone || "",
      website_url: university.website_url || "",
      admissions_office_address: university.admissions_office_address || "",
      eligibility_criteria: university.eligibility_criteria || [],
      scrape_urls: university.scrape_urls || [],
      tone_descriptors: university.tone_descriptors || [],
      best_fit_notes: university.best_fit_notes || "",
      not_best_fit_notes: university.not_best_fit_notes || "",
      communication_style_notes: university.communication_style_notes || "",
      never_do_notes: university.never_do_notes || "",
    });
  }, [university]);

  const { execute: save, loading: saving, error: saveError } = useAction((payload) =>
    updateUniversity(universityId, payload)
  );

  const { execute: remove, loading: removing, error: removeError } = useAction(() =>
    deleteUniversity(universityId)
  );

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await save(form);
      setUniversity(updated);
      toast.success("University saved");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await remove();
      toast.success("University deleted");
      navigate("/admin/universities");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addCriterion = () =>
    setForm((f) => ({
      ...f,
      eligibility_criteria: [...f.eligibility_criteria, { criterion: "", detail: "" }],
    }));
  const updateCriterion = (i, key, value) =>
    setForm((f) => ({
      ...f,
      eligibility_criteria: f.eligibility_criteria.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)),
    }));
  const removeCriterion = (i) =>
    setForm((f) => ({ ...f, eligibility_criteria: f.eligibility_criteria.filter((_, idx) => idx !== i) }));

  const addUrl = () => setForm((f) => ({ ...f, scrape_urls: [...f.scrape_urls, ""] }));
  const updateUrl = (i, value) =>
    setForm((f) => ({ ...f, scrape_urls: f.scrape_urls.map((u, idx) => (idx === i ? value : u)) }));
  const removeUrl = (i) =>
    setForm((f) => ({ ...f, scrape_urls: f.scrape_urls.filter((_, idx) => idx !== i) }));

  if (loading) return <Spinner label="Loading university..." />;
  if (loadError) return <ErrorBanner error={loadError} onDismiss={refetch} />;

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-6 px-8 pb-8">
      <button
        onClick={() => navigate("/admin/universities")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to universities
      </button>

      <PageHeader
        title={university.name}
        description={university.admin_email || "No admin email on file"}
        action={
          <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
            Delete
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">
          <Sparkles className="h-3 w-3" /> Agent: {university.agent_name}
        </Badge>
        <Badge tone={university.admin_is_active ? "success" : "danger"}>
          {university.admin_is_active ? "Admin active" : "Admin inactive"}
        </Badge>
        <Badge tone={university.admin_totp_enrolled ? "brand" : "neutral"}>
          <ShieldCheck className="h-3 w-3" />
          {university.admin_totp_enrolled ? "2FA enrolled" : "2FA not enrolled"}
        </Badge>
        <Badge tone={university.setup_status?.setup_complete ? "success" : "warning"}>
          {university.setup_status?.completion_percentage ?? 0}% complete
        </Badge>
      </div>

      {saveError && <ErrorBanner error={saveError} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <SectionCard
          id="basics"
          openSection={openSection}
          setOpenSection={setOpenSection}
          icon={Building2}
          title="Basics"
          subtitle="Name, location, and how the university presents itself."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={update("name")} />
            </Field>
            <Field label="Location" hint="City and State">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500" />
                <Input value={form.location} onChange={update("location")} className="pl-12" />
              </div>
            </Field>
          </div>
          <Field label="Website" hint="Official university website">
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500" />
              <Input
                value={form.website_url}
                onChange={update("website_url")}
                placeholder="https://www.university.edu"
                className="pl-12"
              />
            </div>
          </Field>
          <Field label="Tagline" hint="Short sentence shown to students">
            <Input value={form.tagline} onChange={update("tagline")} />
          </Field>
          <Field label="Description">
            <Textarea rows={5} value={form.description} onChange={update("description")} maxLength={500} showCounter />
          </Field>
        </SectionCard>

        <SectionCard
          id="contact"
          openSection={openSection}
          setOpenSection={setOpenSection}
          icon={Phone}
          title="Contact information"
          subtitle="How students can reach the admissions office."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Contact email">
              <Input type="email" value={form.contact_email} onChange={update("contact_email")} />
            </Field>
            <Field label="Contact phone">
              <Input value={form.contact_phone} onChange={update("contact_phone")} />
            </Field>
          </div>
          <Field label="Admissions office address">
            <Textarea rows={3} value={form.admissions_office_address} onChange={update("admissions_office_address")} />
          </Field>
        </SectionCard>

        <SectionCard
          id="eligibility"
          openSection={openSection}
          setOpenSection={setOpenSection}
          icon={ShieldCheck}
          title="Eligibility criteria"
          subtitle="Admission requirements shown to applicants."
        >
          <div className="space-y-6">

  {/* Header */}
  <div className="flex items-center justify-between">
    <p className="text-sm text-ink-500">
      {form.eligibility_criteria.length} requirement(s)
    </p>

    <Button
      type="button"
      size="sm"
      icon={Plus}
      onClick={addCriterion}
    >
      Add requirement
    </Button>
  </div>

  {/* Requirements Grid */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {form.eligibility_criteria.map((c, i) => (
      <div
        key={i}
        className="rounded-xl border border-slate-200 p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-900">
            Requirement {i + 1}
          </span>

          <button
            type="button"
            onClick={() => removeCriterion(i)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Requirement">
            <Input
              value={c.criterion}
              onChange={(e) =>
                updateCriterion(i, "criterion", e.target.value)
              }
              placeholder="Minimum GPA"
            />
          </Field>

          <Field label="Detail">
            <Input
              value={c.detail}
              onChange={(e) =>
                updateCriterion(i, "detail", e.target.value)
              }
              placeholder="3.0 on a 4.0 scale"
            />
          </Field>
        </div>
      </div>
    ))}
  </div>

</div>
        </SectionCard>

        <SectionCard
          id="sources"
          openSection={openSection}
          setOpenSection={setOpenSection}
          icon={Globe}
          title="Knowledge sources"
          subtitle="Official pages the agent learns from."
        >
          <div className="space-y-3">
            {form.scrape_urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) => updateUrl(i, e.target.value)}
                  placeholder="https://university.edu/admissions"
                  className="flex-1"
                />
                <button type="button" onClick={() => removeUrl(i)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={addUrl}>
              Add URL
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          id="persona"
          openSection={openSection}
          setOpenSection={setOpenSection}
          icon={MessageSquare}
          title="AI tone & persona"
          subtitle="How the agent communicates."
        >
          <div className="space-y-6">
            <Field label="Tone descriptors" hint="Press Enter or comma after each word.">
              <TagInput
                tags={form.tone_descriptors}
                onChange={(tags) => setForm((f) => ({ ...f, tone_descriptors: tags }))}
                placeholder="Friendly, Professional, Career-focused..."
              />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Best fit for">
                <Textarea rows={4} value={form.best_fit_notes} onChange={update("best_fit_notes")} maxLength={300} showCounter />
              </Field>
              <Field label="Not best fit for">
                <Textarea rows={4} value={form.not_best_fit_notes} onChange={update("not_best_fit_notes")} maxLength={300} showCounter />
              </Field>
            </div>
            <Field label="Communication style">
              <Textarea rows={3} value={form.communication_style_notes} onChange={update("communication_style_notes")} maxLength={400} showCounter />
            </Field>
            <Field label="Things the AI should never do">
              <Textarea rows={3} value={form.never_do_notes} onChange={update("never_do_notes")} maxLength={300} showCounter />
            </Field>
          </div>
        </SectionCard>

        <StickySaveBar progress={university.setup_status?.completion_percentage ?? 0} saving={saving} />
      </form>

      <Card>
        <CardHeader
          icon={UserRound}
          title="Admin account"
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
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Name</dt>
              <dd className="mt-0.5 text-sm text-ink-800">{university.admin_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">Email</dt>
              <dd className="mt-0.5 break-words text-sm text-ink-800">{university.admin_email || "—"}</dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={handleDelete}
        loading={removing}
        error={removeError}
        title="Delete university"
        confirmLabel="Delete permanently"
        description={`This permanently deletes ${university.name}. If its admin account still references it, you'll need to remove or reassign it first via Users & Access.`}
      />
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-brand-500/40 focus-within:border-brand-500">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={tags.length ? "" : placeholder}
        className="min-w-[8rem] flex-1 border-none px-1 py-0.5 text-sm outline-none placeholder:text-ink-400"
      />
    </div>
  );
}

function SectionCard({ id, openSection, setOpenSection, icon: Icon, title, subtitle, children }) {
  const open = openSection === id;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenSection(open ? "" : id)}
        className="flex w-full items-center justify-between px-6 py-5 hover:bg-ink-50 transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-ink-900">{title}</h3>
            <p className="text-sm text-ink-500">{subtitle}</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-5 w-5 text-ink-400" /> : <ChevronDown className="h-5 w-5 text-ink-400" />}
      </button>

      {open && (
        <div className="border-t border-ink-100">
          <CardBody className="space-y-5">{children}</CardBody>
        </div>
      )}
    </Card>
  );
}

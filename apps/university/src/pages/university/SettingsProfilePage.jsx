import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import StickySaveBar from "../../layouts/StickySaveBar";
import {
    Copy,
    Plus,
    Save,
    Sparkles,
    Trash2,
    X,
    ChevronDown,
    ChevronUp,
    MapPin,
    Globe,
    Building2,
    Phone,
    ShieldCheck,
    MessageSquare,
    CheckCircle2,
} from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Textarea } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import Spinner from "../../components/common/Spinner";
import * as universityAdminApi from "../../api/universityAdminApi";
import { useAction, useAsync } from "../../hooks/useAsync";
import { setupPercent } from "../../lib/university";
import { isValidUrl, isValidPhone, isValidEmail } from "../../lib/validators";

function validateForm(form) {
    const errors = {};
    if (form.website_url.trim() && !isValidUrl(form.website_url)) {
        errors.website_url = "Enter a valid URL, including https:// (e.g. https://www.university.edu)";
    }
    if (form.contact_email.trim() && !isValidEmail(form.contact_email)) {
        errors.contact_email = "Enter a valid email address";
    }
    if (form.contact_phone.trim() && !isValidPhone(form.contact_phone)) {
        errors.contact_phone = "Enter a valid phone number (7-15 digits)";
    }
    if (form.eligibility_criteria.some((c) => !c.criterion.trim() || !c.detail.trim())) {
        errors.eligibility_criteria = "Fill in both fields for every requirement, or remove the empty one";
    }
    return errors;
}

const EMPTY_FORM = {
    location: "",
    tagline: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    admissions_office_address: "",
    eligibility_criteria: [],
    tone_descriptors: [],
    best_fit_notes: "",
    not_best_fit_notes: "",
    communication_style_notes: "",
    never_do_notes: "",
};

export default function SettingsProfilePage() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [openSection, setOpenSection] = useState("program");
    const { data: profile, error: loadError, loading, refetch, setData: setProfile } = useAsync(
        universityAdminApi.getProfile,
        []
    );

    useEffect(() => {
        if (!profile) return;
        setForm({
            location: profile.location || "",
            tagline: profile.tagline || "",
            description: profile.description || "",
            contact_email: profile.contact_email || "",
            contact_phone: profile.contact_phone || "",
            website_url: profile.website_url || "",
            admissions_office_address: profile.admissions_office_address || "",
            eligibility_criteria: profile.eligibility_criteria || [],
            tone_descriptors: profile.tone_descriptors || [],
            best_fit_notes: profile.best_fit_notes || "",
            not_best_fit_notes: profile.not_best_fit_notes || "",
            communication_style_notes: profile.communication_style_notes || "",
            never_do_notes: profile.never_do_notes || "",
        });
    }, [profile]);

    const { execute: save, loading: saving, error: saveError } = useAction((payload) =>
        universityAdminApi.updateProfile(payload)
    );

    const update = (key) => (e) => {
        const { value } = e.target;
        setForm((f) => ({ ...f, [key]: value }));
        setFormErrors((fe) => (fe[key] ? { ...fe, [key]: undefined } : fe));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateForm(form);
        if (Object.keys(errors).length) {
            setFormErrors(errors);
            setOpenSection(
                errors.website_url
                    ? "program"
                    : errors.contact_email || errors.contact_phone
                        ? "contact"
                        : "eligibility"
            );
            toast.error(
                errors.website_url ||
                errors.contact_email ||
                errors.contact_phone ||
                errors.eligibility_criteria
            );
            return;
        }
        setFormErrors({});

        try {
            const res = await save(form);
            setProfile(res);
            toast.success("Profile saved");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const addCriterion = () =>
        setForm((f) => ({
            ...f,
            eligibility_criteria: [...f.eligibility_criteria, { criterion: "", detail: "" }],
        }));

    const updateCriterion = (i, key, value) => {
        setForm((f) => ({
            ...f,
            eligibility_criteria: f.eligibility_criteria.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)),
        }));
        setFormErrors((fe) => (fe.eligibility_criteria ? { ...fe, eligibility_criteria: undefined } : fe));
    };

    const removeCriterion = (i) => {
        setForm((f) => ({ ...f, eligibility_criteria: f.eligibility_criteria.filter((_, idx) => idx !== i) }));
        setFormErrors((fe) => (fe.eligibility_criteria ? { ...fe, eligibility_criteria: undefined } : fe));
    };

    if (loading) return <Spinner label="Loading profile..." />;
    if (loadError) return <ErrorBanner error={loadError} onDismiss={refetch} />;

    return (
        <div className="space-y-4">
            <PageHeader
                title="University Profile"
                description="Configure your university profile and AI assistant. All changes are saved directly into your knowledge base."
            />

            <AgentNameCard profile={profile} onUpdated={setProfile} />

            <form onSubmit={handleSubmit} className="space-y-4">
                {saveError && <ErrorBanner error={saveError} />}

                <SectionCard
                    id="program"
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                    icon={Building2}
                    title="Program Basics"
                    subtitle="General information about your university."
                    status={
                        form.location &&
                            form.website_url &&
                            form.tagline &&
                            form.description
                            ? "Complete"
                            : "In Progress"
                    }
                >

                    <div className="grid gap-3">

                        {/* Row 1 */}

                        <div className="grid gap-4 md:grid-cols-2">

                            <Field
                                label="Location"
                                hint="City and State"
                            >
                                <div className="relative">

                                    <MapPin
                                        className="
                                 absolute
                                 left-4
                                 top-1/2
                                 -translate-y-1/2
                                 h-5
                                 w-5
                                 text-brand-500
                             "
                                    />

                                    <Input
                                        value={form.location}
                                        onChange={update("location")}
                                        placeholder="Boston, Massachusetts"
                                        className="pl-12"
                                    />

                                </div>
                            </Field>

                            <Field
                                label="Website"
                                hint="Your university's official base URL only (e.g. https://www.university.edu) — auto-discover crawls this address, so an unrelated site will fill your knowledge base with wrong facts."
                                error={formErrors.website_url}
                            >
                                <div className="relative">

                                    <Globe
                                        className="
                                 absolute
                                 left-4
                                 top-1/2
                                 -translate-y-1/2
                                 h-5
                                 w-5
                                 text-brand-500
                             "
                                    />

                                    <Input
                                        value={form.website_url}
                                        onChange={update("website_url")}
                                        placeholder="https://www.university.edu"
                                        className="pl-12"
                                        error={formErrors.website_url}
                                    />

                                </div>
                            </Field>

                        </div>

                        {/* Tagline */}

                        <Field
                            label="University Tagline"
                            hint="Short sentence shown to students"
                        >

                            <Input
                                value={form.tagline}
                                onChange={update("tagline")}
                                placeholder="Practical engineering for working professionals."
                            />

                        </Field>

                        {/* Description */}

                        <Field
                            label="Program Description"
                            hint="Explain your university and program."
                        >

                            <Textarea
                                rows={4}
                                value={form.description}
                                onChange={update("description")}
                                placeholder="Write a detailed description about your university..."
                                maxLength={500}
                                showCounter
                            />

                        </Field>

                        {/* Completion Box */}

                        <div
                            className="
             rounded-md
             border
           border-ink-200
           bg-ink-50
             px-2.5
             py-2
             "
                        >

                            <div className="flex items-center gap-3">

                                <CheckCircle2
                                    className="h-4 w-4 text-brand-600"
                                />

                                <div>

                                    <h4 className="text-sm font-semibold text-brand-700">

                                        Program Overview

                                    </h4>

                                    <p className="text-xs text-brand-600">

                                        These details appear across the student portal and are
                                        used by your AI assistant while answering queries.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </SectionCard>

                <SectionCard
                    id="contact"
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                    icon={Phone}
                    title="Contact Information"
                    subtitle="How students can reach your admissions office."
                    status={
                        form.contact_email &&
                            form.contact_phone &&
                            form.admissions_office_address
                            ? "Complete"
                            : "In Progress"
                    }
                >
                    <div className="space-y-4">

                        {/* Email & Phone */}

                        <div className="grid gap-4 md:grid-cols-2">

                            <Field
                                label="Contact Email"
                                hint="Official admissions email"
                                error={formErrors.contact_email}
                            >
                                <div className="relative">

                                    <svg
                                        className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-500"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M4 4h16v16H4z" />
                                        <path d="M22 6l-10 7L2 6" />
                                    </svg>

                                    <Input
                                        type="email"
                                        value={form.contact_email}
                                        onChange={update("contact_email")}
                                        placeholder="admissions@university.edu"
                                        className="pl-12"
                                        error={formErrors.contact_email}
                                    />

                                </div>
                            </Field>

                            <Field
                                label="Contact Phone"
                                hint="Admissions helpline"
                                error={formErrors.contact_phone}
                            >

                                <div className="relative">

                                    <Phone
                                        className="
                            absolute
                            left-4
                            top-1/2
                            h-5
                            w-5
                            -translate-y-1/2
                            text-brand-500
                        "
                                    />

                                    <Input
                                        value={form.contact_phone}
                                        onChange={update("contact_phone")}
                                        placeholder="+1 (555) 123-4567"
                                        className="pl-12"
                                        error={formErrors.contact_phone}
                                    />

                                </div>

                            </Field>

                        </div>

                        {/* Address */}

                        <Field
                            label="Admissions Office Address"
                            hint="Office location for student visits"
                        >

                            <div className="relative">

                                <MapPin
                                    className="
                        absolute
                        left-4
                        top-5
                        h-5
                        w-5
                        text-brand-500
                    "
                                />

                                <Textarea
                                    rows={3}
                                    value={form.admissions_office_address}
                                    onChange={update("admissions_office_address")}
                                    placeholder="123 University Avenue, Boston, Massachusetts"
                                    className="pl-12"
                                />

                            </div>

                        </Field>

                        {/* Information Card */}

                        <div
                            className="
                rounded-md
                border
                border-blue-100
                bg-blue-50
                px-2.5
                py-2
            "
                        >

                            <div className="flex items-center gap-2">

                                <Phone className="h-4 w-4 text-blue-600 mt-0.5" />

                                <div>

                                    <h4 className=" text-sm font-semibold text-blue-700">

                                        Student Contact Information

                                    </h4>

                                    <p className="mt-1 text-xs text-blue-600 leading-5">

                                        These contact details are displayed to prospective
                                        students and are also used by your AI assistant when
                                        answering questions related to admissions.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </SectionCard>

                <SectionCard
                    id="eligibility"
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                    icon={ShieldCheck}
                    title="Eligibility Criteria"
                    subtitle="Define the admission requirements for applicants."
                    status={
                        form.eligibility_criteria.length &&
                            form.eligibility_criteria.every((c) => c.criterion.trim() && c.detail.trim())
                            ? "Complete"
                            : "In Progress"
                    }
                >

                    <div className="space-y-4">

                        {/* Header */}

                        <div className="mb-2 flex items-center justify-between">

                            <div>

                                <h4 className="font-semibold text-ink-900">
                                    Admission Requirements
                                </h4>

                                <p className="text-xs text-ink-500">
                                    Add all the eligibility conditions students must satisfy.
                                </p>

                            </div>

                            <Button
                                type="button"
                                size="sm"
                                className="h-9 px-3 text-sm"
                                icon={Plus}
                                onClick={addCriterion}
                            >
                                Add Requirement
                            </Button>

                        </div>

                        {formErrors.eligibility_criteria && (
                            <p className="text-xs text-red-600">{formErrors.eligibility_criteria}</p>
                        )}

                        {/* Empty State */}

                        {form.eligibility_criteria.length === 0 && (

                            <div className="rounded-md border border-ink-200 bg-ink-50 p-4">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="h-5 w-5 text-brand-500 mt-0.5 shrink-0" />

                                    <div>
                                        <p className="text-sm font-medium text-ink-900">
                                            No eligibility criteria added.
                                        </p>

                                        <p className="mt-1 text-sm text-ink-600">
                                            Add admission requirements such as GPA, English proficiency,
                                            GRE, work experience, portfolios, or interviews.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        )}

                        {/* Requirement Cards */}

                        {form.eligibility_criteria.map((c, i) => (

                            <div

                                key={i}

                                className="
                    rounded-lg
                    border
                    border-ink-200
                    bg-white
                    px-3 py-2
                    
                    transition-all
                    hover:border-brand-300
                    
                "

                            >

                                <div className="flex items-center justify-between">

                                    <h4 className="text-sm font-semibold text-ink-900">
                                        Requirement {i + 1}
                                    </h4>

                                    <Button
                                        type="button"
                                        size="icon"
                                        className="h-8 w-8"
                                        variant="ghost"
                                        onClick={() => removeCriterion(i)}
                                    >

                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />

                                    </Button>

                                </div>

                                <div className="mt-1 grid gap-2 md:grid-cols-[320px_320px]">

                                    <Field
                                        labelClassName="text-xs font-medium"
                                        hintClassName="text-[11px]"
                                        label="Requirement"
                                        hint="Example: Minimum GPA"
                                    >

                                        <Input className="h-9 max-w-sm"
                                            value={c.criterion}
                                            onChange={(e) =>
                                                updateCriterion(
                                                    i,
                                                    "criterion",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Minimum GPA"
                                        />

                                    </Field>

                                    <Field
                                        label="Details"
                                        hint="Explain the requirement"
                                    >

                                        <Input
                                            className="h-9 text-xs"
                                            value={c.detail}
                                            onChange={(e) =>
                                                updateCriterion(
                                                    i,
                                                    "detail",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="3.0 on a 4.0 scale"
                                        />

                                    </Field>

                                </div>

                            </div>

                        ))}

                        {/* Bottom Information */}

                        <div
                            className="
                rounded-md
                border
                border-green-100
                bg-green-50
                px-2.5 py-2
            "
                        >

                            <div className="flex items-center gap-2">

                                <ShieldCheck
                                    className="
                        h-4
                        w-4
                        text-green-600
                        mt-1
                    "
                                />

                                <div>

                                    <h4
                                        className="
                            text-sm font-semibold
                            text-green-700
                        "
                                    >

                                        AI Recommendation

                                    </h4>

                                    <p
                                        className="
                            mt-1
                            text-xs
                            leading-4
                            text-green-600
                        "
                                    >

                                        These eligibility rules are used by your AI
                                        assistant to instantly answer student questions
                                        regarding admission requirements.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </SectionCard>

                <SectionCard
                    id="persona"
                    openSection={openSection}
                    setOpenSection={setOpenSection}
                    icon={MessageSquare}
                    title="AI Tone & Persona"
                    subtitle="Configure how your university AI assistant communicates."
                    status={
                        form.tone_descriptors.length &&
                            form.best_fit_notes &&
                            form.not_best_fit_notes &&
                            form.communication_style_notes &&
                            form.never_do_notes
                            ? "Complete"
                            : "In Progress"
                    }
                >

                    <div className="space-y-1.5">

                        {/* AI Notice */}

                        <div className="rounded-md border border-violet-100 bg-violet-50 px-3 py-2">

                            <div className="flex items-center gap-2">

                                <Sparkles className="mt-0.5 h-4 w-4 text-violet-600" />

                                <div>

                                    <h4 className="text-sm font-semibold text-violet-700">
                                        AI Personality
                                    </h4>

                                    <p className="text-[11px] leading-4  text-violet-600">
                                        These settings don't change university facts.
                                        They only control how your AI assistant speaks,
                                        greets students, and presents information.
                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                    {/* Tags */}

                    <Field
                        label="Tone Descriptors"
                        hint="Press Enter or comma after each word."
                    >

                        <TagInput
                            tags={form.tone_descriptors}
                            onChange={(tags) =>
                                setForm(f => ({
                                    ...f,
                                    tone_descriptors: tags
                                }))
                            }
                            placeholder="Friendly, Professional, Career-focused..."
                        />

                    </Field>

                    {/* Best & Not Best */}

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-green-700">
                                Best Fit For
                            </h3>

                            <Textarea
                                rows={2}
                                className="min-h-[72px]"
                                value={form.best_fit_notes}
                                onChange={update("best_fit_notes")}
                                maxLength={300}
                                showCounter
                                placeholder="Working professionals, software engineers, international students..."
                            />
                        </div>

                        <div>
                            <h3 className="mb-2 text-sm font-semibold text-red-700">
                                Not Best Fit For
                            </h3>

                            <Textarea
                                rows={2}
                                className="min-h-[72px]"
                                value={form.not_best_fit_notes}
                                onChange={update("not_best_fit_notes")}
                                maxLength={300}
                                showCounter
                                placeholder="Students seeking research-intensive programs..."
                            />
                        </div>
                    </div>

                    {/* Communication */}

                    <div className="space-y-2">

                        <h3 className="text-sm font-semibold">
                            Communication Style
                        </h3>

                        <Textarea
                            rows={3}
                            className="min-h-[90px]"
                            value={form.communication_style_notes}
                            onChange={update("communication_style_notes")}
                            maxLength={300}
                            showCounter
                            placeholder="How your AI should communicate"
                        />

                    </div>

                    {/* Never Do */}

                    <div className="space-y-1">

                        <h3 className="text-sm font-semibold">
                            Things the AI Should Never Do
                        </h3>

                        <p className="text-xs text-ink-500">
                            Protects your university from incorrect responses.
                        </p>

                        <Textarea
                            rows={2}
                            className="min-h-[70px]"
                            value={form.never_do_notes}
                            onChange={update("never_do_notes")}
                            maxLength={300}
                            showCounter
                            placeholder="Never guarantee admission, scholarships, visas or employment."
                        />



                    </div>

                </SectionCard>

                <StickySaveBar
                    progress={setupPercent(profile)}
                    saving={saving}
                />
            </form>
        </div>
    );
}

function AgentNameCard({ profile, onUpdated }) {
    const [name, setName] = useState(profile?.agent_name || "");
    const [copied, setCopied] = useState(false);

    useEffect(() => setName(profile?.agent_name || ""), [profile?.agent_name]);

    const { execute: save, loading, error } = useAction((agentName) =>
        universityAdminApi.updateAgentName(agentName)
    );

    const handleSave = async () => {
        try {
            await save(name);
            onUpdated((prev) => (prev ? { ...prev, agent_name: name } : prev));
            toast.success("Agent renamed");
        } catch (err) {
            toast.error(err.message);
        }
    };

    const copyId = async () => {
        await navigator.clipboard.writeText(profile.id);
        setCopied(true);
        toast.success("University ID copied");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader
                icon={Sparkles}
                title="Agent identity"
                className="pb-1"
            />

            <CardBody className="pt-1 pb-3 px-4">
                {error && <ErrorBanner error={error} className="mb-3" />}
                <div className="flex items-end gap-2 max-w-2xl">
                    <div className="flex-1">
                        <Field label="Agent name">
                            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                        </Field>
                    </div>
                    <Button className="h-9 px-4" onClick={handleSave} loading={loading} disabled={!name.trim() || name === profile?.agent_name}>
                        Rename
                    </Button>
                </div>

            </CardBody>
        </Card>
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
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1 focus-within:ring-2 focus-within:ring-brand-500/40 focus-within:border-brand-500">
            {tags.map((tag) => (
                <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700"
                >
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
function SectionCard({
    id,
    openSection,
    setOpenSection,
    icon: Icon,
    title,
    subtitle,
    status,
    children,
}) {
    const open = openSection === id;

    return (
        <Card className="overflow-hidden">

            <button
                type="button"
                onClick={() =>
                    setOpenSection(open ? "" : id)
                }
                className="
          flex
          w-full
          items-center
          justify-between
          px-4 py-2.5
          hover:bg-ink-50
          transition-all
        "
            >

                <div className="flex items-center gap-4">

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Icon className="h-4 w-4" />
                    </div>

                    <div className="text-left">

                        <h3 className="font-semibold text-ink-900">
                            {title}
                        </h3>


                        <p className="text-xs text-ink-500">
                            {subtitle}
                        </p>

                    </div>

                </div>

                <div className="flex items-center gap-3">

                    {status && (
                        <span
                            className={`
                rounded-full
                px-1.5
                py-0
                text-[11px]
                font-medium
                ${status === "Complete"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }
              `}
                        >
                            {status}
                        </span>
                    )}

                    {open ? (
                        <ChevronUp className="h-5 w-5 text-ink-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-ink-400" />
                    )}

                </div>

            </button>

            {open && (

                <div className="border-t border-ink-100">

                    <CardBody className="py-4">

                        {children}

                    </CardBody>

                </div>

            )}

        </Card>
    );
}

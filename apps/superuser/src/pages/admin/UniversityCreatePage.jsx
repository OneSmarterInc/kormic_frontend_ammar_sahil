import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Building2, UserPlus2 } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Textarea } from "../../components/common/Input";
import PasswordCreateFields from "../../components/common/PasswordCreateFields";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { createUniversity } from "../../api/superuserApi";
import { useAction } from "../../hooks/useAsync";

export default function UniversityCreatePage() {
  const navigate = useNavigate();
  const [institutionName, setInstitutionName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { execute, loading, error } = useAction(() => {
    const profile = {};
    if (description.trim()) profile.description = description.trim();
    if (contactEmail.trim()) profile.contact_email = contactEmail.trim();

    const payload = {
      institution_name: institutionName,
      email: adminEmail,
      password: adminPassword,
    };
    if (adminName.trim()) payload.name = adminName.trim();
    if (Object.keys(profile).length) payload.profile = profile;
    // NOTE: the backend should email the new admin their generated password
    // (with a note to change it) once the account is created — not implemented
    // here, this repo is frontend-only.
    return createUniversity(payload);
  });

  const errors = error?.data && typeof error.data === "object" ? error.data : {};
  const passwordsMismatch = confirmPassword.length > 0 && adminPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordsMismatch) return;
    try {
      const university = await execute();
      toast.success("University created");
      navigate(`/admin/universities/${university.id}`);
    } catch {
      // surfaced via error
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        onClick={() => navigate("/admin/universities")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to universities
      </button>

      <PageHeader
        title="Add university"
        description="Creates a new University row with a generated ID and agent name, plus its first admin login. Everything else can be filled in later."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader icon={Building2} title="University" />
            <CardBody className="space-y-4">
              {error && !Object.keys(errors).length && <ErrorBanner error={error} />}
              <Field
                label="University name"
                required
                hint="A unique university ID and agent name are generated automatically."
                error={errors.institution_name?.[0]}
              >
                <Input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Wright State University"
                  required
                />
              </Field>
              <Field label="Description" hint="Optional — can be edited later.">
                <Textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A great school."
                />
              </Field>
              <Field label="Contact email" hint="Optional — can be edited later.">
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="info@university.edu"
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={UserPlus2}
              title="Admin account"
              subtitle="Login handed to the university out-of-band — there's no self-signup screen for this."
            />
            <CardBody className="space-y-4">
              <Field label="Admin name" hint="Optional display name.">
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jane Registrar" />
              </Field>
              <Field label="Admin email" required error={errors.email?.[0]}>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@university.edu"
                  required
                />
              </Field>
              <PasswordCreateFields
                password={adminPassword}
                setPassword={setAdminPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                error={errors.password?.[0]}
              />
            </CardBody>
          </Card>
        </div>

        <Button type="submit" className="w-full" loading={loading} icon={Building2}>
          Create university
        </Button>
      </form>
    </div>
  );
}

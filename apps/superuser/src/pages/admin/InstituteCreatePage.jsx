import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Landmark, UserPlus2 } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input, Textarea } from "../../components/common/Input";
import PasswordCreateFields from "../../components/common/PasswordCreateFields";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { createInstitute } from "../../api/superuserApi";
import { useAction } from "../../hooks/useAsync";

export default function InstituteCreatePage() {
  const navigate = useNavigate();
  const [institutionName, setInstitutionName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { execute, loading, error } = useAction(() => {
    const payload = {
      institution_name: institutionName,
      email: adminEmail,
      password: adminPassword,
    };
    if (adminName.trim()) payload.name = adminName.trim();
    if (contactEmail.trim()) payload.contact_email = contactEmail.trim();
    if (contactPhone.trim()) payload.contact_phone = contactPhone.trim();
    if (address.trim()) payload.address = address.trim();
    // NOTE: the backend should email the new admin their generated password
    // (with a note to change it) once the account is created — not implemented
    // here, this repo is frontend-only.
    return createInstitute(payload);
  });

  const errors = error?.data && typeof error.data === "object" ? error.data : {};
  const passwordsMismatch = confirmPassword.length > 0 && adminPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordsMismatch) return;
    try {
      const institute = await execute();
      toast.success("Institute created");
      navigate(`/admin/institutes/${institute.id}`);
    } catch {
      // surfaced via error
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        onClick={() => navigate("/admin/institutes")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to institutes
      </button>

      <PageHeader
        title="Add institute"
        description="Creates a new feeder Institute with a generated ID, plus its first admin login. The admin uploads student rosters and can enroll their own TOTP on first login."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader icon={Landmark} title="Institute" />
            <CardBody className="space-y-4">
              {error && !Object.keys(errors).length && <ErrorBanner error={error} />}
              <Field
                label="Institute name"
                required
                hint="A unique institute ID is generated automatically."
                error={errors.institution_name?.[0]}
              >
                <Input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Wright State Feeder Institute"
                  required
                />
              </Field>
              <Field label="Contact email" hint="Optional — can be edited later.">
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ops@wsfi.edu"
                />
              </Field>
              <Field label="Contact phone" hint="Optional — can be edited later.">
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 937 555 0100"
                />
              </Field>
              <Field label="Address" hint="Optional — can be edited later.">
                <Textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Dayton, OH"
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={UserPlus2}
              title="Admin account"
              subtitle="Login handed to the institute out-of-band — there's no self-signup screen for this."
            />
            <CardBody className="space-y-4">
              <Field label="Admin name" hint="Optional display name.">
                <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Dr. John" />
              </Field>
              <Field label="Admin email" required error={errors.email?.[0]}>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="officer@wsfi.edu"
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

        <Button type="submit" className="w-full" loading={loading} icon={Landmark}>
          Create institute
        </Button>
      </form>
    </div>
  );
}

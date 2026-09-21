import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, GraduationCap, UserPlus2 } from "lucide-react";
import PageHeader from "../../components/layout/PageHeader";
import Card, { CardBody, CardHeader } from "../../components/common/Card";
import { Field, Input } from "../../components/common/Input";
import PasswordCreateFields from "../../components/common/PasswordCreateFields";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { createStudent } from "../../api/superuserApi";
import { useAction } from "../../hooks/useAsync";

export default function StudentCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { execute, loading, error } = useAction(() => {
    // NOTE: the backend should email the new student their generated password
    // (with a note to change it) once the account is created — not implemented
    // here, this repo is frontend-only.
    return createStudent({ name, email, password });
  });

  const errors = error?.data && typeof error.data === "object" ? error.data : {};
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passwordsMismatch) return;
    try {
      const student = await execute();
      toast.success("Student created");
      navigate(`/admin/students/${student.student_id}`);
    } catch {
      // surfaced via error
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button
        onClick={() => navigate("/admin/students")}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to students
      </button>

      <PageHeader
        title="Add student"
        description="Creates a new student login. The student can complete their profile, resume, and GitHub/LinkedIn connections after signing in."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader icon={GraduationCap} title="Student" />
            <CardBody className="space-y-4">
              {error && !Object.keys(errors).length && <ErrorBanner error={error} />}
              <Field label="Full name" required error={errors.name?.[0]}>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" required />
              </Field>
              <Field label="Email" required error={errors.email?.[0]}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@example.com"
                  required
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={UserPlus2}
              title="Account"
              subtitle="Login handed to the student out-of-band — there's no self-signup screen for this."
            />
            <CardBody className="space-y-4">
              <PasswordCreateFields
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                error={errors.password?.[0]}
              />
            </CardBody>
          </Card>
        </div>

        <Button type="submit" className="w-full" loading={loading} icon={GraduationCap}>
          Create student
        </Button>
      </form>
    </div>
  );
}

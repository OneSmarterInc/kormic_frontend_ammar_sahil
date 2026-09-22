import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Building2, School, UserPlus2 } from "lucide-react";
import UniversityAuthShell from "../../components/auth/UniversityAuthShell";
import { Field, Input } from "../../components/common/Input";
import Button from "../../components/common/Button";
import ErrorBanner from "../../components/common/ErrorBanner";
import { useAuth } from "../../context/AuthContext";
import { useAction, useAsync } from "../../hooks/useAsync";
import { getApiHome } from "../../api/metaApi";
import { roleHome } from "../../lib/constants";

// DRF field-validation errors look like {"email": ["..."]}; general failures use
// {"message"|"detail": "..."}. Split them apart so each field can show its own error.
function fieldErrors(error) {
  if (!error?.data || typeof error.data !== "object") return {};
  const { message: _message, detail: _detail, error: _err, ...rest } = error.data;
  return rest;
}

export default function UniversityRegisterPage() {
  const { status, user, registerAccount } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [universityId, setUniversityId] = useState("");

  // GET /api/ — public index, includes every registered university_id for a picker
  const { data: apiHome } = useAsync(getApiHome, []);
  const universityIds = apiHome?.university_ids || [];

  // POST /auth/register/ — role=university, plus either institution_name (creates a new
  // University row + generated id/agent name) or university_id (joins an existing one).
  const { execute, loading, error } = useAction(() =>
    registerAccount({
      role: "university",
      name,
      email,
      password,
      ...(mode === "new" ? { institution_name: institutionName } : { university_id: universityId }),
    })
  );

  if (status === "authenticated") return <Navigate to={roleHome(user)} replace />;
  if (status === "must_enroll_totp") return <Navigate to="/totp/enroll" replace />;

  const errors = fieldErrors(error);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await execute();
      navigate("/totp/enroll");
    } catch {
      // surfaced via error/errors
    }
  };

  return (
    <UniversityAuthShell
      eyebrow="Get started"
      title="Create your university account"
      subtitle="One account per officer — the first one sets up the agent, others just join."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && !Object.keys(errors).length && <ErrorBanner error={error} />}

        <Field label="This account is" required>
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === "new"}
              icon={Building2}
              label="A new university"
              onClick={() => setMode("new")}
            />
            <ModeButton
              active={mode === "join"}
              icon={UserPlus2}
              label="Joining a team"
              onClick={() => setMode("join")}
            />
          </div>
        </Field>

        <Field label="Your full name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>

        <Field label="Work email" required error={errors.email?.[0]}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        <Field label="Password" required error={errors.password?.[0]}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {mode === "new" ? (
          <Field
            label="Institution name"
            required
            hint="We'll generate a unique university ID and agent name automatically."
            error={errors.institution_name?.[0]}
          >
            <Input
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="Wright State University"
              required
            />
          </Field>
        ) : (
          <Field
            label="University ID"
            required
            hint="Ask a colleague who's already registered — it's shown on their Profile Settings page."
            error={errors.university_id?.[0]}
          >
            <Input
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              placeholder="wright_state_university"
              list="university-ids"
              required
            />
            <datalist id="university-ids">
              {universityIds.map((id) => (
                <option key={id} value={id} />
              ))}
            </datalist>
          </Field>
        )}

        <Button
           type="submit"
           className="
             w-full
             transition-all
             duration-300
             hover:scale-[1.02]
             hover:shadow-lg
           "
           loading={loading}
           icon={School}
         >
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-500">
        Already registered?{" "}
        <Link
           to="/login"
           className="
             font-medium
             text-brand-600
             transition-all
             duration-300
             hover:text-brand-800
             hover:underline
             underline-offset-4
           "
         >
          Log in
        </Link>
      </p>
    </UniversityAuthShell>
  );
}

function ModeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
         "group flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-xs font-medium cursor-pointer transition-all duration-300",
         active
           ? "border-brand-500 bg-brand-50 text-brand-700 shadow-md scale-[1.02]"
           : "border-ink-200 text-ink-500 hover:bg-brand-50 hover:border-brand-300 hover:shadow-md hover:-translate-y-1 hover:text-brand-700"
       )}
    >
      <Icon
         className="
           h-5
           w-5
           transition-transform
           duration-300
           group-hover:scale-110
           group-hover:rotate-6
         "
       />
      {label}
    </button>
  );
}

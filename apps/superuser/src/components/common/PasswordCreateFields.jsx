import { RefreshCw } from "lucide-react";
import { Field } from "./Input";
import PasswordInput from "./PasswordInput";
import Button from "./Button";
import { generatePassword } from "../../utils/password";

/**
 * Password + confirm-password pair for account-creation forms: a "Generate"
 * button fills the password field only — the confirm field must be entered
 * manually (typed or pasted) as a second check.
 */
export default function PasswordCreateFields({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
}) {
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <>
      <Field label="Password" required error={error}>
        <div className="flex gap-2">
          <div className="flex-1">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={() => setPassword(generatePassword())}
            title="Generate a random password"
          >
            Generate
          </Button>
        </div>
      </Field>
      <Field
        label="Confirm password"
        required
        error={mismatch ? "Passwords don't match" : undefined}
        hint={!mismatch ? "Re-enter the password above — it isn't filled in automatically." : undefined}
      >
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </Field>
    </>
  );
}

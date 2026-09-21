import { useState } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";

/** Drop-in replacement for `<Input type="password">` with a visibility toggle. */
export default function PasswordInput({ className, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={clsx("pr-10", className)} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

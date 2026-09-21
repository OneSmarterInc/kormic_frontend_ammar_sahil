import clsx from "clsx";
import { ChevronDown } from "lucide-react";

export function Field({ label, hint, error, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Input({ className, error, ...rest }) {
  return (
    <input
      className={clsx(
          "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink-900",
          "placeholder:text-ink-400",
          "transition-all duration-300",
          "hover:border-brand-300 hover:bg-brand-50/20",
          "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
          "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-300"
            : "border-ink-200",
          className
        )}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  error,
  value = "",
  maxLength,
  showCounter = false,
  ...rest
}) {
  return (
    <div>
      <textarea
        value={value}
        maxLength={maxLength}
        className={clsx(
          "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink-900",
          "placeholder:text-ink-400",
          "transition-all duration-300",
          "hover:border-brand-300 hover:bg-brand-50/20",
          "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
          "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-300"
            : "border-ink-200",
          className
        )}
        {...rest}
      />

      {showCounter && maxLength && (
        <div
          className={clsx(
            "mt-1 text-right text-xs transition-colors",
            value.length >= maxLength * 0.9
              ? "text-red-500"
              : "text-ink-400"
          )}
        >
          {value.length}/{maxLength}
        </div>
      )}
    </div>
  );
}

export function Select({ className, error, children, ...rest }) {
  return (
    <div className="relative">
      <select
        className={clsx(
          "w-full appearance-none truncate rounded-xl border bg-white py-2.5 pl-3 pr-9 text-sm text-ink-900 transition-all duration-300 hover:border-brand-300 hover:bg-brand-50/20",
          "focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
          error ? "border-red-400" : "border-ink-200",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

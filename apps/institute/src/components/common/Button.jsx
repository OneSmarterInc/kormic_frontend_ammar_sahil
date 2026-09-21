import clsx from "clsx";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-300",
  secondary:
    "bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 focus-visible:outline-brand-600 disabled:text-ink-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300",
  ghost: "text-ink-600 hover:bg-ink-100 focus-visible:outline-brand-600 disabled:text-ink-300",
};

const SIZES = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const ICON_SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className,
  disabled,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className={clsx(ICON_SIZES[size] || ICON_SIZES.md, "animate-spin")} />
      ) : (
        Icon && <Icon className={ICON_SIZES[size] || ICON_SIZES.md} />
      )}
      {children}
    </button>
  );
}

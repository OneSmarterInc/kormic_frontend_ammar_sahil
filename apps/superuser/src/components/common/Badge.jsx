import clsx from "clsx";

const TONES = {
  neutral: "bg-ink-100 text-ink-600",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

export default function Badge({ tone = "neutral", children, className }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}

export function roleTone(role) {
  switch (role) {
    case "superuser":
      return "brand";
    case "university":
      return "success";
    case "institute":
      return "warning";
    case "student":
      return "neutral";
    default:
      return "neutral";
  }
}

export function statusTone(isActive) {
  return isActive ? "success" : "danger";
}

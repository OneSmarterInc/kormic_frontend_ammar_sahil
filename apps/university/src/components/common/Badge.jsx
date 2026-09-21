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

export function matchTierTone(tier) {
  switch (tier) {
    case "strong_fit":
      return "success";
    case "good_fit":
      return "brand";
    case "reach_fit":
      return "warning";
    case "unlikely_fit":
      return "danger";
    case "unassessed":
      return "neutral";
    default:
      return "neutral";
  }
}

export function queryStatusTone(status) {
  switch (status) {
    case "urgent":
      return "danger";
    case "pending":
      return "warning";
    case "answered":
      return "success";
    default:
      return "neutral";
  }
}

export function autoDiscoverStatusTone(status) {
  switch (status) {
    case "running":
    case "queued":
      return "brand";
    case "stop_requested":
      return "warning";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "stopped":
      return "neutral";
    default:
      return "neutral";
  }
}

export function decisionStatusTone(status) {
  switch (status) {
    case "relevant":
      return "success";
    case "review":
      return "warning";
    case "excluded":
      return "neutral";
    default:
      return "neutral";
  }
}

/** confidence is a 0.0-1.0 float or null (pre-existing rows with no score recorded). */
export function confidenceTone(confidence) {
  if (confidence == null) return "neutral";
  if (confidence >= 0.7) return "success";
  if (confidence >= 0.4) return "warning";
  return "danger";
}

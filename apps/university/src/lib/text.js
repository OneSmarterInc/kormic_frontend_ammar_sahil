
/** Single shared "last updated"-style timestamp format, used everywhere a raw
 * ISO date needs to be shown to an officer. */
export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function previewText(text, maxLen = 140) {
  if (!text) return "";
  const clean = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[=\-_]{3,}$/.test(line) && line.toLowerCase() !== "ai profile summary")
    .join(" ");
  return clean.length > maxLen ? `${clean.slice(0, maxLen).trimEnd()}…` : clean;
}

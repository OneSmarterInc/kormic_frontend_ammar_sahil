import { AlertTriangle, X } from "lucide-react";

export default function ErrorBanner({ error, onDismiss, className = "" }) {
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  const status = typeof error === "object" ? error.status : null;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className}`}
      role="alert"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        {status && <span className="mr-1.5 font-mono text-xs text-red-500">[{status}]</span>}
        {message}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-red-500 hover:bg-red-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

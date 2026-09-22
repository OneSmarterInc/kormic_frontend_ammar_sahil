import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import clsx from "clsx";

const SIZES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  disableClose = false,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !disableClose && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, disableClose]);

  // Focus trap: move focus into the dialog on open, cycle Tab/Shift+Tab within its
  // focusable elements, and restore focus to whatever triggered the modal on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement;
    const node = dialogRef.current;
    const firstFocusable = node?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable || node)?.focus();

    const onKeyDown = (e) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (!disableClose) onClose?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[1px]"
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={clsx(
          "relative z-10 flex max-h-[85vh] w-full animate-fade-in flex-col rounded-2xl bg-white shadow-xl outline-none",
          SIZES[size] || SIZES.md
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <h3 id={titleId} className="min-w-0 truncate text-sm font-semibold text-ink-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={disableClose}
            aria-label="Close"
            className="shrink-0 rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}

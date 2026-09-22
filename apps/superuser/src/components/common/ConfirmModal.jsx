import Modal from "./Modal";
import Button from "./Button";
import ErrorBanner from "./ErrorBanner";

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  tone = "danger",
  loading = false,
  error = null,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <ErrorBanner error={error} />}
        <p className="text-sm leading-6 text-ink-600">{description}</p>
      </div>
    </Modal>
  );
}

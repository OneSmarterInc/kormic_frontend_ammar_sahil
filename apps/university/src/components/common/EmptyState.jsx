export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {Icon && (
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-400">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

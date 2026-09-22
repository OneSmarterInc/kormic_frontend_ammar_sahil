export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-500">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}
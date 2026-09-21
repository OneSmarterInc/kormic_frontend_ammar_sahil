import clsx from "clsx";

export default function Card({ className, children, ...rest }) {
  return (
    <div
      className={clsx(
        `
        overflow-hidden
       
        bg-white

        shadow-sm
        transition-all
        duration-300
        ease-out

        hover:-translate-y-[2px]
        hover:shadow-lg
        hover:border-ink-300
        `,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon: Icon,
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4

        border-b
        border-ink-100

        px-6
        py-5
      "
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <span
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center

              rounded-xl

              bg-brand-50
              text-brand-600

              shadow-sm
            "
          >
            <Icon className="h-5 w-5" />
          </span>
        )}

        <div>
          <h2
            className="
              text-lg
              font-semibold
              tracking-tight
              text-ink-900
            "
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="
                mt-1
                max-w-2xl
                text-sm
                leading-6
                text-ink-500
              "
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

export function CardBody({ className, children }) {
  return (
    <div
      className={clsx(
        `
        px-6
        py-6
        `,
        className
      )}
    >
      {children}
    </div>
  );
}
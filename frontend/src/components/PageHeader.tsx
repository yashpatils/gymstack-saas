import Link from "next/link";
import { Fragment, ReactNode } from "react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
};

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
          <ol className="flex flex-wrap items-center gap-2">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <Fragment key={`${item.label}-${index}`}>
                  {index > 0 ? <li aria-hidden="true">/</li> : null}
                  <li>
                    {item.href && !isLast ? (
                      <Link href={item.href} className="transition hover:text-slate-200">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "text-slate-200" : undefined}>{item.label}</span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="page-header mb-0">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
    </header>
  );
}

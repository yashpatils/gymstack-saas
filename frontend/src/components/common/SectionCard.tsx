import type { ReactNode } from "react";

export function SectionCard({
  title,
  actions,
  children,
  className = "",
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card-header">
        <h2 className="section-card-title">{title}</h2>
        {actions ? <div className="section-card-actions">{actions}</div> : null}
      </div>
      <div className="section-card-body">{children}</div>
    </section>
  );
}

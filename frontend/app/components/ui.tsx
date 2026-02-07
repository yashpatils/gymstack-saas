import React from "react";

type PageHeaderProps = {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
};

export function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="page">{children}</main>;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title">{children}</h2>;
}

export function Card({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {children ? <div className="section">{children}</div> : null}
      {footer ? <div className="section">{footer}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <p>{detail}</p>
    </div>
  );
}

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const className = tone ? `badge ${tone}` : "badge";
  return <span className={className}>{children}</span>;
}

export function Button({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "secondary" | "ghost";
}) {
  const className = variant ? `button ${variant}` : "button";
  return <button className={className}>{children}</button>;
}

export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`row-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AccessDenied({
  title,
  message,
  details,
}: {
  title: string;
  message: string;
  details?: string[];
}) {
  return (
    <div className="card access-denied">
      <h3 className="access-denied-title">{title}</h3>
      <p>{message}</p>
      {details?.length ? (
        <ul className="access-denied-list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

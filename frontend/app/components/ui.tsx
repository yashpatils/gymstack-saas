import React from "react";

export { Alert } from "./ui/alert";
export { Input } from "./ui/input";
export { Spinner } from "./ui/spinner";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "md" | "lg";
  className?: string;
};

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "button",
  secondary: "button secondary",
  outline: "button secondary",
  ghost: "button ghost",
};

export function Button({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonVariants[variant]} ${size} ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: "success" | "warning";
  className?: string;
}) {
  return (
    <span className={`badge ${tone ?? ""} ${className ?? ""}`}>
      {children}
    </span>
  );
}

export function Card({
  children,
  className,
  title,
  description,
  footer,
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className={`card ${className ?? ""}`}>
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {children}
      {footer ? <div className="card-footer">{footer}</div> : null}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`space-y-2 ${className ?? ""}`}>{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-white">{children}</h3>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300">{children}</p>;
}

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <main className={`page ${className ?? ""}`}>{children}</main>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title">{children}</h2>;
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}

export function Table({
  headers,
  rows,
}: {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
}) {
  return (
    <table className="table">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={`header-${index}`}>{header}</th>
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

export function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton ${className ?? ""}`} />;
}

export function EmptyState({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-icon">{icon}</div> : null}
      <div>
        <h3 className="empty-title">{title}</h3>
        <p className="empty-description">{description}</p>
      </div>
      {actions ? <div className="empty-actions">{actions}</div> : null}
    </div>
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
      <p>Your role doesn't allow this action.</p>
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

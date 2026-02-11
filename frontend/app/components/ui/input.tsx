import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  error?: string;
  rightElement?: React.ReactNode;
};

export function Input({
  label,
  helperText,
  error,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="block space-y-1.5 text-sm text-slate-100" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      <div className="relative">
        <input
          id={inputId}
          className={`h-11 w-full rounded-xl border bg-slate-950/60 px-3 pr-12 text-sm text-white placeholder:text-slate-400 focus:outline-none ${
            error
              ? "border-rose-400/70 focus:ring-2 focus:ring-rose-300/60"
              : "border-white/15 focus:border-indigo-300/70 focus:ring-2 focus:ring-indigo-300/40"
          } ${className ?? ""}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {rightElement ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">
            {rightElement}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-rose-300" role="alert" aria-live="polite">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-400">
          {helperText}
        </p>
      ) : null}
    </label>
  );
}

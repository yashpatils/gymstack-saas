import React from "react";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: "error" | "info";
};

export function Alert({
  tone = "info",
  className,
  ...props
}: AlertProps) {
  const styles =
    tone === "error"
      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
      : "border-sky-300/30 bg-sky-500/10 text-sky-100";

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${styles}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

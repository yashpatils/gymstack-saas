import React from "react";

export function Alert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "info";
}) {
  const styles =
    tone === "error"
      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
      : "border-sky-300/30 bg-sky-500/10 text-sky-100";

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles}`} role="alert">
      {children}
    </div>
  );
}

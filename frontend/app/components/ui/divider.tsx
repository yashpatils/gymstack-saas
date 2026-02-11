import React from "react";

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-white/15" />
      {label ? <span className="text-xs text-slate-400">{label}</span> : null}
      <div className="h-px flex-1 bg-white/15" />
    </div>
  );
}

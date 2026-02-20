"use client";

export function ModeToggle({
  activeMode,
  onSwitchMode,
  disabled = false,
}: {
  activeMode: "OWNER" | "MANAGER";
  onSwitchMode: (mode: "OWNER" | "MANAGER") => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 text-xs text-card-foreground backdrop-blur-xl" role="group" aria-label="View mode">
      <button type="button" className={`button button-sm ${activeMode === "OWNER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("OWNER")} aria-pressed={activeMode === "OWNER"} disabled={disabled}>Owner</button>
      <button type="button" className={`button button-sm ${activeMode === "MANAGER" ? "secondary" : "ghost"}`} onClick={() => onSwitchMode("MANAGER")} aria-pressed={activeMode === "MANAGER"} disabled={disabled}>Manager</button>
    </div>
  );
}

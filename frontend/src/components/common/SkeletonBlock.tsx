export function SkeletonBlock({ className = "h-5 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className}`} aria-hidden="true" />;
}

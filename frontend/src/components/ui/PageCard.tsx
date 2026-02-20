import * as React from "react";
import { cn } from "./utils";

type PageCardProps = React.HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function PageCard({ className, padded = true, ...props }: PageCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-foreground shadow-sm",
        padded ? "p-5" : "",
        className,
      )}
      {...props}
    />
  );
}

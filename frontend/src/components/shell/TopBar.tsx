"use client";

import * as React from "react";
import { cn } from "../ui/utils";

type TopBarProps = {
  title: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  centerSubtitle?: React.ReactNode;
};

function wrapTitleTwoLines(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 2) return title;
  const mid = Math.ceil(words.length / 2);
  return (
    <>
      <span className="block leading-tight">{words.slice(0, mid).join(" ")}</span>
      <span className="block leading-tight">{words.slice(mid).join(" ")}</span>
    </>
  );
}

export default function TopBar({ title, left, right, centerSubtitle }: TopBarProps) {
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl")}>
      <div className="mx-auto flex min-h-24 w-full max-w-[1600px] flex-col justify-center gap-3 px-4 py-4 md:px-6">
        <div className="relative flex min-w-0 items-center justify-center">
          <div className="text-center text-sm font-semibold leading-tight text-foreground/90">{wrapTitleTwoLines(title)}</div>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">{left}</div>
          <div className="flex min-w-0 items-center gap-2">{centerSubtitle}</div>
          <div className="flex shrink-0 items-center gap-2">{right}</div>
        </div>
      </div>
    </header>
  );
}

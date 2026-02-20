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
    <header className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-xl")}>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-2 px-4 py-3 md:px-6">
        <div className="relative flex items-center justify-center">
          <div className="text-center text-sm font-semibold text-foreground/90">{wrapTitleTwoLines(title)}</div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">{left}</div>
          <div className="flex items-center gap-2">{centerSubtitle}</div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import { cn } from "../ui/utils";
import { TOPBAR_HEIGHT } from "./shell-constants";

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
    <header
      className={cn("sticky top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-xl")}
      style={{ height: TOPBAR_HEIGHT }}
    >
      <div className="mx-auto h-full max-w-[1600px] px-4">
        <div className="grid h-full grid-rows-2 items-center gap-1 py-2">
          <div className="relative flex items-center justify-center">
            <div className="text-center text-sm font-semibold text-foreground/90">{wrapTitleTwoLines(title)}</div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">{left}</div>
            <div className="flex items-center gap-2">{centerSubtitle}</div>
            <div className="flex items-center gap-2">{right}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

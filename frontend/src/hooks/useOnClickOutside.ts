"use client";

import { useEffect, type RefObject } from "react";

export function useOnClickOutside(
  refs: Array<RefObject<HTMLElement | null>>,
  onOutside: () => void,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const clickedInside = refs.some((ref) => {
        const element = ref.current;
        return Boolean(element?.contains(target));
      });

      if (!clickedInside) {
        onOutside();
      }
    };

    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [enabled, onOutside, refs]);
}

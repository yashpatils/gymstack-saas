"use client";

import { useEffect, type RefObject } from "react";

export function useOnClickOutside(
  refs: Array<RefObject<HTMLElement>>,
  onOutside: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      const isInside = refs.some((ref) => {
        const element = ref.current;
        return Boolean(element?.contains(event.target));
      });

      if (!isInside) {
        onOutside();
      }
    };

    document.addEventListener("pointerdown", handler, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", handler, { capture: true });
    };
  }, [enabled, onOutside, refs]);
}

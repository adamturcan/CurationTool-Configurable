import { useEffect, type RefObject } from "react";

/**
 * Calls `deactivate` on a mousedown anywhere outside `insideRef`, except when the click lands on an element matching one of `exclusionSelectors` (their `closest()` is checked). 
 */
export function useClickOutsideDeactivation(
  insideRef: RefObject<HTMLElement | null>,
  deactivate: () => void,
  exclusionSelectors: string[]
): void {
  useEffect(() => {
    const exclusionSelector = exclusionSelectors.join(", ");

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (insideRef.current?.contains(target)) return;
      if (exclusionSelector && target.closest(exclusionSelector)) return;
      e.preventDefault();
      deactivate();
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [insideRef, deactivate, exclusionSelectors]);
}

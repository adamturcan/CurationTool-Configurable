import { useEffect, useRef, type RefObject } from "react";

const EDGE_SIZE = 60;
const MAX_SPEED = 12;

/**
 * Auto-scrolls a container while a drag of the given type hovers near its top/bottom edge.
 * Speed ramps with proximity to the edge (1..MAX_SPEED). Listens for `dragover`, `dragleave`, `drop`, and document `dragend` to cancel the RAF loop cleanly.
 */
export function useDragAutoScroll(
  containerRef: RefObject<HTMLElement | null>,
  dragType: string
): void {
  const speedRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tick = () => {
      if (speedRef.current !== 0) {
        container.scrollTop += speedRef.current;
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      const types = e.dataTransfer?.types;
      if (!types) return;
      if (!Array.from(types).includes(dragType)) return;

      const rect = container.getBoundingClientRect();
      const y = e.clientY;
      let speed = 0;

      if (y < rect.top + EDGE_SIZE) {
        const ratio = Math.max(0, 1 - (y - rect.top) / EDGE_SIZE);
        speed = -Math.max(1, Math.round(ratio * MAX_SPEED));
      } else if (y > rect.bottom - EDGE_SIZE) {
        const ratio = Math.max(0, 1 - (rect.bottom - y) / EDGE_SIZE);
        speed = Math.max(1, Math.round(ratio * MAX_SPEED));
      }

      const wasScrolling = speedRef.current !== 0;
      speedRef.current = speed;
      if (speed !== 0 && !wasScrolling) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const stopScroll = () => {
      speedRef.current = 0;
      cancelAnimationFrame(rafRef.current);
    };

    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("dragleave", stopScroll);
    container.addEventListener("drop", stopScroll);
    document.addEventListener("dragend", stopScroll);
    return () => {
      stopScroll();
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("dragleave", stopScroll);
      container.removeEventListener("drop", stopScroll);
      document.removeEventListener("dragend", stopScroll);
    };
  }, [containerRef, dragType]);
}

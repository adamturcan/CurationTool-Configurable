import { useCallback, useRef, useState } from "react";
import { type ConflictPrompt } from "../../core/services/resolveApiSpanConflicts";

/**
 * Bridges the synchronous-looking async API `requestConflictResolution(prompt) → Promise<choice>` with React state for the dialog UI.
 * `requestConflictResolution` stores the resolver in a ref and shows the dialog; `resolveConflictPrompt(choice)` settles the promise and clears state.
 * Workflow services can therefore `await onConflict(prompt)` and pause mid-iteration without leaking React-specific state into the application layer.
 * The non-obvious detail is that the resolver is held in a ref, not state — calling it doesn't trigger a re-render, only the subsequent `setConflictPrompt(null)` does.
 */
export function useConflictResolution() {
  const [conflictPrompt, setConflictPrompt] = useState<ConflictPrompt | null>(null);
  const conflictResolverRef = useRef<((choice: "api" | "existing") => void) | null>(null);
  
  const requestConflictResolution = useCallback((prompt: ConflictPrompt) =>
    new Promise<"api" | "existing">((resolve) => {
      conflictResolverRef.current = resolve;
      setConflictPrompt(prompt);
    }), []);
  
  const resolveConflictPrompt = useCallback((choice: "api" | "existing") => {
    conflictResolverRef.current?.(choice);
    conflictResolverRef.current = null;
    setConflictPrompt(null);
  }, []);

  return {
    conflictPrompt,
    requestConflictResolution,
    resolveConflictPrompt,
  };
}

import { useCallback } from "react";
import { useSessionStore } from "../stores";
import type { AnnotationResult } from "../../application/workflows/AnnotationWorkflowService";
import type { AnnotationLayer } from "../../types";

/**
 * Helpers for reading and patching annotation layers (the original document and its translations) through a uniform interface, so call sites do not branch on `lang === "original"`.
 */
export function useLayerOperations() {
  const session = useSessionStore((s) => s.session);
  const draftText = useSessionStore((s) => s.draftText);
  const updateSession = useSessionStore((s) => s.updateSession);

  /** Builds an `AnnotationLayer` snapshot for the given language, or `null` if the layer does not exist. */
  const resolveLayer = useCallback(
    (lang: string): AnnotationLayer | null => {
      if (!session) return null;
      if (lang === "original") {
        return {
          text: session.text || draftText || "",
          userSpans: session.userSpans ?? [],
          apiSpans: session.apiSpans ?? [],
        };
      }
      const t = session.translations?.find((tr) => tr.language === lang);
      if (!t) return null;
      return {
        text: t.text || "",
        userSpans: t.userSpans ?? [],
        apiSpans: t.apiSpans ?? [],
        segmentTranslations: t.segmentTranslations,
        editedSegmentTranslations: t.editedSegmentTranslations,
      };
    },
    [session, draftText]
  );

  /** Merges a layer patch into the session store, into either the root or the matching translation entry. */
  const applyLayerPatch = useCallback(
    (lang: string, patch: AnnotationResult["layerPatch"]) => {
      if (!patch) return;
      if (lang === "original") {
        updateSession(patch);
      } else {
        const currentSession = useSessionStore.getState().session;
        const translations = (currentSession?.translations || []).map((t) =>
          t.language === lang ? { ...t, ...patch } : t
        );
        updateSession({ translations });
      }
    },
    [updateSession]
  );

  /** Marks a segment as edited so re-running NER or translation keeps the user's changes. */
  const markSegmentEdited = useCallback(
    (segmentId: string | undefined, lang: string) => {
      const currentSession = useSessionStore.getState().session;
      if (!segmentId || !currentSession) return;
      if (lang === "original") {
        const updatedSegments = (currentSession.segments || []).map((s) =>
          s.id === segmentId ? { ...s, isEdited: true } : s
        );
        updateSession({ segments: updatedSegments });
      } else {
        const translations = (currentSession.translations || []).map((t) =>
          t.language === lang
            ? {
                ...t,
                editedSegmentTranslations: {
                  ...(t.editedSegmentTranslations || {}),
                  [segmentId]: true,
                },
              }
            : t
        );
        updateSession({ translations });
      }
    },
    [updateSession]
  );

  return { resolveLayer, applyLayerPatch, markSegmentEdited };
}

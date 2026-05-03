import type { AnnotationLayer, Segment, TranslationDTO } from "../../types";

/** Identifies a missing translation for a specific segment and language. */
export type TranslationGap = {
  lang: string;
  segmentId: string;
  segmentOrder: number;
};

/**
 * Pure functions for translation completeness rules.
 * A workspace is "fully translated" to a language when, for each segment, a `segmentTranslations` entry exists; or, for an unsegmented workspace when the translation `text` is non-empty.
 *
 * @category Entities
 */
export const TranslationLogic = {

  /** True when this translation covers every segment (or has non-empty text in unsegmented mode). */
  isFullyTranslated(translation: TranslationDTO, segments: Segment[]): boolean {
    if (segments.length === 0) {
      return !!translation.text;
    }
    return segments.every(
      (s) => translation.segmentTranslations?.[s.id] !== undefined
    );
  },

  /** Set of language codes whose translation is fully populated for these segments. */
  getFullyTranslatedLanguages(
    translations: TranslationDTO[],
    segments: Segment[]
  ): Set<string> {
    return new Set(
      translations
        .filter((t) => TranslationLogic.isFullyTranslated(t, segments))
        .map((t) => t.language)
    );
  },

  /** Language codes that have a translation entry for the given segment id. */
  getLanguagesWithSegmentTranslation(
    translations: TranslationDTO[],
    segmentId: string
  ): string[] {
    return translations
      .filter((t) => t.segmentTranslations?.[segmentId] !== undefined)
      .map((t) => t.language);
  },

  /** True when the segment has been manually edited in the given language ("original" or a translation code). */
  isSegmentEdited(
    segment: Segment,
    translations: TranslationDTO[],
    language: string
  ): boolean {
    if (language === "original") return !!segment.isEdited;
    const tLayer = translations.find((t) => t.language === language);
    return !!tLayer?.editedSegmentTranslations?.[segment.id];
  },

  /** Returns the translation entry for `language`, or undefined when absent. */
  findByLanguage(
    translations: TranslationDTO[],
    language: string
  ): TranslationDTO | undefined {
    return translations.find((t) => t.language === language);
  },

  /** True when the translation has a non-empty entry (after trim) for `segmentId`. */
  hasSegmentTranslation(
    translation: TranslationDTO,
    segmentId: string
  ): boolean {
    return !!translation.segmentTranslations?.[segmentId]?.trim();
  },

  /** Packs a TranslationDTO into the AnnotationLayer shape used by the editor. */
  toAnnotationLayer(translation: TranslationDTO): AnnotationLayer {
    return {
      text: translation.text ?? "",
      userSpans: translation.userSpans ?? [],
      apiSpans: translation.apiSpans ?? [],
      segmentTranslations: translation.segmentTranslations,
      editedSegmentTranslations: translation.editedSegmentTranslations,
    };
  },

  /**
   * Detects gaps where a language has a translation for some of `segmentIds` but not others.
   * Languages that have no translations for any of these segments, or all of them, are skipped.
   * Uses the `.trim()` non-empty rule so whitespace-only entries count as missing.
   */
  detectTranslationGaps(
    segmentIds: string[],
    segments: Segment[],
    translations: TranslationDTO[]
  ): TranslationGap[] {
    const gaps: TranslationGap[] = [];
    const orderMap = new Map(segments.map((s) => [s.id, s.order]));

    for (const t of translations) {
      const hasList = segmentIds.map((id) =>
        TranslationLogic.hasSegmentTranslation(t, id)
      );
      const someHave = hasList.some(Boolean);
      const allHave = hasList.every(Boolean);

      if (someHave && !allHave) {
        for (let i = 0; i < segmentIds.length; i++) {
          if (!hasList[i]) {
            gaps.push({
              lang: t.language,
              segmentId: segmentIds[i],
              segmentOrder: orderMap.get(segmentIds[i]) ?? i,
            });
          }
        }
      }
    }

    return gaps;
  },
};

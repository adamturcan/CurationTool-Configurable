/**
 * Server-side validation for workspace DTOs sent to POST/PUT workspace routes.
 * Mirrors the client-side `requireWorkspaceName` invariant and adds basic shape/integrity checks (segment offsets, span ranges, tag well-formedness).
 *
 * Returns `null` when the body is acceptable, otherwise a human-readable error string suitable for a 400 response.
 */

const NAME_MAX = 200;
const TAG_NAME_MAX = 200;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

interface ValidateOpts {
  /** Max allowed character length for `text` and translation `text`. */
  textLimit?: number;
  /** When true, only validates fields that are present (used by PUT /segments). */
  partial?: boolean;
}

/** Validates a span: offsets in range and `entity` is a string. */
function validateSpan(span: unknown, textLen: number, label: string): string | null {
  if (!isPlainObject(span)) return `${label}: each span must be an object`;
  const { start, end, entity } = span;
  if (typeof start !== 'number' || typeof end !== 'number') return `${label}: span start/end must be numbers`;
  if (start < 0 || end < start) return `${label}: span has invalid range`;
  if (textLen > 0 && end > textLen) return `${label}: span end exceeds text length`;
  if (typeof entity !== 'string' || entity.length === 0) return `${label}: span entity must be a non-empty string`;
  return null;
}

export function validateWorkspaceDto(body: unknown, opts: ValidateOpts = {}): string | null {
  const textLimit = opts.textLimit ?? parseInt(process.env.MAX_TEXT_LENGTH ?? '50000', 10);
  const partial = opts.partial ?? false;

  if (!isPlainObject(body)) return 'Request body must be an object';

  const dto = body as Record<string, unknown>;

  if (!partial) {
    if (typeof dto.name !== 'string') return 'name is required';
    const trimmed = dto.name.trim();
    if (trimmed.length === 0) return 'name must not be empty';
    if (dto.name.length > NAME_MAX) return `name must be at most ${NAME_MAX} characters`;
  }

  let textLen = 0;
  if (dto.text !== undefined) {
    if (typeof dto.text !== 'string') return 'text must be a string';
    if (dto.text.length > textLimit) return `text too long (max ${textLimit.toLocaleString()} characters)`;
    textLen = dto.text.length;
  }

  if (dto.segments !== undefined) {
    if (!Array.isArray(dto.segments)) return 'segments must be an array';
    for (const seg of dto.segments) {
      if (!isPlainObject(seg)) return 'segments: each segment must be an object';
      if (typeof seg.id !== 'string' || seg.id.length === 0) return 'segments: id must be a non-empty string';
      if (typeof seg.start !== 'number' || typeof seg.end !== 'number') return 'segments: start/end must be numbers';
      if (seg.start < 0 || seg.end < seg.start) return 'segments: invalid range';
      if (textLen > 0 && seg.end > textLen) return 'segments: end exceeds text length';
      if (typeof seg.text !== 'string') return 'segments: text must be a string';
      if (typeof seg.order !== 'number') return 'segments: order must be a number';
    }
  }

  if (dto.userSpans !== undefined) {
    if (!Array.isArray(dto.userSpans)) return 'userSpans must be an array';
    for (const s of dto.userSpans) {
      const err = validateSpan(s, textLen, 'userSpans');
      if (err) return err;
    }
  }

  if (dto.apiSpans !== undefined) {
    if (!Array.isArray(dto.apiSpans)) return 'apiSpans must be an array';
    for (const s of dto.apiSpans) {
      const err = validateSpan(s, textLen, 'apiSpans');
      if (err) return err;
    }
  }

  if (dto.tags !== undefined) {
    if (!Array.isArray(dto.tags)) return 'tags must be an array';
    for (const tag of dto.tags) {
      if (!isPlainObject(tag)) return 'tags: each tag must be an object';
      if (typeof tag.name !== 'string' || tag.name.length === 0) return 'tags: name must be a non-empty string';
      if (tag.name.length > TAG_NAME_MAX) return `tags: name must be at most ${TAG_NAME_MAX} characters`;
      if (tag.source !== 'api' && tag.source !== 'user') return "tags: source must be 'api' or 'user'";
    }
  }

  if (dto.translations !== undefined) {
    if (!Array.isArray(dto.translations)) return 'translations must be an array';
    for (const tr of dto.translations) {
      if (!isPlainObject(tr)) return 'translations: each entry must be an object';
      if (typeof tr.language !== 'string' || tr.language.length === 0) return 'translations: language must be a non-empty string';
      if (typeof tr.text !== 'string') return 'translations: text must be a string';
      if ((tr.text as string).length > textLimit) return `translations: text too long (max ${textLimit.toLocaleString()} characters)`;
    }
  }

  if (dto.counters !== undefined && !isPlainObject(dto.counters)) {
    return 'counters must be an object';
  }

  return null;
}

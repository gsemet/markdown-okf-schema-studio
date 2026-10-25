export interface TextReplacement {
  start: number;
  end: number;
  text: string;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-042
/**
 * Smallest single replacement turning `before` into `after`. Offsets are in `before`.
 * The range never splits a CRLF pair or a UTF-16 surrogate pair.
 */
export function minimalReplacement(before: string, after: string): TextReplacement {
  const limit = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < limit && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix += 1;
  // Boundary inside a pair: move it outward (towards the start of the text).
  while (prefix > 0 && (
    (before[prefix - 1] === "\r" && before[prefix] === "\n")
    || (after[prefix - 1] === "\r" && after[prefix] === "\n")
    || (isHighSurrogate(before.charCodeAt(prefix - 1)) && isLowSurrogate(before.charCodeAt(prefix)))
    || (isHighSurrogate(after.charCodeAt(prefix - 1)) && isLowSurrogate(after.charCodeAt(prefix)))
  )) {
    prefix -= 1;
  }
  let suffix = 0;
  while (
    suffix < limit - prefix
    && before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)
  ) {
    suffix += 1;
  }
  // The suffix boundary sits at before.length - suffix (and after.length - suffix).
  while (suffix > 0) {
    const beforeBoundary = before.length - suffix;
    const afterBoundary = after.length - suffix;
    if (
      (before[beforeBoundary - 1] === "\r" && before[beforeBoundary] === "\n")
      || (after[afterBoundary - 1] === "\r" && after[afterBoundary] === "\n")
      || (isHighSurrogate(before.charCodeAt(beforeBoundary - 1)) && isLowSurrogate(before.charCodeAt(beforeBoundary)))
      || (isHighSurrogate(after.charCodeAt(afterBoundary - 1)) && isLowSurrogate(after.charCodeAt(afterBoundary)))
    ) {
      suffix -= 1;
    } else {
      break;
    }
  }
  return { start: prefix, end: before.length - suffix, text: after.slice(prefix, after.length - suffix) };
}

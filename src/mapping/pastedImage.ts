/**
 * Pure helpers behind pasting an image into the block editor: which image type the first bytes
 * show, and the next free file name next to the document. The page only sends the pixels; the
 * file name is always chosen here, never taken from page data. This module must not import
 * `vscode`.
 */

export type PastedImageType = "png" | "jpeg" | "gif" | "webp";

/** The extension a type is saved with. */
export const PASTED_IMAGE_EXTENSION: Record<PastedImageType, string> = {
  png: "png", jpeg: "jpg", gif: "gif", webp: "webp",
};

/** The MIME types the page may announce (no SVG: it can carry script). */
export const PASTED_IMAGE_MIME_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Largest image accepted, in bytes (D8). */
export const MAX_PASTED_IMAGE_BYTES = 10 * 1024 * 1024;

/** Base64 of the largest image, with the padding and a margin for the data-URL framing. */
export const MAX_PASTED_IMAGE_BASE64_LENGTH = 14_000_000;

const MAX_SUFFIX = 1000;

/** The image type shown by the magic bytes of `bytes`, or `undefined` when none is allowed. */
export function sniffImage(bytes: Uint8Array): PastedImageType | undefined {
  const startsWith = (signature: readonly number[], offset = 0): boolean =>
    bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith([0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return "gif";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return undefined;
}

/** The type a MIME type announces, or `undefined`. */
export function imageTypeOfMime(mime: string): PastedImageType | undefined {
  switch (mime) {
    case "image/png": return "png";
    case "image/jpeg": return "jpeg";
    case "image/gif": return "gif";
    case "image/webp": return "webp";
    default: return undefined;
  }
}

/** Plain base64 only: the alphabet, optional padding, no whitespace. */
export function isBase64(value: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/u.test(value) && value.length % 4 === 0;
}

/**
 * `image.ext`, then `image-1.ext`, `image-2.ext` … the first name not in `existing` (compared
 * case-insensitively, as file systems often are); `undefined` after 1000 suffixes.
 */
export function nextImageName(existing: ReadonlySet<string>, extension: string): string | undefined {
  const taken = new Set([...existing].map((name) => name.toLowerCase()));
  for (let index = 0; index <= MAX_SUFFIX; index += 1) {
    const name = index === 0 ? `image.${extension}` : `image-${index}.${extension}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return undefined;
}

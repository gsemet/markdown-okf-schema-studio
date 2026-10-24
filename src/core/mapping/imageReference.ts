/**
 * Pure helpers behind the image picker of the block editor: the reference of a picked image file
 * seen from the document, and the file types that are accepted. This module must not import
 * `vscode`.
 */

import * as path from "node:path";

/** Image types a reference may point to (nothing is read or written, so SVG is fine). */
export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

const IMAGE_NAME = /\.(?:png|jpe?g|gif|webp|svg)$/iu;

export function isImageFileName(name: string): boolean {
  return IMAGE_NAME.test(name);
}

/**
 * The path of `image` seen from the folder of `document`: relative, POSIX separators, spaces kept
 * (the editor wraps it in `<…>` where the syntax needs it). `undefined` when no relative path
 * exists (another Windows drive), the target is the folder itself, or the name holds a character
 * a reference cannot carry (angle brackets, line breaks).
 */
export function relativeImageReference(document: string, image: string): string | undefined {
  const windows = document.includes("\\") || image.includes("\\");
  const flavour = windows ? path.win32 : path.posix;
  const relative = flavour.relative(flavour.dirname(document), image);
  // Another Windows drive has no relative path: relative() returns the absolute target.
  if (relative === "" || flavour.isAbsolute(relative)) return undefined;
  const posix = relative.split(flavour.sep).join("/");
  return /[<>\r\n]/u.test(posix) ? undefined : posix;
}

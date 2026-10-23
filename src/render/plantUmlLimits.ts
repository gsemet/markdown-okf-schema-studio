/**
 * Limits shared by both PlantUML engines (the JAR pipeline on the host and the built-in engine in
 * the webview). This module has no imports: the webview bundle includes it.
 */

/** Longest diagram source either engine renders (UTF-16 code units, `string.length`). */
export const MAX_PLANTUML_SOURCE_LENGTH = 1024 * 1024;

/** Nesting depth of local `!include` files in the built-in engine (as for `{include}`). */
export const PLANTUML_INCLUDE_MAX_DEPTH = 8;

/** Distinct local files one diagram of the built-in engine may include. */
export const PLANTUML_INCLUDE_MAX_FILES = 64;

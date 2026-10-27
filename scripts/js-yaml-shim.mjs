/**
 * Stands in for `js-yaml` in the extension bundle (`esbuild.mjs` aliases it), so the bundle carries
 * one YAML library, `yaml`, instead of two. The MyST engine reads directive options and tags with
 * `yaml.load(text)` and nothing else of `js-yaml`; this keeps that call and its two observable
 * habits: an empty text loads as `undefined`, and `<<` merge keys work. A malformed text throws,
 * as `js-yaml` does, and the engine reports it as an invalid option.
 */
import { parse } from "yaml";

/**
 * @param {string} text
 * @returns {unknown}
 */
export function load(text) {
  if (String(text).trim() === "") return undefined;
  return parse(String(text), { merge: true, logLevel: "silent" });
}

export default { load };

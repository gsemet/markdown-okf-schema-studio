/**
 * Find in the preview: compiling the query and finding the matches in one piece of rendered text.
 * Pure module: no host API, no DOM, no Node built-ins. The page walks the rendered text and calls
 * these functions for each text block; the replacement text of a regular expression match is
 * expanded here as well, so the host receives the final text.
 */

/** The three toggles of the find bar. */
export interface FindOptions {
  readonly matchCase: boolean;
  readonly wholeWord: boolean;
  readonly regex: boolean;
}

/** A compiled query, or why it cannot be compiled. */
export type FindPattern = { readonly pattern: RegExp } | { readonly error: string };

/** Most matches the page highlights; beyond it the count shows the limit and the rest is ignored. */
export const MAX_FIND_MATCHES = 10000;

/** A match in one text: `end` is exclusive; `groups` is the regular expression result (index 0 is the match). */
export interface FindMatch {
  readonly start: number;
  readonly end: number;
  readonly groups: readonly (string | undefined)[];
  readonly named?: Readonly<Record<string, string | undefined>>;
}

/** A letter, digit or underscore: the characters of a word. */
const WORD_CHAR = "[\\p{L}\\p{N}_]";

const escapeLiteral = (query: string): string => query.replace(/[.*+?^${}()|[\]\\/]/gu, "\\$&");

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-011
/**
 * Compiles `query` for the options. A literal query is escaped; a whole-word query must start and
 * end between non-word characters. An empty query has no pattern (nothing is searched); a regular
 * expression the engine rejects answers with the reason.
 */
export function compileFind(query: string, options: FindOptions): FindPattern | undefined {
  if (query === "") return undefined;
  const body = options.regex ? query : escapeLiteral(query);
  const source = options.wholeWord ? `(?<!${WORD_CHAR})(?:${body})(?!${WORD_CHAR})` : body;
  try {
    return { pattern: new RegExp(source, options.matchCase ? "gu" : "giu") };
  } catch (error) {
    return { error: error instanceof Error ? error.message.replace(/^Invalid regular expression: /u, "") : "Invalid regular expression" };
  }
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-010
/**
 * The non-empty matches of `pattern` in `text`, in order, at most `limit`. An empty match (`a*`
 * between letters) is skipped and the search moves on by one character.
 */
export function findInText(text: string, pattern: RegExp, limit = MAX_FIND_MATCHES): FindMatch[] {
  const matches: FindMatch[] = [];
  const search = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (let found = search.exec(text); found !== null && matches.length < limit; found = search.exec(text)) {
    if (found[0] === "") {
      search.lastIndex += 1;
      continue;
    }
    matches.push({ start: found.index, end: found.index + found[0].length, groups: [...found], named: found.groups });
  }
  return matches;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-012
/**
 * The replacement text of one match. Literal mode inserts `template` as typed. Regular expression
 * mode reads `$&` (the match), `$1`..`$99` (a group), `$<name>` and `$$` (a dollar sign); a `$n` of
 * a group the pattern does not have stays as typed.
 */
export function expandReplacement(template: string, match: FindMatch, regex: boolean): string {
  if (!regex) return template;
  return template.replace(/\$(\$|&|<([^>]*)>|(\d{1,2}))/gu, (token, kind: string, name: string | undefined, digits: string | undefined) => {
    if (kind === "$") return "$";
    if (kind === "&") return match.groups[0] ?? "";
    if (name !== undefined) return match.named?.[name] ?? token;
    let index = Number(digits);
    // "$12" with only 9 groups is "$1" followed by "2", as String.prototype.replace reads it.
    if (index >= match.groups.length && (digits as string).length === 2) index = Number((digits as string)[0]);
    if (index < 1 || index >= match.groups.length) return token;
    const used = String(index);
    return (match.groups[index] ?? "") + (digits as string).slice(used.length);
  });
}

/** The start offsets of every occurrence of `needle` in `text`, overlapping ones included. */
export function occurrenceStarts(text: string, needle: string): number[] {
  const starts: number[] = [];
  if (needle === "") return starts;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + 1)) starts.push(at);
  return starts;
}

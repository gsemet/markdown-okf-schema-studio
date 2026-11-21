/**
 * The opening policy of Studio, pure: which Studio tab a file shown in Studio ends up in. The host
 * (`host-vscode/studioPlacement.ts`) feeds it the groups that hold a Studio tab of the same file.
 */

/** What the reader asked for: a plain opening, or a jump to a line (a search result, a link). */
export type StudioOpeningAction = "studio" | "studio-at-line";

/** An editor group holding a Studio tab of the file, with how recently the tab was active (higher is later). */
export interface StudioTabGroup {
  readonly viewColumn: number;
  readonly lastActive: number;
}

/** Reveal the Studio tab of a group, or open a new Studio tab in a group. */
export type StudioTarget =
  | { readonly kind: "reveal"; readonly viewColumn: number }
  | { readonly kind: "open"; readonly viewColumn: number };

// @implements_req SwRS-MDOKFSTUDIO-LIFE-183
/**
 * The Studio tab to use for a file whose text tab sits in `textTabGroup`. A Studio tab of the file
 * in that group is revealed. In other groups only: a jump reveals the most recently active one (no
 * new tab), a plain opening opens a new Studio tab in the text tab's group, as the editor
 * association does. With no Studio tab of the file, a new one opens in the text tab's group.
 */
export function studioTargetFor(
  action: StudioOpeningAction,
  textTabGroup: number,
  studioTabs: readonly StudioTabGroup[],
): StudioTarget {
  if (studioTabs.some((group) => group.viewColumn === textTabGroup)) {
    return { kind: "reveal", viewColumn: textTabGroup };
  }
  if (action === "studio-at-line" && studioTabs.length > 0) {
    const latest = studioTabs.reduce((best, group) => (group.lastActive > best.lastActive ? group : best));
    return { kind: "reveal", viewColumn: latest.viewColumn };
  }
  return { kind: "open", viewColumn: textTabGroup };
}

/** The kind of an opened tab, from the input VS Code gives it. */
export type OpenedTabKind = "text" | "diff" | "merge" | "custom" | "other";

/** What the host knows about a newly opened tab when the watcher asks the policy. */
export interface OpeningFacts {
  readonly kind: OpenedTabKind;
  /** True for a saved `file:` document with the `.md` extension (`isDocumentEligible` and the scheme). */
  readonly eligible: boolean;
  /** False when the same text tab was already open (a jump into it opens no editor). */
  readonly isNew: boolean;
  /** True when the tab was open when the watcher started (restored with the window, or open before activation). */
  readonly presentAtStart: boolean;
  /** True for the opening that triggered the activation; only set when a proved signal tells it from a restored tab. */
  readonly triggeredActivation: boolean;
  /** The 1-based line the opening carries (its selection), or undefined for a plain opening. */
  readonly line: number | undefined;
  readonly searchResultsInStudio: boolean;
  readonly markdownFilesInStudio: boolean;
  /** True when the text editor was reopened as text from a Studio tab on purpose. */
  readonly reopenedAsText: boolean;
  /** True when Studio itself opened this text editor (its own navigation, "Open as Text"). */
  readonly openedByStudio: boolean;
  /** True while a side preview that follows the active editor is open. */
  readonly sidePreviewFollowsActiveEditor: boolean;
}

/** Keep the text editor, or replace it by the Studio tab (at a line, or with none). */
export type OpeningDecision =
  | { readonly kind: "keep" }
  | { readonly kind: "studio-at-line"; readonly line: number }
  | { readonly kind: "studio" };

const KEEP: OpeningDecision = { kind: "keep" };

// @implements_req SwRS-MDOKFSTUDIO-LIFE-184
/**
 * What to do with a newly opened tab, by the first rule that applies: 1. keep anything that is not
 * a text tab; 2. keep what is not an eligible saved `file:` `.md`; 3. keep a tab that is not new,
 * and a tab present at start unless it is the opening that triggered the activation; 4. keep a text
 * editor Studio opened itself; 5. keep a plain opening that is a text editor reopened as text on purpose (a jump is not); 6. keep a jump
 * while a side preview that follows the active editor is open; 7. with "Open Markdown files in
 * Studio" on: Studio at the line, or Studio; 8. with "Open search results in Studio" on and a line:
 * Studio at the line; 9. otherwise keep.
 */
export function openingDecision(facts: OpeningFacts): OpeningDecision {
  if (facts.kind !== "text") return KEEP;
  if (!facts.eligible) return KEEP;
  if (!facts.isNew || (facts.presentAtStart && !facts.triggeredActivation)) return KEEP;
  if (facts.openedByStudio) return KEEP;
  // A jump is never "reopened as text": VS Code closes a preview Studio tab before it opens the text tab of a jump.
  if (facts.reopenedAsText && facts.line === undefined) return KEEP;
  if (facts.line !== undefined && facts.sidePreviewFollowsActiveEditor) return KEEP;
  if (facts.markdownFilesInStudio) {
    return facts.line === undefined ? { kind: "studio" } : { kind: "studio-at-line", line: facts.line };
  }
  if (facts.searchResultsInStudio && facts.line !== undefined) return { kind: "studio-at-line", line: facts.line };
  return KEEP;
}

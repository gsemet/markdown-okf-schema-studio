/**
 * Six real use cases of the requirements bundle, frozen at the head of CR-441 (the Main paths sections as they were
 * then, and every SwRS they cite with its scenario kinds and its number of test files), so the map checks keep the
 * shapes they were designed on: one path with three other outcomes, a path that splits early, three paths of which two
 * join and one stands alone, a short one, long captions, and a path that splits mid-way.
 */
import { requirement } from "./fixture";

interface FrozenUseCase {
  readonly id: string;
  readonly scope: string;
  readonly mainPaths: string;
}

/** The use cases, in the order of the shapes above. */
export const FROZEN_USE_CASES: readonly FrozenUseCase[] = [
  {
    id: "StRS-MDOKFSTUDIO-BLOCK-003",
    scope: "block-editing",
    mainPaths: "### Main paths\n\n#### Path 1: Edit a block in place\n\n1. Edit mode is on\n   - SwRS-MDOKFSTUDIO-BLOCK-014: the writer clicks a rendered block and its editor opens with the lines of the block\n   - Option SwRS-MDOKFSTUDIO-BLOCK-014 (refusal): in reading mode a click opens no editor\n   - Option SwRS-MDOKFSTUDIO-BLOCK-017 (nominal): hovering outlines the element a click would edit\n   - Option SwRS-MDOKFSTUDIO-BLOCK-026 (nominal): the caret is placed at the clicked word\n2. The framed editor is open in place of the block\n   - SwRS-MDOKFSTUDIO-BLOCK-033: the host sends the source and the frame shows the text box, the line range and the keys, with Done and Cancel\n3. The writer edits the raw Markdown of the block with Done and Cancel at hand\n",
  },
  {
    id: "StRS-MDOKFSTUDIO-FMSCHEMA-014",
    scope: "frontmatter-schema",
    mainPaths: "### Main paths\n\n#### Path 1: Follow a link field\n\n1. A schema annotates a property with `x-okf-link`\n   - SwRS-MDOKFSTUDIO-FMSCHEMA-046: the page finds the annotation and resolves the target apart from its query and fragment\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-046 (refusal): an invalid annotation or link value marks the field with an E10 error\n2. The link target is checked against the files\n   - SwRS-MDOKFSTUDIO-FMSCHEMA-050: a document-relative, bundle-relative or project-relative target must be an existing file inside its root\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-055 (nominal): a filename-stem is accepted when exactly one file matches\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-050 (refusal): a configured root that cannot be used\n3. The link is shown pending, then resolved\n   - SwRS-MDOKFSTUDIO-FMSCHEMA-063: about 150 ms later the table is replaced so that a resolving link is a keyboard-focusable link with a tooltip\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-063 (refusal): a link that does not resolve shows an error or warning mark and a plain label\n4. The link is a focusable link\n   - SwRS-MDOKFSTUDIO-FMSCHEMA-073: a click or Enter opens the target in the editor at the marker line\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-067 (nominal): the tooltip lists the fields of the target found in its frontmatter\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-073 (refusal): an unusable link opens nothing and shows a warning\n5. The target is open in the editor\n\n#### Path 2: Link problems in the badge\n\n1. The link target is checked against the files\n   - SwRS-MDOKFSTUDIO-FMSCHEMA-039: the badge in the table title counts the link problems\n   - Option SwRS-MDOKFSTUDIO-FMSCHEMA-039 (refusal): a table with info rows only\n2. The badge counts the problems of the link fields\n",
  },
  {
    id: "StRS-MDOKFSTUDIO-BLOCK-014",
    scope: "block-editing",
    mainPaths: "### Main paths\n\n#### Path 1: Move a block with an arrow\n\n1. Edit mode is on\n   - SwRS-MDOKFSTUDIO-BLOCK-109: the writer clicks an enabled arrow of an insert point and the page asks the host to swap the block with its neighbour\n   - Option SwRS-MDOKFSTUDIO-BLOCK-109 (boundary): the arrows are disabled at the ends of the document\n   - Option SwRS-MDOKFSTUDIO-BLOCK-127 (refusal): the arrows beside an included block are disabled\n2. The host is asked to swap the block with its neighbour\n   - SwRS-MDOKFSTUDIO-BLOCK-117: the host replaces only the lines from the first block to the second, keeping the blank separator\n   - Option SwRS-MDOKFSTUDIO-BLOCK-124 (refusal): a move whose ranges do not match the document is refused with a reason\n3. The two blocks are swapped in the document\n   - SwRS-MDOKFSTUDIO-BLOCK-058: the swap is one undo step and the preview renders once\n4. The block is at its new place and one undo reverts the move\n\n#### Path 2: Move a block with the keyboard\n\n1. A body block is focused in edit mode\n   - SwRS-MDOKFSTUDIO-BLOCK-130: Alt+ArrowUp or Alt+ArrowDown requests the move and focuses the block at its new place\n   - Option SwRS-MDOKFSTUDIO-BLOCK-156 (nominal): with blocks selected the whole selection moves\n2. The host is asked to swap the block with its neighbour\n   - SwRS-MDOKFSTUDIO-BLOCK-117: the host replaces only the lines from the first block to the second, keeping the blank separator\n3. The two blocks are swapped in the document\n   - SwRS-MDOKFSTUDIO-BLOCK-058: the swap is one undo step and the preview renders once\n4. The block is at its new place and one undo reverts the move\n\n#### Path 3: Move a list item\n\n1. Edit mode is on and a list has two items or more\n   - SwRS-MDOKFSTUDIO-BLOCK-262: the writer drags the handle of an item onto a sibling, or presses Alt+Up or Alt+Down on it, and the page saves the list's lines with the item moved\n   - Option SwRS-MDOKFSTUDIO-BLOCK-262 (refusal): a drop in place or over another list, an open editor or an unreadable source moves nothing\n2. The list's lines are saved with the item at its new place\n   - SwRS-MDOKFSTUDIO-BLOCK-058: the save is one undo step and the preview renders once\n3. The item is at its new place, the numbers of an ordered list in order, and one undo reverts the move\n",
  },
  {
    id: "StRS-MDOKFSTUDIO-MYST-006",
    scope: "myst",
    mainPaths: "### Main paths\n\n#### Path 1: A formula\n\n1. A document holds `$...$`, `$$...$$` or a `{math}` role or directive\n   - SwRS-MDOKFSTUDIO-MYST-024: the page typesets it with the KaTeX of the extension bundle, offline\n   - Option SwRS-MDOKFSTUDIO-MYST-024 (refusal): an unparsable formula stays readable\n2. The formula is typeset\n",
  },
  {
    id: "StRS-MDOKFSTUDIO-REVIEW-012",
    scope: "review-annotations",
    mainPaths: "### Main paths\n\n#### Path 1: Open a comment chip\n\n1. A document holds an HTML comment\n   - SwRS-MDOKFSTUDIO-REVIEW-133: the renderer writes a gray chip labelled comment\n   - Option SwRS-MDOKFSTUDIO-REVIEW-139 (nominal): the word TODO shows as a green chip\n   - Option SwRS-MDOKFSTUDIO-REVIEW-133 (refusal): a tool comment gets no chip\n2. A chip stands in the text\n   - SwRS-MDOKFSTUDIO-REVIEW-143: the reader clicks the chip, or presses Enter or Space on it, and its comment box opens\n   - Option SwRS-MDOKFSTUDIO-REVIEW-003 (nominal): in edit mode the opened block is titled with the literal tag\n   - Option SwRS-MDOKFSTUDIO-REVIEW-152 (nominal): the Comments button hides the gray and thread chips\n3. The comment box shows the comment text\n\n#### Path 2: Mark a line as TODO\n\n1. A block editor is open on a line\n   - SwRS-MDOKFSTUDIO-REVIEW-160: the writer runs the TODO action from the edition palette or the slash menu and each touched line is wrapped in a TODO comment\n   - Option SwRS-MDOKFSTUDIO-REVIEW-160 (nominal): lines that are all wrapped are unwrapped by the same action\n   - Option SwRS-MDOKFSTUDIO-REVIEW-160 (refusal): a line that already holds a comment end is never wrapped\n2. The touched lines are wrapped in a TODO comment, or unwrapped\n",
  },
  {
    id: "StRS-MDOKFSTUDIO-MYST-009",
    scope: "myst",
    mainPaths: "### Main paths\n\n#### Path 1: Reference a label\n\n1. A document holds a `(name)=` label\n   - SwRS-MDOKFSTUDIO-MYST-036: the page shows a faint anchor icon on the next paragraph or heading, without moving the text\n   - Option SwRS-MDOKFSTUDIO-MYST-036 (boundary): a label before another block or at the end\n2. The label shows an anchor icon\n   - SwRS-MDOKFSTUDIO-MYST-019: a `{ref}` to the label renders an in-page link showing the target text or the given text\n   - Option SwRS-MDOKFSTUDIO-MYST-019 (boundary): explicit text and paragraph labels\n3. The reference is an in-page link\n\n#### Path 2: Rename a label\n\n1. The label shows an anchor icon\n   - SwRS-MDOKFSTUDIO-MYST-038: in edit mode a click on the icon opens a Rename label popover with the name selected\n   - Option SwRS-MDOKFSTUDIO-MYST-038 (refusal): an invalid name is not sent\n   - Option SwRS-MDOKFSTUDIO-BLOCK-041 (nominal): an open block editor makes the label rename refused with its reason\n2. The Rename label popover is open\n   - SwRS-MDOKFSTUDIO-MYST-045: the page posts the rename with a source line, two valid names and the current render, and the host answers with the same edit id\n   - Option SwRS-MDOKFSTUDIO-MYST-045 (refusal): a malformed or stale message\n3. The host holds a valid rename\n   - SwRS-MDOKFSTUDIO-MYST-045: the host changes only the `(old)=` text of the stated line, as one undo step\n   - Option SwRS-MDOKFSTUDIO-MYST-045 (refusal): a line that is no longer `(old)=` changes nothing\n4. The label has its new name in the source\n",
  },
];

/** The SwRS the use cases cite: scope, scenario kinds and number of test files at the freeze. */
const FROZEN_BEHAVIOURS: Readonly<Record<string, { readonly scope: string; readonly kinds: readonly string[]; readonly tests: number }>> = {
  "SwRS-MDOKFSTUDIO-BLOCK-014": { scope: "block-editing", kinds: ["nominal", "nominal", "nominal", "boundary", "nominal", "refusal", "refusal", "nominal", "refusal", "nominal", "boundary"], tests: 16 },
  "SwRS-MDOKFSTUDIO-BLOCK-017": { scope: "block-editing", kinds: ["nominal", "nominal", "boundary", "refusal", "nominal", "refusal", "nominal"], tests: 5 },
  "SwRS-MDOKFSTUDIO-BLOCK-026": { scope: "block-editing", kinds: ["nominal", "nominal", "boundary", "boundary"], tests: 3 },
  "SwRS-MDOKFSTUDIO-BLOCK-033": { scope: "block-editing", kinds: ["nominal", "nominal", "nominal", "nominal", "boundary", "boundary", "nominal", "boundary", "nominal", "nominal", "nominal", "nominal"], tests: 5 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-046": { scope: "frontmatter-schema", kinds: ["nominal", "nominal", "boundary", "refusal", "boundary", "refusal", "nominal"], tests: 2 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-050": { scope: "frontmatter-schema", kinds: ["nominal", "nominal", "refusal", "refusal", "refusal", "boundary", "nominal", "refusal", "boundary", "refusal", "nominal"], tests: 4 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-055": { scope: "frontmatter-schema", kinds: ["nominal", "refusal", "refusal", "nominal", "boundary", "nominal"], tests: 3 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-063": { scope: "frontmatter-schema", kinds: ["nominal", "nominal", "refusal", "boundary", "nominal", "refusal", "nominal", "refusal"], tests: 4 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-073": { scope: "frontmatter-schema", kinds: ["nominal", "nominal", "nominal", "refusal", "boundary"], tests: 3 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-067": { scope: "frontmatter-schema", kinds: ["nominal", "boundary", "nominal", "nominal", "boundary", "nominal", "nominal", "nominal"], tests: 10 },
  "SwRS-MDOKFSTUDIO-FMSCHEMA-039": { scope: "frontmatter-schema", kinds: ["nominal", "boundary", "nominal", "refusal", "nominal", "boundary", "nominal"], tests: 6 },
  "SwRS-MDOKFSTUDIO-BLOCK-109": { scope: "block-editing", kinds: ["nominal", "boundary", "refusal", "boundary", "nominal", "refusal", "refusal", "nominal", "nominal", "refusal", "boundary"], tests: 4 },
  "SwRS-MDOKFSTUDIO-BLOCK-127": { scope: "block-editing", kinds: ["nominal", "refusal", "refusal", "boundary", "refusal", "refusal", "refusal", "refusal"], tests: 8 },
  "SwRS-MDOKFSTUDIO-BLOCK-117": { scope: "block-editing", kinds: ["nominal", "boundary", "boundary", "boundary", "nominal", "boundary"], tests: 3 },
  "SwRS-MDOKFSTUDIO-BLOCK-124": { scope: "block-editing", kinds: ["refusal", "refusal", "refusal", "refusal", "refusal", "nominal"], tests: 4 },
  "SwRS-MDOKFSTUDIO-BLOCK-058": { scope: "block-editing", kinds: ["nominal", "nominal", "nominal", "nominal", "boundary", "refusal", "refusal", "boundary"], tests: 8 },
  "SwRS-MDOKFSTUDIO-BLOCK-130": { scope: "block-editing", kinds: ["nominal", "boundary", "refusal", "refusal", "boundary", "nominal", "refusal"], tests: 5 },
  "SwRS-MDOKFSTUDIO-BLOCK-156": { scope: "block-editing", kinds: ["nominal", "nominal", "nominal", "boundary", "refusal", "refusal", "nominal", "refusal"], tests: 4 },
  "SwRS-MDOKFSTUDIO-BLOCK-262": { scope: "block-editing", kinds: ["nominal", "nominal", "nominal", "nominal", "boundary", "boundary", "refusal"], tests: 7 },
  "SwRS-MDOKFSTUDIO-MYST-024": { scope: "myst", kinds: ["nominal", "boundary", "nominal", "refusal", "refusal", "refusal", "refusal", "boundary", "boundary"], tests: 6 },
  "SwRS-MDOKFSTUDIO-REVIEW-133": { scope: "review-annotations", kinds: ["nominal", "nominal", "nominal", "refusal", "nominal", "refusal", "boundary", "boundary", "boundary"], tests: 2 },
  "SwRS-MDOKFSTUDIO-REVIEW-139": { scope: "review-annotations", kinds: ["nominal", "boundary", "refusal", "nominal", "boundary"], tests: 1 },
  "SwRS-MDOKFSTUDIO-REVIEW-143": { scope: "review-annotations", kinds: ["nominal", "nominal", "refusal", "nominal", "nominal", "boundary", "nominal", "boundary"], tests: 4 },
  "SwRS-MDOKFSTUDIO-REVIEW-003": { scope: "review-annotations", kinds: ["nominal", "boundary", "boundary", "refusal"], tests: 4 },
  "SwRS-MDOKFSTUDIO-REVIEW-152": { scope: "review-annotations", kinds: ["boundary", "nominal", "nominal", "nominal", "nominal", "nominal", "nominal", "nominal", "boundary", "nominal", "refusal"], tests: 10 },
  "SwRS-MDOKFSTUDIO-REVIEW-160": { scope: "review-annotations", kinds: ["nominal", "nominal", "nominal", "boundary", "boundary", "refusal", "boundary", "nominal"], tests: 3 },
  "SwRS-MDOKFSTUDIO-MYST-036": { scope: "myst", kinds: ["nominal", "boundary", "nominal", "boundary"], tests: 2 },
  "SwRS-MDOKFSTUDIO-MYST-019": { scope: "myst", kinds: ["nominal", "boundary", "boundary"], tests: 2 },
  "SwRS-MDOKFSTUDIO-MYST-038": { scope: "myst", kinds: ["nominal", "boundary", "refusal", "nominal", "refusal", "nominal", "refusal", "boundary", "nominal", "boundary"], tests: 8 },
  "SwRS-MDOKFSTUDIO-BLOCK-041": { scope: "block-editing", kinds: ["nominal", "nominal", "boundary", "boundary", "boundary", "boundary"], tests: 15 },
  "SwRS-MDOKFSTUDIO-MYST-045": { scope: "myst", kinds: ["nominal", "nominal", "refusal", "boundary", "nominal", "refusal", "refusal"], tests: 4 },
};

const scenarioText = (kind: string, index: number): string => `### Scenario (${kind}): Frozen ${index + 1}\n\n- GIVEN a box\n- WHEN it is used\n- THEN it works\n\n`;

/** A requirements report of the frozen use cases and behaviours, in the shape of `fixtureReport`. */
export function frozenReport(): string {
  const requirements: unknown[] = FROZEN_USE_CASES.map((useCase) => requirement(useCase.id, "StRS", useCase.scope, {
    text: `## Frozen\n\n${useCase.mainPaths}\n<!-- okf:links:start -->\n`,
  }));
  for (const [id, behaviour] of Object.entries(FROZEN_BEHAVIOURS)) {
    const parents = FROZEN_USE_CASES.filter((useCase) => useCase.mainPaths.includes(id)).map((useCase) => useCase.id);
    requirements.push(requirement(id, "SwRS", behaviour.scope, {
      derivesFrom: parents,
      text: behaviour.kinds.map(scenarioText).join(""),
      testedIn: Array.from({ length: behaviour.tests }, (_, index) => `test/frozen/${id}-${index + 1}.test.ts`),
    }));
  }
  return JSON.stringify({ generated_at: "2026-11-21T10:00:00+00:00", totals: { combined_coverage_percent: 100 }, scopes: {}, requirements });
}

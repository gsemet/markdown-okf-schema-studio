/**
 * Radio choice lists: a run of at least two consecutive list items that start with a radio marker
 * (`( )`, `(x)`, `(X)`) renders as one radio group. The markers were swapped for placeholders before
 * parsing (`checkboxMarkers.ts`); this tree pass turns the placeholders of each group into radio
 * controls and leaves every other radio placeholder to the checkbox pass, which restores it as text.
 *
 * A group is a run of items of one list: a blank line between two items, an item that does not start
 * with a radio marker (a task-list item, a plain item) or the end of the list ends it. A nested list
 * is a list of its own, so it forms its own groups. The paragraph just above the list labels a group
 * that starts the list.
 */

import { type CheckboxMarker, splitLeadingPlaceholder } from "./checkboxMarkers";
import { mergeProperties, type MystNode } from "./mystNode";

/** A list item that starts with a radio marker: the marker and the text node that holds it. */
interface RadioOption {
  readonly item: MystNode;
  readonly paragraph: MystNode;
  readonly text: MystNode;
  readonly rest: string;
  readonly marker: CheckboxMarker;
}

function radioOption(item: MystNode, markers: readonly CheckboxMarker[]): RadioOption | undefined {
  if (item.type !== "listItem") return undefined;
  const paragraph = item.children?.[0];
  if (paragraph?.type !== "paragraph") return undefined;
  const text = paragraph.children?.[0];
  if (text?.type !== "text" || !text.value) return undefined;
  const leading = splitLeadingPlaceholder(text.value);
  const marker = leading ? markers[leading.marker] : undefined;
  if (!leading || marker?.kind !== "radio") return undefined;
  return { item, paragraph, text, rest: leading.rest, marker };
}

/** True when a source line between `from` and `to` (exclusive, one-based) is blank. */
function blankLineBetween(sourceLines: readonly string[], from: number, to: number): boolean {
  for (let line = from + 1; line < to; line += 1) {
    if (/^[\s>]*$/u.test(sourceLines[line - 1] ?? "")) return true;
  }
  return false;
}

/** The runs of consecutive radio options of `list` with at least two options. */
function radioRuns(list: MystNode, markers: readonly CheckboxMarker[], sourceLines: readonly string[]): RadioOption[][] {
  const runs: RadioOption[][] = [];
  let run: RadioOption[] = [];
  const close = (): void => {
    if (run.length >= 2) runs.push(run);
    run = [];
  };
  for (const item of list.children ?? []) {
    const option = radioOption(item, markers);
    if (!option) {
      close();
      continue;
    }
    const previous = run.at(-1);
    if (previous && blankLineBetween(sourceLines, previous.marker.line, option.marker.line)) close();
    run.push(option);
  }
  close();
  return runs;
}

const radioId = (marker: CheckboxMarker): string => `myst-radio-${marker.line}`;

function radioNode(option: RadioOption, groupId: string, focusable: boolean): MystNode {
  const { marker } = option;
  return {
    type: "mystRadio",
    data: {
      hName: "span",
      hProperties: {
        class: "myst-radio",
        role: "radio",
        id: radioId(marker),
        "aria-checked": marker.checked ? "true" : "false",
        "aria-labelledby": `${radioId(marker)}-label`,
        tabindex: focusable ? "0" : "-1",
        "data-myst-radio-group": groupId,
        "data-myst-radio-line": marker.line,
        "data-myst-radio-column": marker.column,
      },
      hChildren: [],
    },
  };
}

/** The id of the paragraph just above the list, given one if it has none; undefined without one. */
function labelId(before: MystNode | undefined, groupId: string): string | undefined {
  if (before?.type !== "paragraph") return undefined;
  const existing = (before.data?.hProperties as { id?: unknown } | undefined)?.id;
  if (typeof existing === "string" && existing) return existing;
  if (before.identifier || before.label) return undefined;
  const id = `${groupId}-label`;
  mergeProperties(before, { id });
  return id;
}

function convertRun(list: MystNode, run: RadioOption[], before: MystNode | undefined): void {
  const groupId = `myst-radio-group-${run[0].marker.line}`;
  const wholeList = run.length === list.children?.length;
  const startsList = run[0].item === list.children?.[0];
  const label = startsList ? labelId(before, groupId) : undefined;
  const focusIndex = Math.max(0, run.findIndex((option) => option.marker.checked));
  run.forEach((option, index) => {
    const control = radioNode(option, groupId, index === focusIndex);
    const children = option.paragraph.children ?? [];
    option.paragraph.children = [
      control,
      ...(option.rest ? [{ ...option.text, value: option.rest }] : []),
      ...children.slice(1),
    ];
    mergeProperties(option.paragraph, { id: `${radioId(option.marker)}-label` });
    mergeProperties(option.item, { class: "myst-radio-item", ...(wholeList ? { role: "none" } : {}) });
  });
  const groupProperties = {
    class: "myst-radio-group",
    role: "radiogroup",
    "data-myst-radio-group": groupId,
    ...(label ? { "aria-labelledby": label } : {}),
  };
  if (wholeList) {
    mergeProperties(list, groupProperties);
    return;
  }
  // The group is a part of the list: an empty radiogroup at its first option owns its radios.
  const first = run[0].paragraph;
  first.children = [
    {
      type: "mystRadioGroup",
      data: {
        hName: "span",
        hProperties: { ...groupProperties, "aria-owns": run.map((option) => radioId(option.marker)).join(" ") },
        hChildren: [],
      },
    },
    ...(first.children ?? []),
  ];
}

// @implements_req SwRS-MDOKFSTUDIO-GFM-039
/**
 * Turns every run of at least two radio items of a list into a radio group. `sourceLines` are the
 * lines of the whole document, frontmatter included, as the markers count them.
 */
export function convertRadioGroups(
  node: MystNode,
  markers: readonly CheckboxMarker[],
  sourceLines: readonly string[],
): void {
  const children = node.children ?? [];
  children.forEach((child, index) => {
    if (child.type === "list") {
      for (const run of radioRuns(child, markers, sourceLines)) convertRun(child, run, children[index - 1]);
    }
    convertRadioGroups(child, markers, sourceLines);
  });
}

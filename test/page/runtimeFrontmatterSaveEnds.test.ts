import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createRuntimeHarness, type RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { frontmatterSaves, patchMessage } from "./runtimeTestSupport";

/** A frontmatter save the host ends without a render still ends the field (CR 475, H1). */

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S3
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S11
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S3
// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S11
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
test("an unchanged frontmatter save closes the field instead of waiting for a render", () => {
  const harness = createRuntimeHarness({
    mapFrontmatter: true,
    frontmatterRowAttributes: {
      "data-okf-field": "priority",
      "data-okf-type": "number",
      "data-okf-value": "2",
      "data-okf-value-yaml": "2\n",
    },
  });
  harness.editModeButton.dispatch("click");
  harness.dispatchDocument("click", {
    target: harness.frontmatterValueCell,
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
  });
  const control = harness.createdElements.find((element) => element.getAttribute("aria-label") === "Frontmatter priority");
  assert.ok(control);
  control.value = "3";
  control.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
  const saves = frontmatterSaves(harness);
  assert.equal(saves.length, 1);
  harness.dispatchMessage({
    type: "previewFrontmatterResult",
    documentId: "file:///active.md",
    revision: 7,
    requestId: 11,
    editId: saves[0].editId,
    saved: true,
    unchanged: true,
  });
  assert.equal(harness.frontmatterValueCell.getAttribute("data-okf-editing"), null);
  assert.equal(harness.frontmatterValueDisplay.getAttribute("hidden"), null);
});

// CR 475: every frontmatter save (a value, a key rename, a field added or removed) ends in a closed
// field or a shown error that gives the control back.
const ROW = {
  "data-okf-field": "priority",
  "data-okf-type": "number",
  "data-okf-value": "2",
  "data-okf-value-yaml": "2\n",
};
const IDENTITY = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const click = (target: unknown) => ({ target, preventDefault: () => undefined, stopPropagation: () => undefined });

interface Saving {
  harness: RuntimeHarness;
  editId: string;
  control: RuntimeElement;
  cell: RuntimeElement;
}

const labelled = (harness: RuntimeHarness, label: string): RuntimeElement => {
  const found = harness.createdElements.find((element) => element.getAttribute("aria-label") === label && !element.removed);
  assert.ok(found, label);
  return found;
};

function opened(): RuntimeHarness {
  const harness = createRuntimeHarness({ mapFrontmatter: true, frontmatterRowAttributes: ROW });
  harness.editModeButton.dispatch("click");
  return harness;
}

const SAVES: Array<{ name: string; start: () => Saving }> = [
  {
    name: "a value save",
    start: () => {
      const harness = opened();
      harness.dispatchDocument("click", click(harness.frontmatterValueCell));
      const control = labelled(harness, "Frontmatter priority");
      control.value = "3";
      control.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
      return { harness, editId: String(frontmatterSaves(harness).at(-1)?.editId), control, cell: harness.frontmatterValueCell };
    },
  },
  {
    name: "a key rename",
    start: () => {
      const harness = opened();
      harness.dispatchDocument("click", click(harness.frontmatterNameCell));
      const control = labelled(harness, "Frontmatter key priority");
      control.value = "rank";
      control.dispatch("keydown", { key: "Enter", preventDefault: () => undefined });
      return { harness, editId: String(frontmatterSaves(harness).at(-1)?.editId), control, cell: harness.frontmatterNameCell };
    },
  },
  {
    name: "a field removal",
    start: () => {
      const harness = opened();
      harness.dispatchDocument("click", click(harness.frontmatterValueCell));
      const button = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-operation") === "remove");
      assert.ok(button);
      button.dispatch("click");
      const control = labelled(harness, "Frontmatter priority");
      return { harness, editId: String(frontmatterSaves(harness).at(-1)?.editId), control, cell: harness.frontmatterValueCell };
    },
  },
  {
    name: "a field addition",
    start: () => {
      const harness = opened();
      harness.dispatchDocument("click", click(harness.frontmatterValueCell));
      const add = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-operation") === "add");
      assert.ok(add);
      add.dispatch("click");
      const picker = labelled(harness, "Frontmatter field to add");
      picker.value = "status";
      picker.dispatch("change");
      const confirm = harness.createdElements.find((element) => element.getAttribute("data-okf-frontmatter-operation") === "confirm-add");
      assert.ok(confirm);
      confirm.dispatch("click");
      const control = labelled(harness, "Frontmatter priority");
      return { harness, editId: String(frontmatterSaves(harness).at(-1)?.editId), control, cell: harness.frontmatterValueCell };
    },
  },
];

for (const save of SAVES) {
  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S8
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
  test(`${save.name}: the control is disabled and Escape is ignored while the save is in flight`, () => {
    const { harness, control, cell } = save.start();
    assert.equal(control.disabled, true, "the control is disabled");
    harness.dispatchDocument("keydown", { key: "Escape", target: cell, preventDefault: () => undefined });
    assert.equal(cell.getAttribute("data-okf-editing"), "true", "the field stays open");
  });

  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S5
  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S11
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
  test(`${save.name}: an error answer gives the control back and Escape closes the field`, () => {
    const { harness, editId, control, cell } = save.start();
    harness.dispatchMessage({ type: "previewFrontmatterResult", ...IDENTITY, editId, error: "Not saved." });
    assert.equal(control.disabled, false, "the control is enabled again");
    assert.ok(harness.createdElements.some((element) => element.textContent === "Not saved." && !element.removed), "the error shows");
    control.dispatch("keydown", { key: "Escape", preventDefault: () => undefined });
    assert.equal(cell.getAttribute("data-okf-editing"), null, "Escape closes the field");
  });

  // @tests_req SwRS-MDOKFSTUDIO-FMEDIT-019#S11
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-270
  test(`${save.name}: saved, then the content patch closes the field`, () => {
    const { harness, editId, cell } = save.start();
    harness.dispatchMessage({ type: "previewFrontmatterResult", ...IDENTITY, editId, saved: true });
    harness.dispatchMessage(patchMessage());
    assert.equal(cell.getAttribute("data-okf-editing"), null, "the field is closed");
  });
}

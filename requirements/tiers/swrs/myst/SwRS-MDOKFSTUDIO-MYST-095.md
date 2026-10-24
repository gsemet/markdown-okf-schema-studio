---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-095
uuid: 6737aeee-3380-4502-8148-030aaab5fa9b
title: Doc and download roles render as plain links
description: When a document uses the doc or download role, the extension SHALL
  render it as a plain link to the written target.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Doc and download roles render as plain links

### Normative behavior

When a document uses the doc or download role, the extension SHALL render it as a plain link to the written target.

### Scenario: Link roles with a written target

- GIVEN the text ``{doc}`other/page` `` and ``{download}`the manifest (schema/m.json)` ``
- WHEN the preview renders
- THEN each is a plain link whose `href` is the written target, with the label as text (the
  target path itself is not a link text: a role without a label gives an empty link)

### Scenario: Numbered reference

- GIVEN ``{numref}`fig-x` `` where `(fig-x)=` labels a heading in the same buffer
- WHEN the preview renders
- THEN it shows an inert placeholder (`reference role unhandled`) holding the role name and the
  written key, not a numbered link, and the same holds with an explicit title

### Known issues

- Known issue: the preview adds no resolution of its own. `{doc}` and `{download}` targets are not
  checked against the workspace, `{numref}` is never resolved to a number, and a `{doc}` or
  `{download}` written without a label renders an empty link. Backlog: `doc-numref-download-resolution`.

### Verification notes

- Method: inspection of the rendered HTML for these roles (`src/core/render`, fixture
  `test/visual/fixtures/03-unresolved-constructs.md`).
- Criteria: Verification pending (no test; P10.5 test gap).

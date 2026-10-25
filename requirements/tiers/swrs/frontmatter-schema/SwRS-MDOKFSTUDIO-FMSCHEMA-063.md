---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-063
uuid: 1c0855da-c0b6-4e22-8248-40eb8db55ff9
title: Each link value shows whether it resolves
description: "When a properties table with annotated link values is rendered, the
  extension SHALL show each link as pending on the first paint and, about 150 ms later,
  replace the table in place so that a resolving link is a keyboard-focusable link
  whose tooltip starts with the workspace-relative path of the target, and an unresolved
  link shows its text followed by an error or warning mark and a plain label, with
  the full \"[E10]\" or \"[W15]\" message in a keyboard-focusable tooltip."
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-FMSCHEMA-050
- SwRS-MDOKFSTUDIO-FMSCHEMA-055
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/frontmatter/fileLinks.ts
- src/core/frontmatter/propertiesTable.ts
- src/session/features/frontmatter.ts
tested_in_files:
- test/core/frontmatter/propertiesTable.test.ts
- test/integration/previewEditing.test.ts
- test/integration/realInput.markers.ts
- test/page/runtimeScroll.test.ts
- test/visual/scenarioDefinitions1.ts
---
## Each link value shows whether it resolves

### Normative behavior

When a properties table with annotated link values is rendered, the extension SHALL show each link as pending on the first paint and, about 150 ms later, replace the table in place so that a resolving link is a keyboard-focusable link whose tooltip starts with the workspace-relative path of the target, and an unresolved link shows its text followed by an error or warning mark and a plain label, with the full "[E10]" or "[W15]" message in a keyboard-focusable tooltip.

### Scenario (nominal): Valid link

- GIVEN a link value t.md that resolves to bundle/docs/t.md
- WHEN the table is rendered
- THEN the Value cell holds a focusable link t.md whose tooltip starts with bundle/docs/t.md, carrying the navigation request okf-link and the status valid

### Scenario (nominal): List of links

- GIVEN a list field whose items are annotated links
- WHEN the table is rendered
- THEN each item is its own link

### Scenario (refusal): Link that does not resolve

| Link value | Table state | Outcome |
| --- | --- | --- |
| nope.md (not found) | Rendered | The text nope.md is followed by the mark ✖ and the label File not found; the text can be focused with the keyboard and its tooltip holds the full [E10] message |
| A bundle-relative link without a bundle root | Rendered | The text is followed by the mark ⚠ and the label Link root unavailable; the tooltip holds the full [W15] message |

### Scenario (boundary): Plain labels of the problems

| Problem | Label |
| --- | --- |
| Target not found | File not found |
| Target outside the allowed folder | Outside the allowed folder |
| Root unavailable | Link root unavailable |
| Absolute target | Absolute paths are not allowed |
| Several files match | Several files match |
| Empty link | Empty link |
| Any other E10 | Invalid link |
| Any other W15 | Link unavailable |

### Scenario (nominal): First paint

- GIVEN a document with annotated links
- WHEN the preview is first rendered
- THEN each link shows its text and a spinner labelled File links are being resolved and is marked busy, without the Studio link tooltip

### Scenario (refusal): Pending link has no Studio tooltip

- GIVEN the pointer is moved over a pending link
- WHEN the pointer rests on it
- THEN the Studio link tooltip is not shown

### Scenario (nominal): Links resolved after the render

- GIVEN a rendered table with pending links
- WHEN 150 ms pass
- THEN the table is swapped in place and no spinner is left

### Scenario (refusal): Document changed meanwhile

- GIVEN the document, the render or the panel changed before the timer fired, or a block or field editor is open
- WHEN the timer fires
- THEN a stale result is dropped and nothing is patched, and while an editor is open the swap waits

### Known issues

- Known issue: a pending link still carries the native title "Loading linked file" and its spinner the native title "File links are being resolved", so the browser may show a plain tooltip.

### Related requirements

- SwRS-MDOKFSTUDIO-FMSCHEMA-050: the resolution that gives the status.
- SwRS-MDOKFSTUDIO-FMSCHEMA-067: the details and the tooltip of a resolved link.

### Verification notes

- Method: test/core/frontmatter/propertiesTable.test.ts (valid link, list of links, not found, root unavailable, labels, first paint), test/integration/previewEditing.test.ts (valid link, problem tooltip), test/integration/realInput.markers.ts (keyboard focus and tooltip of a problem), test/page/runtimeScroll.test.ts (tooltip of a problem), test/visual/scenarioDefinitions1.ts (first paint, pending link, resolved after render, document changed meanwhile; the timer is also covered by a unit test of the frontmatter controller).
- Criteria: The link carries the navigation request okf-link and the status valid. The tooltip of a problem is shown by the Studio link tooltip on hover and focus. The first render and the 300 ms table refresh do not touch the file system for links. A new request restarts the 150 ms timer.

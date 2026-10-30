---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-002
uuid: 12af2328-b213-4b38-82ad-d7791d91ef90
title: A horizontal rule has a tall invisible hit area
description: The extension SHALL give every rendered horizontal rule a box 25 px
  tall (the 1 px line plus 12 px of transparent padding above and below, with
  the page spacing unchanged), so that a click within 12 px of the line opens
  the rule's block editor.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/preview/styles/contentBlockStyles.ts
tested_in_files:
- test/core/preview/previewStyles.test.ts
- test/visual/scenarioDefinitions1.ts
default_owner_email: gaetan@xeberon.net
---

## A horizontal rule has a tall invisible hit area

### Normative behavior

The extension SHALL give every rendered horizontal rule a box 25 px tall (the 1 px line plus 12 px of transparent padding above and below, with the page spacing unchanged), so that a click within 12 px of the line opens the rule's block editor.

### Scenario (nominal): Click above the line

- GIVEN a rendered page with a horizontal rule and edit mode on
- WHEN the writer clicks 10 px above or below the line of the rule
- THEN the click lands on the rule and opens its block editor

### Scenario (boundary): Spacing unchanged

- GIVEN the same page
- WHEN the rule is laid out
- THEN its 12 px of padding on each side is taken from its margin, so the distance between the surrounding blocks is the same as with a bare 1 px rule

### Verification notes

- Method: test/core/preview/previewStyles.test.ts (the hr rule has 12px padding, content-box and a margin reduced by the padding); visual scenarios palette-slash/v23-edit-bar-tooltip-rule-cream-900 and v24-edit-bar-tooltip-rule-dark-900 (element at 10 px above and below the line is the rule, box 25 px tall)
- Criteria: The rule box is at least 24 px tall and document.elementFromPoint 10 px above and below its line returns the rule.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
<!-- okf:links:end -->

---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-021
uuid: d90c0d8d-2c87-47a3-9693-35b2b4b77745
title: Clicking any part of an admonition edits its whole directive
description: When a writer clicks the title or the body of an admonition in edit
  mode, the page SHALL open one editor on the complete directive source from the
  opening fence to the closing fence.
project: markdown-okf-schema-studio
scope: block-editing
req_lifecycle: deprecated
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## Clicking any part of an admonition edits its whole directive

### Normative behavior

When a writer clicks the title or the body of an admonition in edit mode, the page SHALL open one editor on the complete directive source from the opening fence to the closing fence.

### Scenario: Title click

- GIVEN an admonition directive in edit mode
- WHEN the writer clicks its title
- THEN the editor holds all lines of the directive, opening and closing fence included, with the caret at the clicked word

### Scenario: Body click

- GIVEN the same admonition
- WHEN the writer clicks its body text
- THEN the same single editor opens on the same lines

### Verification notes

- Method: Visual scenario block-editing/v05 (admonition editor open). No unit test.
- Criteria: The editor range equals the mapped range of the admonition block.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-BLOCK-003](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-003.md): A writer edits the raw Markdown of a block in a framed editor
<!-- okf:links:end -->

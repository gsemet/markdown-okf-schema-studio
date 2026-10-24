---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-001
uuid: 8840524e-667d-40f2-bcd8-9b56cef7e071
title: A closing fence on its own line ends the frontmatter
description: When a document starts with a `---` line and a later `---` or `...`
  line stands alone on its line, the extension SHALL treat the lines between
  them as the frontmatter block and show it as a properties table.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A closing fence on its own line ends the frontmatter

### Normative behavior

When a document starts with a `---` line and a later `---` or `...` line stands alone on its line, the extension SHALL treat the lines between them as the frontmatter block and show it as a properties table.

### Scenario: Closing with three dashes or three dots

- GIVEN a document starting with `---`, a line `title: Hello` and a closing line `...` followed by a heading
- WHEN the preview is rendered
- THEN a properties table at the top lists the field title with the value Hello and the heading follows it

### Scenario: Value ending in dots does not close

- GIVEN a document whose frontmatter line is `note: wait...` followed by a closing `---` line
- WHEN the preview is rendered
- THEN the table lists the field note with the value `wait...` and the block closes at the `---` line, not at the dots inside the value

### Verification notes

- Method: Unit test of the fence matcher and of the frontmatter extraction.
- Criteria: The closing fence is recognised only alone on its line (trailing spaces and tabs allowed); a value ending in `...` or `---` never closes the block.
- Known issue: a leading byte-order mark in the document text itself is not stripped, so such a text has no frontmatter (it is stripped only when a linked target is read).

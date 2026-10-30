---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-030
uuid: 39c9f6c1-d4cd-43c4-b73a-6932ce03d141
title: Tighten list spacing
description: When a list item holds paragraphs, the extension SHALL reduce the
  paragraph margins inside it and indent lists by 2em.
project: markdown-okf-schema-studio
scope: rendering-core
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-028; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-028
default_owner_email: gaetan@xeberon.net
---

## Tighten list spacing

### Normative behavior

When a list item holds paragraphs, the extension SHALL reduce the paragraph margins inside it and indent lists by 2em.

### Scenario: Nominal tighten list spacing

- GIVEN a loose list
- WHEN it is shown
- THEN paragraph margins inside items are reduced

### Scenario: Boundary or refusal of tighten list spacing

- GIVEN a nested list
- WHEN it is shown
- THEN each level indents by 2em

### Verification notes

- Method: inspection
- Criteria: Computed margins and indent match.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-028](SwRS-MDOKFSTUDIO-CORE-028.md): Body text, headings, lists and inline code are typeset readably
<!-- okf:links:end -->

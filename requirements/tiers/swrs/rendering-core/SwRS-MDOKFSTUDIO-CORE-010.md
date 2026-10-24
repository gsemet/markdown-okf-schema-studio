---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-010
uuid: ae60e227-e117-4230-8302-2d63c436cacc
title: Render wikilinks as links
description: When a document holds `[[Note]]`, `[[Folder/Note#Heading|Label]]`
  or `[[#Section]]`, the extension SHALL render a link, with a `wiki:` URL for a
  note target and an in-page slug anchor for a heading-only target.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Render wikilinks as links

### Normative behavior

When a document holds `[[Note]]`, `[[Folder/Note#Heading|Label]]` or `[[#Section]]`, the extension SHALL render a link, with a `wiki:` URL for a note target and an in-page slug anchor for a heading-only target.

### Scenario: Nominal render wikilinks as links

- GIVEN a paragraph with `[[Note]]` and `[[#Section]]`
- WHEN it is rendered
- THEN the first is a link with a `wiki:` URL and the second an in-page `#section` anchor

### Scenario: Boundary or refusal of render wikilinks as links

- GIVEN a wikilink with a `|Label`
- WHEN it is rendered
- THEN the link text is the label

### Verification notes

- Method: test
- Criteria: Each wikilink form yields the expected link target and text.

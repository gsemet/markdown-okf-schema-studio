---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-006
uuid: 96c66aa4-6316-47b8-9982-5dcfc62481df
title: Editing an autolink shows the raw URL
description: When a writer opens a paragraph containing an autolinked URL for
  editing, the extension SHALL send the unchanged source text, including the raw
  URL, to the block editor.
project: markdown-okf-schema-studio
scope: gfm
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-GFM-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Editing an autolink shows the raw URL

### Normative behavior

When a writer opens a paragraph containing an autolinked URL for editing, the extension SHALL send the unchanged source text, including the raw URL, to the block editor.

### Scenario: Raw URL in the editor

- GIVEN a paragraph 'visit https://example.com now'
- WHEN the block editor source is requested
- THEN the text equals the original source

### Scenario: Link not materialised in source

- GIVEN a paragraph with www.example.com
- WHEN the block editor source is requested
- THEN the text still reads www.example.com, not an https:// link

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Editor source text is byte-identical to the document source.

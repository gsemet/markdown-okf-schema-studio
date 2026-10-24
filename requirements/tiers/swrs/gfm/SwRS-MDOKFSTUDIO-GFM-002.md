---
type: SwRS
id: SwRS-MDOKFSTUDIO-GFM-002
uuid: bca0778f-7bc2-4553-93d4-ef9c29f19229
title: Trailing punctuation stays outside bare URLs
description: When a bare URL is followed by sentence punctuation or an
  unbalanced closing parenthesis, the extension SHALL leave that character
  outside the link and keep balanced parentheses inside it.
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

## Trailing punctuation stays outside bare URLs

### Normative behavior

When a bare URL is followed by sentence punctuation or an unbalanced closing parenthesis, the extension SHALL leave that character outside the link and keep balanced parentheses inside it.

### Scenario: Sentence punctuation excluded

- GIVEN the text 'see https://example.com/a.' and '(https://example.com/a_(b))'
- WHEN the preview is rendered
- THEN the link ends before the final period and keeps the balanced parentheses of a_(b)

### Scenario: Unbalanced parenthesis excluded

- GIVEN the text '(see https://example.com/a)'
- WHEN the preview is rendered
- THEN the closing parenthesis is outside the link

### Verification notes

- Method: Unit test on the render pipeline output.
- Criteria: Link text equals the URL without trailing punctuation in every listed case.

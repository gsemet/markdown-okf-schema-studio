---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-070
uuid: f8fd2e6c-8717-43ee-85af-7f8ff0ddccf3
title: Visible text speaks of the product, not of its build tool
description: When the extension shows a text to the reader, it SHALL NOT mention
  Sphinx.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-012
depends_on: []
annotation_exemption: true
exemption_reason: "Negative rule over every user-visible string, with no single implementation
  point. No implementation marker is possible."
derived_by: []
implemented_in_files: []
tested_in_files:
- test/security/userFacingText.test.ts
---

## Visible text speaks of the product, not of its build tool

### Normative behavior

When the extension shows a text to the reader, it SHALL NOT mention Sphinx.

### Scenario (nominal): Scanned sources

- GIVEN the string literals of src/extension.ts, src/session/webview.ts and src/core/render/*.ts
- WHEN they are scanned
- THEN none mentions Sphinx and the list of allowed exceptions is empty

### Scenario (boundary): Scanner

- GIVEN a source text with Sphinx in a line comment, in a block comment, in a plain string and in a template literal
- WHEN the scanner reads it
- THEN it reports the string and the template only

### Verification notes

- Method: Unit test test/security/userFacingText.test.ts (no user-facing string literal mentions Sphinx; the literal scanner skips comments and finds strings in templates) covers both scenarios. The scan covers three source locations only; since the layout refactor most visible strings live in src/session/features, src/core/preview and src/page, which it does not scan. A search of those folders for string literals that mention Sphinx found none.
- Criteria: The product path holds no string literal that mentions Sphinx.

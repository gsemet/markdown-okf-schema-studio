---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-043
uuid: e0399f98-3d33-4482-a362-4a0c194121f1
title: A value edit changes only the lines of that field
description: When a writer saves a value, the extension SHALL change only the
  lines of that field and keep comments, quoting style, spacing, fences, body
  and line endings byte-identical.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A value edit changes only the lines of that field

### Normative behavior

When a writer saves a value, the extension SHALL change only the lines of that field and keep comments, quoting style, spacing, fences, body and line endings byte-identical.

### Scenario: Nominal

- GIVEN a document with a trailing comment on the title line and other fields
- WHEN title is changed from Alpha to Beta
- THEN only the title line changes and its comment is kept

### Scenario: Boundary or refusal

- GIVEN the same document with CRLF endings or a closing fence of three dots
- WHEN a value is changed
- THEN only the named field's lines change and the fences, body and line endings stay identical

### Verification notes

- Method: Unit test on the frontmatter patch (test/core/frontmatter/okfFrontmatter.test.ts, frontmatterPreservation.test.ts, frontmatterFence.test.ts).
- Criteria: Tests value patch rewrites only the edited field line; value edit F1-F4 changes only the named field; frontmatter fence fixtures.

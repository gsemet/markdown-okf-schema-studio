---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-050
uuid: cd745cba-06f3-437d-a143-9efd1e5305da
title: The sanitizer adds source-mapping attributes to mapped elements
description: When an element carries a data-line attribute that is a positive
  integer, the sanitizer SHALL give it the source file, the line, the end line,
  the document identifier and a block identifier of the active document, and
  tabindex 0 unless it is naturally focusable.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: true
exemption_reason: "Archived. Another requirement specifies this behaviour, so no marker
  is expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
---

## The sanitizer adds source-mapping attributes to mapped elements

### Normative behavior

When an element carries a data-line attribute that is a positive integer, the sanitizer SHALL give it the source file, the line, the end line, the document identifier and a block identifier of the active document, and tabindex 0 unless it is naturally focusable.

### Scenario: Mapped heading and paragraph

- GIVEN a heading with data-line 1 and a paragraph with data-line 4 and data-end-line 6
- WHEN the page is sanitized
- THEN both carry the source file, line, end line, document and block attributes and tabindex 0

### Scenario: Unmapped or invalid line

- GIVEN a paragraph with no data-line and an element with data-line abc or 0
- WHEN the page is sanitized
- THEN no source attribute is added

### Related requirements

- SwRS-MDOKFSTUDIO-CORE-003: each block gets a source line
- SwRS-MDOKFSTUDIO-CORE-004: a multi-line block gets an end line

### Verification notes

- Method: Unit tests test/security/html-policy.test.ts (maps rendered source lines to the active preview document; keeps the included-block marker next to the source mapping). The invalid-line case is untested. An end line that is not a positive integer, or is before the line, is replaced by the line.
- Criteria: The source line is a safe positive integer on every mapped element.

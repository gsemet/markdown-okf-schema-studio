---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMSCHEMA-035
uuid: fe1cdab4-8648-46ad-8bf1-ed9eb859ccef
title: A schema error marks the row of its field
description: When the frontmatter violates its schema, the extension SHALL
  attach each error to the row of the field concerned with a red underline and
  the validator message in the row tooltip.
project: markdown-okf-schema-studio
scope: frontmatter-schema
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMSCHEMA-011
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A schema error marks the row of its field

### Normative behavior

When the frontmatter violates its schema, the extension SHALL attach each error to the row of the field concerned with a red underline and the validator message in the row tooltip.

### Scenario: Two violations

- GIVEN a schema with a number maximum 5 and a date-time format, and a document with values 9 and x for those fields
- WHEN the preview is rendered
- THEN both rows are underlined and their tooltips read must be <= 5 and must match format "date-time"

### Scenario: Valid document

- GIVEN the same schema and a document with values 3 and 2026-01-01T00:00:00Z
- WHEN the preview is rendered
- THEN no row is underlined and no badge is shown

### Verification notes

- Method: Unit test of the analysis (field issues); visual scenario.
- Criteria: Messages are the English texts of the validator; unknown schema keywords are ignored silently.
- Known issue: messages are not translated and unknown schema keywords are ignored without notice.

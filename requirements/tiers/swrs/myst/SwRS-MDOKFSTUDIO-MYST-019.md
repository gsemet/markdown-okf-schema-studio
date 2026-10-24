---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-019
uuid: bab03b92-b6cb-434a-8dce-8afda479063d
title: Reference roles link to in-page targets
description: When a document uses `{ref}` to a heading, figure, table, equation
  or `(name)=` label, the extension SHALL render an in-page link showing the
  target text or the given text.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-004
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Reference roles link to in-page targets

### Normative behavior

When a document uses `{ref}` to a heading, figure, table, equation or `(name)=` label, the extension SHALL render an in-page link showing the target text or the given text.

### Scenario: Nominal

- GIVEN `{ref}`name`` to a heading
- WHEN the preview renders
- THEN a link shows the heading text without the anchor icon

### Scenario: Boundary or refusal

- GIVEN `{ref}` with explicit text and a target name and a `{ref}` to a label on a paragraph
- WHEN the preview renders
- THEN the given text is shown and the paragraph label becomes a plain #name link

### Verification notes

- Method: test
- Criteria: Captionless figures and tables show the key itself; a missing label raises no warning.

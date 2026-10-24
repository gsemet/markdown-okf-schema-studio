---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-001
uuid: 0974894c-5149-402f-8bec-8a278aa22ac1
title: Named admonitions render with a default title
description: When a document holds a named MyST admonition directive, the
  extension SHALL render a panel with that kind's default title and the Markdown
  body.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Named admonitions render with a default title

### Normative behavior

When a document holds a named MyST admonition directive, the extension SHALL render a panel with that kind's default title and the Markdown body.

### Scenario: Nominal

- GIVEN a document with a `:::{note}` directive and a Markdown body
- WHEN the preview renders
- THEN a panel titled Note holds the rendered body

### Scenario: Boundary or refusal

- GIVEN a document with an admonition kind outside the named list
- WHEN the preview renders
- THEN the panel is titled Admonition and keeps its body

### Verification notes

- Method: test
- Criteria: The named kinds (note, attention, caution, danger, error, hint, important, seealso, tip, warning) show Note, Attention, Caution, Danger, Error, Hint, Important, See Also, Tip, Warning, with colon or backtick fences.

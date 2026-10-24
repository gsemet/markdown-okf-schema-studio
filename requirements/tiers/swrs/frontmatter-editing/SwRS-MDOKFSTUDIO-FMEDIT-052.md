---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-052
uuid: 29bbebff-929b-4f04-a991-0670871cf63f
title: "A save from an older render is refused with a reopen hint"
description: "When a frontmatter save comes from an editor opened on an older render
  than the host holds, the extension SHALL answer \"The preview changed while this
  field was being edited. Reopen the field.\""
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-009
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## A save from an older render is refused with a reopen hint

### Normative behavior

When a frontmatter save comes from an editor opened on an older render than the host holds, the extension SHALL answer "The preview changed while this field was being edited. Reopen the field."

### Scenario: Nominal

- GIVEN an editor opened on render 1 while the host shows render 2 of the same document
- WHEN the save arrives
- THEN the page receives "The preview changed while this field was being edited. Reopen the field." and the document is unchanged

### Scenario: Boundary or refusal

- GIVEN a save naming another document
- WHEN it arrives
- THEN no answer is sent

### Verification notes

- Method: Inspection of reportStaleEdit (src/session/pageMessages.ts).
- Criteria: Read-only and disposed previews also get no stale answer.

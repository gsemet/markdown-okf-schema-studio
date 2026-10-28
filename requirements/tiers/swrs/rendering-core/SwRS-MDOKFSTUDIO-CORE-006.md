---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-006
uuid: 9ed2dd45-d6cd-4543-8b24-6cba280b7e1a
title: Keep body lines absolute after frontmatter
description: When a leading frontmatter block is stripped, the extension SHALL
  number the body blocks by their absolute line in the file, counting LF, CRLF
  and CR line breaks.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-003; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-CORE-003
default_owner_email: gaetan@xeberon.net
---

## Keep body lines absolute after frontmatter

### Normative behavior

When a leading frontmatter block is stripped, the extension SHALL number the body blocks by their absolute line in the file, counting LF, CRLF and CR line breaks.

### Scenario: Nominal keep body lines absolute after frontmatter

- GIVEN a document with a frontmatter block of four lines then a paragraph
- WHEN it is rendered
- THEN the paragraph carries source line 5

### Scenario: Boundary or refusal of keep body lines absolute after frontmatter

- GIVEN the same document saved with CRLF line breaks
- WHEN it is rendered
- THEN the paragraph still carries source line 5

### Verification notes

- Method: Unit test "block source ranges stay absolute when leading frontmatter is stripped" in test/core/render/mystFeatures.test.ts
- Criteria: Body source lines equal the absolute file line for every line-break style.

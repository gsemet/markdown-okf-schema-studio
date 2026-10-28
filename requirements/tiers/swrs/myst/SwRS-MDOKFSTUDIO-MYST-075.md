---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-075
uuid: a39af907-d322-497a-aef2-01a49ff11262
title: Warnings carry the line of the syntax
description: When a warning is reported, the extension SHALL give the line of
  the syntax itself, including inside long paragraphs, after frontmatter and
  with CRLF or CR breaks.
project: markdown-okf-schema-studio
scope: myst
lifecycle: superseded
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-007
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-MYST-072; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by: SwRS-MDOKFSTUDIO-MYST-072
default_owner_email: gaetan@xeberon.net
---

## Warnings carry the line of the syntax

### Normative behavior

When a warning is reported, the extension SHALL give the line of the syntax itself, including inside long paragraphs, after frontmatter and with CRLF or CR breaks.

### Scenario: Nominal

- GIVEN a document with frontmatter and syntax on its ninth line
- WHEN it is checked
- THEN the warning line is 9

### Scenario: Boundary or refusal

- GIVEN CRLF or CR line breaks
- WHEN it is checked
- THEN lines are split like LF

### Verification notes

- Method: Unit test "the line is the line of the syntax inside a long paragraph and counts the frontmatter" in test/core/render/mystSyntaxDetect.test.ts
- Criteria: Frontmatter lines are counted.

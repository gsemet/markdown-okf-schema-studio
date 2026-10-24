---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-013
uuid: cded7006-5260-4b08-b9bd-c5ae8b434973
title: Standalone context tags render as titled panels
description: When a document holds a lower-case context tag alone on its line
  with a matching closing tag, the extension SHALL render a no-icon admonition
  panel titled with the literal tag around the Markdown between the tags, mapped
  from opening to closing line.
project: markdown-okf-schema-studio
scope: myst
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Standalone context tags render as titled panels

### Normative behavior

When a document holds a lower-case context tag alone on its line with a matching closing tag, the extension SHALL render a no-icon admonition panel titled with the literal tag around the Markdown between the tags, mapped from opening to closing line.

### Scenario: Nominal

- GIVEN an opening and a closing context tag named context around links, bold and a fenced YAML block
- WHEN the preview renders
- THEN a panel titled with the tag holds the rendered Markdown and maps to both lines

### Scenario: Boundary or refusal

- GIVEN an inline tag in a sentence
- WHEN the preview renders
- THEN the raw tag is not rendered as HTML and no panel is made

### Verification notes

- Method: test
- Criteria: Tags use lower-case letters, digits, hyphens and underscores.

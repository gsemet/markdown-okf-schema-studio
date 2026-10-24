---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-012
uuid: 431660f8-44f1-4d20-bf75-2b5bf9b18eeb
title: Expand an include in place
description: When a trusted document holds an `{include}` directive for a
  Markdown file inside its folder or the workspace root, the extension SHALL
  render that file's content in place of the directive.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-002
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Expand an include in place

### Normative behavior

When a trusted document holds an `{include}` directive for a Markdown file inside its folder or the workspace root, the extension SHALL render that file's content in place of the directive.

### Scenario: Nominal

- GIVEN a directive including `part.md` that starts with frontmatter
- WHEN it is rendered
- THEN the content of `part.md` appears at the directive position without its frontmatter

### Scenario: Boundary or refusal

- GIVEN an include with the `:class:` option, and another naming a missing file
- WHEN it is rendered
- THEN the first still expands and the second stays in place as a placeholder

### Verification notes

- Method: test
- Criteria: The included Markdown is rendered at the directive position with its frontmatter stripped.

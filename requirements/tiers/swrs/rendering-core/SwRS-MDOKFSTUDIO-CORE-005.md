---
type: SwRS
id: SwRS-MDOKFSTUDIO-CORE-005
uuid: 79f35e28-8e79-4554-9db3-d1b26efe988c
title: Hide leading frontmatter from the body
description: When a document starts with a YAML frontmatter block, the extension
  SHALL leave that block out of the rendered body, so that it is not shown as a
  code block.
project: markdown-okf-schema-studio
scope: rendering-core
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files: []
tested_in_files: []
---

## Hide leading frontmatter from the body

### Normative behavior

When a document starts with a YAML frontmatter block, the extension SHALL leave that block out of the rendered body, so that it is not shown as a code block.

### Scenario: Nominal hide leading frontmatter from the body

- GIVEN a document that starts with a YAML frontmatter block
- WHEN it is rendered
- THEN the body holds no code block for the frontmatter

### Scenario: Boundary or refusal of hide leading frontmatter from the body

- GIVEN a document with a thematic break `---` later in the text
- WHEN it is rendered
- THEN only the leading block is treated as frontmatter

### Verification notes

- Method: test
- Criteria: No frontmatter code block appears in the body; later `---` lines are unchanged.

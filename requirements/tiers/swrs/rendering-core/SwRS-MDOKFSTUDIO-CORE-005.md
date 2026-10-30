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
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CORE-001
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CORE-003; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CORE-003
default_owner_email: gaetan@xeberon.net
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

- Method: Unit test "block source ranges stay absolute when leading frontmatter is stripped" in test/core/render/mystFeatures.test.ts
- Criteria: No frontmatter code block appears in the body; later `---` lines are unchanged.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CORE-001](../../strs/rendering-core/StRS-MDOKFSTUDIO-CORE-001.md): A reader reads a faithful rendering of any document
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CORE-003](SwRS-MDOKFSTUDIO-CORE-003.md): Every rendered block maps to its absolute source lines
<!-- okf:links:end -->

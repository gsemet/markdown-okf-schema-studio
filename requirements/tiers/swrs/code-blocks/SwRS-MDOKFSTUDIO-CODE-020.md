---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-020
uuid: 2f861c2d-576a-47be-a88e-b3ae5c5a39c6
title: Confirm a copy with a Copied state for 1.5 seconds
description: When the host confirms the copy, the extension SHALL label the
  button Copied with a check mark and restore Copy code after 1.5 s.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-CODE-019; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-CODE-019
default_owner_email: gaetan@xeberon.net
---

## Confirm a copy with a Copied state for 1.5 seconds

### Normative behavior

When the host confirms the copy, the extension SHALL label the button Copied with a check mark and restore Copy code after 1.5 s.

### Scenario: nominal behavior

- GIVEN the host has confirmed the copy of Copy code
- WHEN 1.5 s pass
- THEN the button returns to Copy code without the check mark

### Scenario: boundary or refusal behavior

- GIVEN the reader clicks the button twice within 1.5 s
- WHEN the host confirms the second click
- THEN the Copied state lasts 1.5 s from that confirmation

### Verification notes

- Method: Unit test with fake timers.
- Criteria: Label and icon change when the host confirms the copy and reset 1500 ms after the last click.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-CODE-004](../../strs/code-blocks/StRS-MDOKFSTUDIO-CODE-004.md): A reader copies the exact code of a block
- Superseded by:
  - [SwRS-MDOKFSTUDIO-CODE-019](SwRS-MDOKFSTUDIO-CODE-019.md): The copy button copies the raw code and confirms it
<!-- okf:links:end -->

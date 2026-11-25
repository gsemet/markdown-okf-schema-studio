---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-126
uuid: 82824622-7a78-4ed3-aa0b-ae67541adb27
title: "The host accepts only a boolean anchor mode"
description: "When previewAnchorModeChanged reaches the host, the extension SHALL
  accept it only when anchorToEditor is a boolean."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-005
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TOOLBAR-120; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
default_owner_email: gaetan@xeberon.net
superseded_by:
- SwRS-MDOKFSTUDIO-TOOLBAR-120
---

## The host accepts only a boolean anchor mode

### Normative behavior

When previewAnchorModeChanged reaches the host, the extension SHALL accept it only when anchorToEditor is a boolean.

### Scenario (nominal): Boolean

- GIVEN anchorToEditor true and false
- WHEN the validator runs
- THEN both are accepted

### Scenario (refusal): Not a boolean

- GIVEN the string true, the number 1 and a missing field
- WHEN the validator runs
- THEN all are refused

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-120: what the host does with an accepted anchor mode

### Verification notes

- Method: test/core/protocol/pageStateMessages.test.ts (both scenarios: the page-state validators accept exactly what the frozen validator accepted)
- Criteria: typeof anchorToEditor === boolean.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-013](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-013.md): The reader decides how the panes scroll together and sees the cursor block
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-005](../trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host handles the page messages of every preview, whatever the trust
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TOOLBAR-120](SwRS-MDOKFSTUDIO-TOOLBAR-120.md): The Anchor button switches whether the preview follows the editor
<!-- okf:links:end -->

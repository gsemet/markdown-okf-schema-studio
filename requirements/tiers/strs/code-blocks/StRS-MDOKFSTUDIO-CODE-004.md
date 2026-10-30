---
type: StRS
id: StRS-MDOKFSTUDIO-CODE-004
uuid: fa141c5f-0336-4c39-9e9e-8abc65ee3bc1
title: A reader copies the exact code of a block
description: When a reader points at or tabs to a code block in any preview, the
  Studio SHALL offer a one-click copy of the exact code and confirm the copy.
project: markdown-okf-schema-studio
scope: code-blocks
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: Readers need to reuse code samples without selecting text by hand,
  even in a read-only preview.
derived_by:
- SwRS-MDOKFSTUDIO-CODE-017
- SwRS-MDOKFSTUDIO-CODE-018
- SwRS-MDOKFSTUDIO-CODE-019
- SwRS-MDOKFSTUDIO-CODE-020
- SwRS-MDOKFSTUDIO-CODE-021
- SwRS-MDOKFSTUDIO-CODE-022
- SwRS-MDOKFSTUDIO-CODE-023
- SwRS-MDOKFSTUDIO-CODE-024
- SwRS-MDOKFSTUDIO-CODE-025
- SwRS-MDOKFSTUDIO-CODE-026
- SwRS-MDOKFSTUDIO-CODE-027
- SwRS-MDOKFSTUDIO-CODE-029
- SwRS-MDOKFSTUDIO-CODE-032
- SwRS-MDOKFSTUDIO-CODE-033
- SwRS-MDOKFSTUDIO-CODE-034
- SwRS-MDOKFSTUDIO-CODE-035
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## A reader copies the exact code of a block

### Normative behavior

When a reader points at or tabs to a code block in any preview, the Studio SHALL offer a one-click copy of the exact code and confirm the copy.

### Preserved stakeholder intent

Readers need to reuse code samples without selecting text by hand, even in a read-only preview.

### Rationale and constraints

- Not available for blocks being edited or for diagram sources; the button is revealed by pointing or by keyboard focus on the block, and Enter or Space on it copies.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-CODE-017](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-017.md): A Copy code button appears on a hovered or focused code block
  - [SwRS-MDOKFSTUDIO-CODE-018](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-018.md): Hide the copy button below 30 px of visible block
  - [SwRS-MDOKFSTUDIO-CODE-019](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-019.md): The copy button copies the raw code and confirms it
  - [SwRS-MDOKFSTUDIO-CODE-020](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-020.md): Confirm a copy with a Copied state for 1.5 seconds
  - [SwRS-MDOKFSTUDIO-CODE-021](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-021.md): Keep focus and editors untouched by the copy button
  - [SwRS-MDOKFSTUDIO-CODE-022](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-022.md): Offer no copy button for edited blocks, editors, diagram sources and blocks outside the content
  - [SwRS-MDOKFSTUDIO-CODE-023](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-023.md): Hide the copy button on a click inside the block until the pointer moves
  - [SwRS-MDOKFSTUDIO-CODE-024](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-024.md): Hide the copy button when a content patch updates the page
  - [SwRS-MDOKFSTUDIO-CODE-025](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-025.md): Allow copying in read-only previews
  - [SwRS-MDOKFSTUDIO-CODE-026](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-026.md): An invalid or oversized copy request is refused
  - [SwRS-MDOKFSTUDIO-CODE-027](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-027.md): Drop a copy request from a stale page
  - [SwRS-MDOKFSTUDIO-CODE-029](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-029.md): Hide the copy button when the pointer leaves the block
  - [SwRS-MDOKFSTUDIO-CODE-032](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-032.md): Hide the copy button when scrolling stops outside the block
  - [SwRS-MDOKFSTUDIO-CODE-033](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-033.md): Reposition the copy button on window resize
  - [SwRS-MDOKFSTUDIO-CODE-034](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-034.md): Keep the copy button clear of the sticky band and toolbar
  - [SwRS-MDOKFSTUDIO-CODE-035](../../swrs/code-blocks/SwRS-MDOKFSTUDIO-CODE-035.md): Reset the Copied state when another block is hovered
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->

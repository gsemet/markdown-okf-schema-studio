---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-086
uuid: 11be02fb-2adf-45ee-b980-141cbf2f746a
title: The warning banner close message has a bounded key
description: When the host receives previewWarningBannerClosed, it SHALL accept
  it only if its key has at most 32 characters and is made of lower-case letters
  and digits, a hyphen and eight hexadecimal digits.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## The warning banner close message has a bounded key

### Normative behavior

When the host receives previewWarningBannerClosed, it SHALL accept it only if its key has at most 32 characters and is made of lower-case letters and digits, a hyphen and eight hexadecimal digits.

### Scenario (nominal): Valid key

- GIVEN a previewWarningBannerClosed message with key abc12-0123abcd
- WHEN it is checked
- THEN it is accepted

### Scenario (refusal): Invalid key

| Input | Outcome |
| --- | --- |
| a key of 33 characters | refused |
| a key without the hyphen | refused |
| a key with upper-case letters | refused |

A refused message is ignored without a visible change (see SwRS-MDOKFSTUDIO-TRUST-052).

### Related requirements

- SwRS-MDOKFSTUDIO-MYST-081: the banner close sends the key of its warning set

### Verification notes

- Method: Unit test test/core/protocol/pageToHost.test.ts (CR 050: the warning banner messages are registered with a bounded key) covers the valid key and the invalid keys.
- Criteria: The key matches ^[0-9a-z]+-[0-9a-f]{8}$ and has at most 32 characters.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
<!-- okf:links:end -->

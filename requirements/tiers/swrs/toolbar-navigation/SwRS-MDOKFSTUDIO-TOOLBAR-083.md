---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-083
uuid: 92744903-c376-4e65-81a7-346fbf52a0ba
title: "The host accepts discovery messages of bounded size"
description: "When a previewLinkDiscover message reaches the host, the extension SHALL
  accept it only when its requests are an array of at most 64 strings of at most 4096
  characters each."
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
default_owner_email: gaetan@xeberon.net
---

## The host accepts discovery messages of bounded size

### Normative behavior

When a previewLinkDiscover message reaches the host, the extension SHALL accept it only when its requests are an array of at most 64 strings of at most 4096 characters each.

### Scenario (nominal): Requests within the bounds

| Input | Outcome |
| --- | --- |
| 64 requests of 4096 characters | the message is accepted (the limit) |
| an empty array | accepted |

### Scenario (refusal): Requests over the bounds or of the wrong kind

| Input | Outcome |
| --- | --- |
| 65 requests | refused |
| a request of 4097 characters | refused |
| a number among the requests | refused |
| a value that is not an array | refused |

### Verification notes

- Method: test/core/protocol/pageStateMessages.test.ts (both scenarios: the page-state validators accept exactly what the frozen validator accepted; the empty array row is by code only)
- Criteria: requests.length <= 64 and every request is a string of at most 4096 characters.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
- Depends on:
  - [SwRS-MDOKFSTUDIO-TRUST-052](../trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-006](../trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->

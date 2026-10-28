---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-113
uuid: 9b4123a5-868f-481d-83fc-248073acac59
title: "A link message needs a request, else it is ignored or refused"
description: "When previewLink reaches the host, the extension SHALL record the page's
  scroll state and follow the link only when the message carries a request, ignoring
  a message without one and refusing a malformed frontmatter link request with the
  reason The frontmatter link request is invalid."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-011
- StRS-MDOKFSTUDIO-FMSCHEMA-014
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/session/features/links.ts
tested_in_files:
- test/session/diagReq.links.requirements.test.ts
- test/session/toolbarReq.requirements.test.ts
default_owner_email: gaetan@xeberon.net
---

## A link message needs a request, else it is ignored or refused

### Normative behavior

When previewLink reaches the host, the extension SHALL record the page's scroll state and follow the link only when the message carries a request, ignoring a message without one and refusing a malformed frontmatter link request with the reason The frontmatter link request is invalid.

### Scenario (nominal): With a request

- GIVEN a previewLink message with a request
- WHEN the host receives it
- THEN the link is followed

### Scenario (refusal): No request

- GIVEN a previewLink message with no request field
- WHEN the host receives it
- THEN only the page's scroll state is recorded, no link is resolved and nothing opens

### Scenario (refusal): Malformed frontmatter link request

- GIVEN a navigation request okf-link: followed by text that is not valid JSON
- WHEN the request is handled
- THEN the reason reads The frontmatter link request is invalid. and nothing opens

### Scenario (nominal): Well-formed frontmatter link request

- GIVEN a request whose JSON names an existing link
- WHEN the request is handled
- THEN the link is followed

### Scenario (refusal): Request that is not a string

- GIVEN a previewLink message whose request is not a string
- WHEN the validator runs
- THEN the message is refused (see SwRS-MDOKFSTUDIO-TRUST-052)

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-077: the reason of a blocked link is shown in the warning of the refused link
- SwRS-MDOKFSTUDIO-FMSCHEMA-073: a resolving frontmatter link opens its target

### Verification notes

- Method: test/session/toolbarReq.requirements.test.ts (with and without a request: a link message without a request records the page state and follows nothing)
- Method: test/session/diagReq.links.requirements.test.ts (malformed and well-formed frontmatter link request: a malformed frontmatter link request is refused with its own reason)
- Method: the request that is not a string is checked with the shared optional fields (see SwRS-MDOKFSTUDIO-TRUST-052)
- Criteria: The handler returns without work when request is falsy. The reason is shown in the same warning as other refusals.

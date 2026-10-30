---
type: SwRS
id: SwRS-MDOKFSTUDIO-MYST-044
uuid: 5587a395-c27c-48a0-b8e4-914423ab6b6a
title: The host refuses a rename for an out-of-date preview
description: When a rename is for a document revision the host has moved past,
  the extension SHALL change nothing and answer The preview is out of date. Try
  again once it has refreshed.
project: markdown-okf-schema-studio
scope: myst
req_lifecycle: superseded
status: deprecated
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-MYST-009
annotation_exemption: true
exemption_reason: "Superseded by SwRS-MDOKFSTUDIO-TRUST-065; no marker expected."
derived_by: []
implemented_in_files: []
tested_in_files: []
superseded_by:
- SwRS-MDOKFSTUDIO-TRUST-065
default_owner_email: gaetan@xeberon.net
---

## The host refuses a rename for an out-of-date preview

### Normative behavior

When a rename is for a document revision the host has moved past, the extension SHALL change nothing and answer The preview is out of date. Try again once it has refreshed.

### Scenario: Nominal

- GIVEN a document edited after rendering
- WHEN a rename request arrives with the old revision data
- THEN the refusal text is returned and nothing changes

### Scenario: Boundary or refusal

- GIVEN a message for a stale render revision
- WHEN it reaches the render gate
- THEN the host answers with ok false and the stale-line refusal, and nothing changes

### Verification notes

- Method: Integration suite run() in test/integration/labelRename.test.ts
- Method: test/session/trustReq.requirements.test.ts (a label rename from an older render is answered with the stale-line refusal)
- Criteria: The page shows the stale-line refusal in the second case.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-MYST-009](../../strs/myst/StRS-MDOKFSTUDIO-MYST-009.md): A writer sees, links and renames labels safely
- Superseded by:
  - [SwRS-MDOKFSTUDIO-TRUST-065](../trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
<!-- okf:links:end -->

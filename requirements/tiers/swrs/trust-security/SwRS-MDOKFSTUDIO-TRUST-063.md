---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-063
uuid: 39a22acc-14dc-4d01-a19f-f4ccfdf5c653
title: A link targets message needs an array of the current render
description: When the page receives previewLinkTargets, it SHALL accept it only
  if its targets are an array and it names the render of the page.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-TOOLBAR-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-059
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/runtimeContentPatch.test.ts
---

## A link targets message needs an array of the current render

### Normative behavior

When the page receives previewLinkTargets, it SHALL accept it only if its targets are an array and it names the render of the page.

### Scenario (nominal): Array for the current render

- GIVEN a previewLinkTargets message for the current render with two targets
- WHEN it arrives
- THEN it reaches its handler and the links are marked

### Scenario (refusal): Not an array

- GIVEN the same message with targets set to an object
- WHEN it arrives
- THEN it goes to unhandled

### Scenario (refusal): Stale render

- GIVEN an answer for the previous request id, which names another render than the page
- WHEN the page receives it
- THEN it is not applied and no link changes

### Related requirements

- SwRS-MDOKFSTUDIO-TOOLBAR-085: the page marks each link with its target kind

### Verification notes

- Method: Unit test test/core/protocol/hostToPage.test.ts (the payload checks refuse what the page used to refuse) covers the array and the object.
- Method: Unit test test/page/runtimeContentPatch.test.ts (link target hints of a stale render are ignored) covers the stale render and the current render.
- Criteria: The items of the array are read by the handler of the link hints. The host-message filter drops answers whose identifiers differ.

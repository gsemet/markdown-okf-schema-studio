---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-010
uuid: ef730065-f4d9-42f2-84cf-3c3749e707ca
title: An unknown palette mode is refused and stores nothing
description: When the page posts previewPaletteModeChanged with a mode other
  than strict, gfm, myst or full, the extension SHALL refuse the message and
  keep the stored mode unchanged.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-002
depends_on:
- SwRS-MDOKFSTUDIO-LIFE-169
- SwRS-MDOKFSTUDIO-LIFE-170
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
- test/integration/paletteMode.test.ts
default_owner_email: gaetan@xeberon.net
---

## An unknown palette mode is refused and stores nothing

### Normative behavior

When the page posts previewPaletteModeChanged with a mode other than strict, gfm, myst or full, the extension SHALL refuse the message and keep the stored mode unchanged.

### Scenario (nominal): Accepted shape

- GIVEN a palette whose select changes to another of the modes strict, gfm, myst or full
- WHEN the page posts previewPaletteModeChanged once, with the identity fields documentId, revision and requestId (the envelope is checked first, see SwRS-MDOKFSTUDIO-TRUST-052) and the field mode
- THEN the host accepts the message through the gate of its type (see SwRS-MDOKFSTUDIO-TRUST-065), stores the mode for the workspace and the next preview starts in it (see SwRS-MDOKFSTUDIO-LIFE-169 and SwRS-MDOKFSTUDIO-LIFE-170)

### Scenario (refusal): Unknown or non-string mode

- GIVEN a workspace whose stored mode is gfm
- WHEN the page reports a mode of the table
- THEN the message is rejected by the protocol validator and the next preview still starts in gfm

| mode | Outcome |
| --- | --- |
| html | rejected |
| the empty text | rejected |
| a number or true (not a string) | rejected |
| missing | rejected |

### Scenario (refusal): Read-only preview

- GIVEN a read-only preview
- WHEN the page posts previewPaletteModeChanged with the mode strict
- THEN the host stores nothing

### Verification notes

- Method: test/integration/paletteMode.test.ts (accepted shape, an invalid mode is not stored); test/core/protocol/pageToHost.test.ts (previewPaletteModeChanged accepts only strict, gfm, myst or full: html, the empty text, true and a missing mode are rejected); test/page/runtimeEditPalette.test.ts (choosing a mode posts previewPaletteModeChanged once); test/integration/untrusted-suite.ts (read-only preview)
- Method: the number case is deduced from the validator (isOneOf the three modes), not tested
- Criteria: The validator accepts exactly the three mode names, and the stored mode is the same before and after the invalid message.

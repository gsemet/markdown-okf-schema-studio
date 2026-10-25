---
type: SwRS
id: SwRS-MDOKFSTUDIO-TOOLBAR-013
uuid: afd5fe43-39e1-4f58-b59d-29ba2b3fd97b
title: "The host accepts only a known view preference with a valid value"
description: "When a previewViewPreferenceChanged message reaches the host, the extension
  SHALL accept it only for a known preference with a value valid for that preference
  (zoom: an integer from 70 to 200; widthMode: margin, auto or full; toc, incomingChanges,
  comments and toolbarCollapsed: a boolean) and drop every other message without an
  answer."
project: markdown-okf-schema-studio
scope: toolbar-navigation
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TOOLBAR-001
- StRS-MDOKFSTUDIO-THEME-011
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-LIFE-169
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageToHost.test.ts
---

## The host accepts only a known view preference with a valid value

### Normative behavior

When a previewViewPreferenceChanged message reaches the host, the extension SHALL accept it only for a known preference with a value valid for that preference (zoom: an integer from 70 to 200; widthMode: margin, auto or full; toc, incomingChanges, comments and toolbarCollapsed: a boolean) and drop every other message without an answer.

### Scenario (nominal): Valid values

| Input | Outcome |
| --- | --- |
| toc true, incomingChanges false, comments true and toolbarCollapsed false | each message is accepted |
| widthMode auto (and margin, full) | the message is accepted |

### Scenario (boundary): Zoom

| Input | Outcome |
| --- | --- |
| zoom 70, 130 and 200 | all three are accepted |
| zoom 60, 210, 1.2, the text 100 and NaN | all five are dropped without an answer and the stored zoom is unchanged |

### Scenario (refusal): Other values and unknown names

| Input | Outcome |
| --- | --- |
| toc of the string true, comments of 1 | each message is refused and the host does not change a preference |
| an unknown preference name, or a name that is not an own key of the validators | refused |
| widthMode wide and the number 1 | both are refused |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-169: where an accepted preference is stored (the width mode and the zoom included)

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (nominal, zoom, refusal: previewViewPreferenceChanged validates the value per preference; the own-key rows are by code only)
- Criteria: Booleans pass for the four switches; only the integers 70 to 200 pass for the zoom; isOneOf(value, margin, auto, full) for the width mode; every other value or name fails. The envelope and the render gate are those of the page messages (see SwRS-MDOKFSTUDIO-TRUST-052 and SwRS-MDOKFSTUDIO-TRUST-065); a read-only preview keeps the preference like a writable one (see SwRS-MDOKFSTUDIO-TRUST-006).

---
type: SwRS
id: SwRS-MDOKFSTUDIO-THEME-013
uuid: e0bcbd86-ab70-41a7-b2a6-84e4dd28e0b7
title: "The host drops a theme-mode message with an unknown mode"
description: "When a previewThemeModeChanged message carries a mode other than current,
  dark, white or cream, the extension SHALL drop it without changing the stored mode
  or answering."
project: markdown-okf-schema-studio
scope: theme-zoom
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-THEME-004
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-LIFE-169
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
- src/session/features/viewState.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
---

## The host drops a theme-mode message with an unknown mode

### Normative behavior

When a previewThemeModeChanged message carries a mode other than current, dark, white or cream, the extension SHALL drop it without changing the stored mode or answering.

### Scenario (nominal): A valid mode

- GIVEN an open preview and a previewThemeModeChanged message naming cream (any of current, dark, white and cream)
- WHEN the host validates the message
- THEN the message is accepted and the host stores the mode (see SwRS-MDOKFSTUDIO-LIFE-169); the accepted shape is the common envelope (see SwRS-MDOKFSTUDIO-TRUST-052) and the field previewThemeMode, a string of one of the four modes

### Scenario (refusal): Unknown mode

- GIVEN an open preview and a message naming sepia
- WHEN the host validates the message
- THEN the message is rejected, nothing is stored and no result is posted to the page

### Scenario (refusal): Missing mode

- GIVEN a message of that type without the previewThemeMode field
- WHEN the host validates the message
- THEN the message is rejected in the same way

### Related requirements

- SwRS-MDOKFSTUDIO-THEME-001: the Theme button that posts the message.
- SwRS-MDOKFSTUDIO-LIFE-169: where a valid mode is stored.

### Verification notes

- Method: test/core/protocol/pageStateMessages.test.ts, unit test `the page-state validators accept exactly what the frozen validator accepted` (all three scenarios): its corpus holds the modes cream and neon and an absent mode, and exercises the live validator PAGE_TO_HOST_VALIDATORS.previewThemeModeChanged (src/core/protocol/pageToHost.ts). The unit test `accepts only complete theme-mode change messages` (test/core/state/previewTheme.test.ts) exercises a helper the host does not use. The guard in src/session/features/viewState.ts repeats the check and is not tested separately.
- Criteria: Only the four modes pass the validator; the others and an absent field do not.

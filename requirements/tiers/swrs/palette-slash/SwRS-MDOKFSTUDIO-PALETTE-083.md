---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-083
uuid: b8684a29-107d-47c0-8f81-327ada44d54a
title: Cmd or Ctrl with B, I or K runs Bold, Italic or Link on the platform's
  command key
description: When the writer presses Cmd+B, Cmd+I or Cmd+K on macOS, or Ctrl+B,
  Ctrl+I or Ctrl+K elsewhere, in the block text box, the extension SHALL run
  Bold, Italic or the Link panel, matching the typed letter before the physical
  key, matching no other key press, and naming the shortcut in the tooltip of
  each palette button.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-019
depends_on: []
scenarios:
- id: S1
  title: Platform key
- id: S2
  title: Typed letter first
- id: S3
  title: Tooltip and accessible name
- id: S4
  title: Wrong command key
- id: S5
  title: Keys that never match
- id: S6
  title: Button without a shortcut
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/editActions.ts
tested_in_files:
- test/page/modules/editActions.test.ts
- test/page/runtimeEditPalette.test.ts
default_owner_email: gaetan@xeberon.net
---

## Cmd or Ctrl with B, I or K runs Bold, Italic or Link on the platform's command key

### Normative behavior

When the writer presses Cmd+B, Cmd+I or Cmd+K on macOS, or Ctrl+B, Ctrl+I or Ctrl+K elsewhere, in the block text box, the extension SHALL run Bold, Italic or the Link panel, matching the typed letter before the physical key, matching no other key press, and naming the shortcut in the tooltip of each palette button.

### Scenario S1 (nominal): Platform key

- GIVEN a block editor with a selected word on Windows
- WHEN the writer presses Ctrl+B
- THEN the word is wrapped in ** and the key does not reach VS Code

### Scenario S2 (nominal): Typed letter first

| Input | Outcome |
| --- | --- |
| A Dvorak layout where the physical K key types t, and the writer presses Ctrl+K | No shortcut matches and the key stays with the browser |
| A layout where the physical K key types a Cyrillic letter, and the writer presses Ctrl+K | The Link shortcut matches through the physical key |

### Scenario S3 (nominal): Tooltip and accessible name

- GIVEN a palette on Windows
- WHEN the writer hovers Bold
- THEN the tooltip reads Bold (Ctrl+B) and the accessible name is Bold; on macOS the tooltip uses Cmd

### Scenario S4 (refusal): Wrong command key

- GIVEN a block editor on macOS
- WHEN the writer presses Ctrl+K
- THEN the Link panel does not open

### Scenario S5 (refusal): Keys that never match

| Input | Outcome |
| --- | --- |
| A layout where AltGr types a character, reported as Ctrl and Alt together, and the writer presses AltGr and B | No shortcut matches |
| An IME composition in progress and the writer presses Ctrl+B | No shortcut matches |
| A plain key, a key with Alt or AltGraph, a key with neither Cmd nor Ctrl, or B, I or K with Shift | No shortcut matches |

### Scenario S6 (boundary): Button without a shortcut

- GIVEN the palette
- WHEN the writer hovers Strikethrough
- THEN the tooltip reads Strikethrough without parentheses

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-266: the Ctrl+/ shortcut, which toggles a plain comment and has no palette button.

### Verification notes

- Method: test/page/modules/editActions.test.ts (shortcutFor uses Cmd on macOS and Ctrl elsewhere for B and I; Cmd+K on macOS and Ctrl+K elsewhere find the link action, matched on key before code; shortcutFor reads the typed key first and the physical code only for non-Latin keys; shortcutFor ignores plain keys, other modifiers, composition and AltGr; shortcutLabel shows Cmd on macOS and Ctrl elsewhere; scenarios platform key, typed letter first, wrong command key, keys that never match, tooltip)
- Method: test/page/runtimeEditPalette.test.ts (T22: Cmd+K on macOS opens the panel and Ctrl+K there does not; T21: the palette buttons show the real shortcut in their tooltip; scenarios wrong command key, tooltip and accessible name, button without a shortcut)
- Method: real-window scenario scenarioShortcuts in test/integration/realInput/textEditing.ts (scenario platform key)
- Criteria: The primary modifier is metaKey without ctrlKey on macOS and ctrlKey without metaKey elsewhere; Shift makes B, I and K not match; a Latin letter key never falls back to the code and a key with no Latin letter does; shortcutFor returns undefined for each listed event; the label of a shortcut is the platform command key, a plus sign and the upper-cased first key of the action, and the comment shortcut prints a slash.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-PALETTE-019](../../strs/palette-slash/StRS-MDOKFSTUDIO-PALETTE-019.md): A writer formats text with buttons and shortcuts
<!-- okf:links:end -->

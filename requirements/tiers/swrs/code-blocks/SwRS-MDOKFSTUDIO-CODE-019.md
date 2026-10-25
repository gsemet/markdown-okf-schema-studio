---
type: SwRS
id: SwRS-MDOKFSTUDIO-CODE-019
uuid: 77c7ef91-774e-43c6-95d4-c03409e937bb
title: The copy button copies the raw code and confirms it
description: When the reader clicks the copy button, the extension SHALL put the
  block's code only on the clipboard, without file name or line numbers, lines
  joined with newlines and a trailing newline, label the button Copied with a
  check mark for 1.5 s and keep the focus and the editors untouched.
project: markdown-okf-schema-studio
scope: code-blocks
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-CODE-004
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-006
- SwRS-MDOKFSTUDIO-CODE-026
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/modules/codeCopy.ts
tested_in_files:
- test/page/modules/codeCopy.test.ts
---

## The copy button copies the raw code and confirms it

### Normative behavior

When the reader clicks the copy button, the extension SHALL put the block's code only on the clipboard, without file name or line numbers, lines joined with newlines and a trailing newline, label the button Copied with a check mark for 1.5 s and keep the focus and the editors untouched.

### Scenario (nominal): The clipboard holds the code lines only

- GIVEN a numbered, emphasized block with a file name
- WHEN the reader clicks Copy code
- THEN the clipboard holds the code lines only, joined by newlines with a trailing newline (the page sends the text in a copy request, see SwRS-MDOKFSTUDIO-CODE-026)

### Scenario (boundary): A diff block keeps its markers

- GIVEN a diff block
- WHEN the reader clicks Copy code
- THEN the clipboard holds the lines with their `+` and `-` markers and nothing else

### Scenario (nominal): The button confirms with Copied for 1.5 seconds

- GIVEN the reader has clicked Copy code
- WHEN 1.5 s pass
- THEN the button was labelled Copied with a check mark from the click and returns to Copy code without the check mark

### Scenario (boundary): A second click restarts the confirmation

- GIVEN the reader clicks the button twice within 1.5 s
- WHEN the second click happens
- THEN the Copied state lasts 1.5 s from the second click

### Scenario (nominal): An open block editor keeps the focus

- GIVEN a block editor is open elsewhere
- WHEN the reader presses the copy button
- THEN the editor keeps the focus

### Scenario (refusal): Edit mode opens and commits no editor

- GIVEN edit mode is on
- WHEN the reader clicks the copy button of a block
- THEN the code is copied and no editor opens or commits, and the click does not reach the block's own click handling

### Related requirements

- SwRS-MDOKFSTUDIO-CODE-017: shows the copy button on a hovered code block
- SwRS-MDOKFSTUDIO-CODE-026: refuses an invalid or oversized copy request

### Verification notes

- Method: test/page/modules/codeCopy.test.ts (posted text, diff markers, Copied label and icon with fake timers, second click, mousedown default-prevented and click not propagated, focus kept)
- Method: test/session/renderReq.codeCopy.requirements.test.ts (host clipboard write of the posted text)
- Criteria: clipboard text equals the source code plus one trailing newline; label and icon change at click and reset 1500 ms after the last click; mousedown is default-prevented; click does not propagate

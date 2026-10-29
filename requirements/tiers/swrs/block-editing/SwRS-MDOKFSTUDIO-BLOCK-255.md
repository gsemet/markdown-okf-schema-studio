---
type: SwRS
id: SwRS-MDOKFSTUDIO-BLOCK-255
uuid: 51d2630d-2578-4051-aa82-15ec1f6c687b
title: A block editor that opens late leaves the focus in a field that took it
description: When the source of a block editor reaches the page after another
  text field outside the editor took the focus (the find field opened with
  Cmd/Ctrl+F right after the click), the page SHALL build the editor without
  moving the focus, so text typed in that field never reaches the Markdown
  source.
project: markdown-okf-schema-studio
scope: block-editing
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-BLOCK-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/page/features/blockEditor.ts
- src/page/features/blockSourceEditor.ts
tested_in_files:
- test/integration/realInput/markers.ts
- test/page/runtimeBlockEditor.test.ts
- test/session/heldEditSource.test.ts
default_owner_email: gaetan@xeberon.net
---

## A block editor that opens late leaves the focus in a field that took it

### Normative behavior

When the source of a block editor reaches the page after another text field outside the editor took the focus (the find field opened with Cmd/Ctrl+F right after the click), the page SHALL build the editor without moving the focus, so text typed in that field never reaches the Markdown source.

### Scenario (nominal): The find field keeps the focus

- GIVEN edit mode on and a click on a block, whose editor waits for its source from the host
- WHEN the find bar opens before the source arrives (Cmd/Ctrl+F) and the source then arrives
- THEN the editor is built with its text box and stays open, and the find field keeps the focus: what the writer types goes on into the search, not into the Markdown source

| Input | Outcome |
| --- | --- |
| Another text field, select or editable element outside the editor took the focus | It keeps the focus; the editor opens unfocused |
| The focus is where it was when the editor opened (the page, the clicked block) | The text box takes the focus as in BLOCK-014 |
| The focus moved into the editor frame itself | The text box takes the focus |

### Scenario (boundary): The editor stays open

- GIVEN an editor built without the focus because another field held it
- WHEN the writer looks at the find bar or clicks into the text box
- THEN the editor is an open edit like any other: replace in the find bar is refused until it is saved or cancelled, and a click in the text box edits it

### Verification notes

- Method: test/page/runtimeBlockEditor.test.ts, unit tests `CR 169: ...` over the page script: the source delivered after the find bar opened leaves the focus in the find field; the source delivered with the focus still on the page focuses the text box.
- Criteria: features/blockSourceEditor.ts focuses the text box only when no text field outside the frame took the focus since the editor opened (`focusAtOpen`, recorded by features/blockEditor.ts).
- Method: test/integration/realInput/findAfterClick.ts, a real-window scenario (CR 188): in edit mode the click on a block, Cmd/Ctrl+F and the query are issued back to back without waiting for the editor. The host answers an open within milliseconds, usually before the key, so the scenario holds the block source back with a test hook (`holdEditSourcesForTests`) until the whole query is in the find field, then lets it through: the editor is built and stays open with its own text, the find field keeps the query and the focus, the match count shows, and the Markdown buffer and the file on disk are unchanged.
- Method: test/session/heldEditSource.test.ts: the held source reaches the page only when released, unchanged.
- Method: test/page/runtimeBlockEditor.test.ts, `CR 188: ...`: the same sequence over the page script, typing into whichever field holds the focus.

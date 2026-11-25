---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-059
uuid: 3b60cf32-5163-44a4-be44-9df77c058712
title: The page accepts only registered host messages addressed to its render
description: 'When the page receives a window message event, it SHALL hand its value
  to the host message filter only if the event comes from the frame that hosts the
  page, from another frame with the page''s own origin that is not the window that
  opened it, from the page''s own window with its own origin, or is dispatched inside
  the page without a sender; a message posted by any other window or frame SHALL be
  dropped. When the page receives a value from the host, it SHALL treat it as a host
  message only if it is an object whose type is an own key of the table of host message
  rules and it is addressed to the page by that rule, which names the document, revision
  and request of the render the page shows, or the document alone, or no render identity
  but an identifier of its own, and whose payload is within the bounds of its type
  (table of the payload checks).'
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-BLOCK-025
- StRS-MDOKFSTUDIO-TOOLBAR-011
- StRS-MDOKFSTUDIO-BLOCK-006
depends_on: []
scenarios:
- id: S1
  title: Registered type, current render
- id: S2
  title: A message from another window or frame
- id: S3
  title: Values that are not host messages
- id: S4
  title: A render that is not the shown one
- id: S5
  title: Addressing by the rule of the type
- id: S6
  title: The payload of a type is within its bounds
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/page/hostTransport.ts
tested_in_files:
- test/core/protocol/hostToPage.holes.test.ts
- test/core/protocol/hostToPage.test.ts
- test/page/hostMessages.test.ts
- test/page/runtimeBlockEditor.test.ts
- test/page/runtimeBlockMoves.test.ts
- test/page/runtimeContentPatch.test.ts
default_owner_email: gaetan@xeberon.net
supersedes:
- SwRS-MDOKFSTUDIO-TRUST-061
- SwRS-MDOKFSTUDIO-TRUST-062
- SwRS-MDOKFSTUDIO-TRUST-063
- SwRS-MDOKFSTUDIO-TRUST-064
---

## The page accepts only registered host messages addressed to its render

### Normative behavior

When the page receives a window message event, it SHALL hand its value to the host message filter only if the event comes from the frame that hosts the page, from another frame with the page's own origin that is not the window that opened it, from the page's own window with its own origin, or is dispatched inside the page without a sender; a message posted by any other window or frame SHALL be dropped. When the page receives a value from the host, it SHALL treat it as a host message only if it is an object whose type is an own key of the table of host message rules and it is addressed to the page by that rule, which names the document, revision and request of the render the page shows, or the document alone, or no render identity but an identifier of its own, and whose payload is within the bounds of its type (table of the payload checks).

### Scenario S1 (nominal): Registered type, current render

- GIVEN a page that shows revision 2, request 5 of a document and a themeChanged message that names them
- WHEN the message arrives
- THEN it is accepted and reaches its handler

### Scenario S2 (refusal): A message from another window or frame

- GIVEN a page in a webview whose parent frame hosts it, a message event sent by the parent frame, one sent by another frame of the webview host with the page's origin, one sent by another window, one sent by a window with a foreign origin, and one sent by the opener
- WHEN each event arrives
- THEN only the ones from the parent frame and from the same-origin host frame (and one dispatched in the page without a sender) reach the host message filter; the others are dropped

### Scenario S3 (refusal): Values that are not host messages

- GIVEN a string, null, an unknown type and the types __proto__ and constructor
- WHEN each is checked
- THEN none is accepted

### Scenario S4 (refusal): A render that is not the shown one

- GIVEN the same page and a message that names revision 1 and request 4, and a page whose render identity moved to revision 3 by a content patch
- WHEN the messages arrive
- THEN the older ones go to unhandled and a message for revision 3 reaches its handler

### Scenario S5 (boundary): Addressing by the rule of the type

| Addressing | Message must name | Types |
| --- | --- | --- |
| render | the document id, revision and request id of the render the page shows | previewEditSource, previewBlockMoveResult and previewBlocksResult (another requestId, or another document or revision: the page ignores it; an answer for the page's render: the page handles it), themeChanged, previewPropertiesTable, previewContentPatch, previewLinkTargets and the other render-addressed types |
| document | the document id only; the render may differ | previewPlantUmlIncludesChanged |
| own-id | no render identity; matched by an identifier of its own (editId, flushId), because the host may already follow the next document or render | the results of the host round trips, previewFlushEdit and previewEditorWatch |

### Scenario S6 (refusal): The payload of a type is within its bounds

| Message | Accepted only if | Otherwise |
| --- | --- | --- |
| previewContentPatch | next holds integer revision and requestId, a finite initialAnchor if present, an initialPin with finite line and viewportTop if present, a contentHtml string of at most 20 MiB, a known status (pending, success, stale, error, missing-source or recovery), a label string of at most 500 characters, an optional message string of at most 20 000 characters, and at most 500 diagnostics, each with a severity of at most 50 characters, a text of at most 20 000 characters and, when present, a code of at most 100 characters | refused, not applied: 501 diagnostics, a content over 20 MiB, an unknown status, a non-finite anchor, a diagnostic code of 101 characters; a valid patch is applied and each status line keeps its code attribute |
| previewPropertiesTable | its markup is a string | goes to unhandled (markup null) |
| previewLinkTargets | its targets are an array and it names the render of the page | goes to unhandled (an object, or the previous request id: no link changes) |
| previewFlushEdit, previewEditorWatch | its flushId or its editId is a string, whatever the document the message names (own-id addressing) | goes to unhandled and the page ignores it; a watch naming the next document is answered |

### Related requirements

- SwRS-MDOKFSTUDIO-LIFE-071: a render that cannot patch loads a new page document
- SwRS-MDOKFSTUDIO-TOOLBAR-085: the page marks each link with its target kind

### Verification notes

- Method: test/core/protocol/hostToPage.test.ts (every host message type has a rule, and a well-formed message for the page passes it; values that are not host messages are refused; each rule matches the identity it names, and only that: all scenarios and the addressing table).
- Method: test/page/hostMessages.test.ts (a window message event reaches the listener only from the parent frame, a same-origin host frame, the page itself or an event without a sender; a host message addressed to the page reaches its handler, any other goes to unhandled; the page is read at each message, so a moved render identity applies at once: nominal and render scenarios).
- Method: test/page/runtimeBlockMoves.test.ts (`T36: a refused move says why next to the bar; a result of another context is ignored`: previewBlockMoveResult row of the render addressing).
- Method: test/core/protocol/hostToPage.test.ts (the payload checks refuse what the page used to refuse: the out of bounds patch, the markup, the targets, the identifiers).
- Method: test/page/runtimeContentPatch.test.ts (a patch keeps the code of each status line and refuses a malformed one; link target hints of a stale render are ignored) and test/page/runtimeBlockEditor.test.ts (STAB-03: a watch sent while the host already follows another document is still answered).
- Criteria: A value the filter refuses is not given to the handler of any type. The page identity is read at every message. Answers of host round trips are matched by their own edit identifier and are not checked against the render.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derives from:
  - [StRS-MDOKFSTUDIO-TRUST-009](../../strs/trust-security/StRS-MDOKFSTUDIO-TRUST-009.md): What the page and the host exchange is checked and never applied to another version
  - [StRS-MDOKFSTUDIO-BLOCK-025](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-025.md): Preview edits land exactly, in one undo step, keep line endings, or are refused with a reason
  - [StRS-MDOKFSTUDIO-TOOLBAR-011](../../strs/toolbar-navigation/StRS-MDOKFSTUDIO-TOOLBAR-011.md): Links open the right target, show where they lead, or are refused with a reason
  - [StRS-MDOKFSTUDIO-BLOCK-006](../../strs/block-editing/StRS-MDOKFSTUDIO-BLOCK-006.md): Typed text is saved, survives updates and is never lost on leaving
- Supersedes:
  - [SwRS-MDOKFSTUDIO-TRUST-061](SwRS-MDOKFSTUDIO-TRUST-061.md): A content patch message is applied only within its bounds
  - [SwRS-MDOKFSTUDIO-TRUST-062](SwRS-MDOKFSTUDIO-TRUST-062.md): A properties table message needs string markup
  - [SwRS-MDOKFSTUDIO-TRUST-063](SwRS-MDOKFSTUDIO-TRUST-063.md): A link targets message needs an array of the current render
  - [SwRS-MDOKFSTUDIO-TRUST-064](SwRS-MDOKFSTUDIO-TRUST-064.md): Flush and editor watch messages are addressed by their own id
<!-- okf:links:end -->

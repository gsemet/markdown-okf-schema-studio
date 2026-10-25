---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-059
uuid: 3b60cf32-5163-44a4-be44-9df77c058712
title: The page accepts only registered host messages addressed to its render
description: When the page receives a value from the host, it SHALL treat it as
  a host message only if it is an object whose type is an own key of the table
  of host message rules and it is addressed to the page by that rule, which
  names the document, revision and request of the render the page shows, or the
  document alone, or no render identity but an identifier of its own.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-BLOCK-025
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/hostToPage.ts
- src/page/hostTransport.ts
tested_in_files:
- test/core/protocol/hostToPage.test.ts
- test/page/hostMessages.test.ts
- test/page/runtimeBlockMoves.test.ts
---

## The page accepts only registered host messages addressed to its render

### Normative behavior

When the page receives a window message event, it SHALL hand its value to the host message filter only if the event comes from the frame that hosts the page, from the page's own window with its own origin, or is dispatched inside the page without a sender; a message posted by any other window or frame SHALL be dropped. When the page receives a value from the host, it SHALL treat it as a host message only if it is an object whose type is an own key of the table of host message rules and it is addressed to the page by that rule, which names the document, revision and request of the render the page shows, or the document alone, or no render identity but an identifier of its own.

### Scenario (nominal): Registered type, current render

- GIVEN a page that shows revision 2, request 5 of a document and a themeChanged message that names them
- WHEN the message arrives
- THEN it is accepted and reaches its handler

### Scenario (refusal): A message from another window or frame

- GIVEN a page in a webview whose parent frame hosts it, a message event sent by the parent frame, one sent by another window, and one sent by a window with a foreign origin
- WHEN each event arrives
- THEN only the one from the parent frame (and one dispatched in the page without a sender) reaches the host message filter; the others are dropped

### Scenario (refusal): Values that are not host messages

- GIVEN a string, null, an unknown type and the types __proto__ and constructor
- WHEN each is checked
- THEN none is accepted

### Scenario (refusal): A render that is not the shown one

- GIVEN the same page and a message that names revision 1 and request 4, and a page whose render identity moved to revision 3 by a content patch
- WHEN the messages arrive
- THEN the older ones go to unhandled and a message for revision 3 reaches its handler

### Scenario (boundary): Addressing by the rule of the type

| Addressing | Message must name | Types |
| --- | --- | --- |
| render | the document id, revision and request id of the render the page shows | previewEditSource, previewBlockMoveResult and previewBlocksResult (another requestId, or another document or revision: the page ignores it; an answer for the page's render: the page handles it), themeChanged, previewPropertiesTable, previewContentPatch, previewLinkTargets and the other render-addressed types |
| document | the document id only; the render may differ | previewPlantUmlIncludesChanged |
| own-id | no render identity; matched by an identifier of its own (editId, flushId), because the host may already follow the next document or render | the results of the host round trips, previewFlushEdit and previewEditorWatch |

The bounds of the payload of each type are in the SwRS of that type (see SwRS-MDOKFSTUDIO-TRUST-061, SwRS-MDOKFSTUDIO-TRUST-062, SwRS-MDOKFSTUDIO-TRUST-063 and SwRS-MDOKFSTUDIO-TRUST-064).

### Related requirements

- SwRS-MDOKFSTUDIO-TRUST-061: a content patch message is applied only within its bounds
- SwRS-MDOKFSTUDIO-TRUST-062: a properties table message needs string markup
- SwRS-MDOKFSTUDIO-TRUST-063: a link targets message needs an array of the current render
- SwRS-MDOKFSTUDIO-TRUST-064: flush and editor watch messages are addressed by their own id

### Verification notes

- Method: test/core/protocol/hostToPage.test.ts (every host message type has a rule, and a well-formed message for the page passes it; values that are not host messages are refused; each rule matches the identity it names, and only that: all scenarios and the addressing table).
- Method: test/page/hostMessages.test.ts (a window message event reaches the listener only from the parent frame, the page itself or an event without a sender; a host message addressed to the page reaches its handler, any other goes to unhandled; the page is read at each message, so a moved render identity applies at once: nominal and render scenarios).
- Method: test/page/runtimeBlockMoves.test.ts (`T36: a refused move says why next to the bar; a result of another context is ignored`: previewBlockMoveResult row of the render addressing).
- Criteria: A value the filter refuses is not given to the handler of any type. The page identity is read at every message. Answers of host round trips are matched by their own edit identifier and are not checked against the render.

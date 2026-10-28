---
type: SwRS
id: SwRS-MDOKFSTUDIO-TRUST-052
uuid: 65be582c-0c28-40fb-a931-aa195d8a8421
title: Every page message has a registered type and a valid envelope before any
  handler runs
description: When the host receives a value from the page, it SHALL hand it to a
  handler only if it is an object whose type is an own key of the table of
  registered message types and whose envelope fields (documentId, revision,
  requestId and the shared optional fields) are of their kind and within their
  bounds, ignoring any other value without a visible change.
project: markdown-okf-schema-studio
scope: trust-security
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-TRUST-009
- StRS-MDOKFSTUDIO-CORE-001
depends_on: []
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/envelope.ts
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
- test/core/protocol/pageToHost.test.ts
default_owner_email: gaetan@xeberon.net
---

## Every page message has a registered type and a valid envelope before any handler runs

### Normative behavior

When the host receives a value from the page, it SHALL hand it to a handler only if it is an object whose type is an own key of the table of registered message types and whose envelope fields (documentId, revision, requestId and the shared optional fields) are of their kind and within their bounds, ignoring any other value without a visible change.

### Scenario (nominal): Registered type with a valid envelope

- GIVEN a previewCopyText message with a valid envelope
- WHEN it is checked
- THEN it is accepted as a message and the host acts on it

### Scenario (refusal): Value that is not a registered message

- GIVEN null, a string, an array, a message of an unregistered type, and messages whose type is __proto__, constructor or toString
- WHEN each is checked
- THEN none is accepted, it is ignored and nothing changes on screen

### Scenario (boundary): Identity fields and size bound of the envelope

| Input | Outcome |
| --- | --- |
| previewCopyText with a documentId of 4096 characters | accepted (longest accepted identifier) |
| the same message with a documentId of 4097 characters | refused |
| previewScroll (a page-state message) with a documentId of 5000 characters | accepted (a page-state message may carry a string of any length) |
| a message with a missing documentId or a documentId that is not a string | refused |
| a valid message with revision 7 and requestId 3 | accepted (revision and requestId are safe integers) |
| the same message with revision 1.5 | refused |
| the same message with requestId the string 3 | refused |
| the same message with a revision beyond the largest safe integer | refused |

### Scenario (boundary): Shared optional fields of a page-state message

| Input | Outcome |
| --- | --- |
| previewScroll with line 2, anchorLine 3.5, scrollTop 120 and request a string | accepted |
| the same message with line 0 | refused (line, endLine, sourceLine and selectionLine are safe integers of at least 1) |
| the same message with anchorLine below 1 | refused (anchorLine is a finite number of at least 1) |
| the same message with scrollTop negative | refused (scrollTop is a finite number of at least 0) |
| the same message with editMode the string yes | refused (editMode and anchorToEditor are booleans) |
| a previewThemeMode that is not a known mode | refused (the theme mode is a known one) |
| a request that is not a string | refused (request is a string) |

### Scenario (boundary): Fields accepted only on the type that owns them

| Input | Outcome |
| --- | --- |
| previewFrontmatterSave with pinLine 3 and pinViewportTop 120 | accepted |
| previewEditSave with final true and both pin fields | accepted (a pin is owned by previewFrontmatterSave and by a final previewEditSave) |
| previewEditCancel with a pin | refused |
| previewFrontmatterSave with pinViewportTop 100001 | refused (pinViewportTop is a finite number of at most 100000 in absolute value) |
| a pin with only one of pinLine and pinViewportTop | refused (the pair is complete or absent; pinLine is a source line) |
| previewReady with blockEditOpen true | accepted (blockEditOpen is a boolean only on previewReady) |
| previewEditSave with final false | accepted (final is a boolean only on previewEditSave) |
| previewScroll with blockEditOpen true | refused |
| previewEditCancel with flush true | refused (flush is true only on previewEditSave or previewFrontmatterSave) |

### Scenario (boundary): Block edit and checkbox request names its editor and its lines

| Input | Outcome |
| --- | --- |
| previewEditOpen with editId e1, line 3 and endLine 5 | accepted |
| the same message with endLine 2 | refused (endLine is not before line) |
| the same message without editId | refused (editId is non-empty) |
| previewEditSave, previewEditCancel or previewCheckboxToggle with the same shape | the same outcome (see SwRS-MDOKFSTUDIO-GFM-027 for the extra checkbox fields) |

### Related requirements

- SwRS-MDOKFSTUDIO-GFM-027: the host validates checkbox toggle messages (line equal to endLine, a non-negative integer column and a boolean state)

### Verification notes

- Method: test/core/protocol/pageToHost.test.ts (nominal; refusal; identity fields and size bound: accepts a valid registered message, rejects non-objects, unregistered and prototype-key types, rejects missing or non-integer ids and oversize documentId, the shipped registry rejects an unregistered type)
- Method: test/core/protocol/pageStateMessages.test.ts (identity fields, shared optional fields, owned fields, block edit lines: non-objects and inherited keys are not page messages; a page-state message keeps accepting a document id longer than the registered bound; the page-state validators accept exactly what the frozen validator accepted, a differential corpus of more than 100 000 messages, every single-field variant and every pair, against the frozen earlier validator)
- Criteria: isPageToHostMessage returns false for every inherited key of the table. Revisions are opaque to the page: only equality with the revision the host holds is ever tested. The page-state family keeps the unbounded identifier for compatibility; every other type is bounded. Source lines are safe integers of at least 1; the pin pair is complete or absent; no other type carries flush, final or blockEditOpen. Only validated messages reach handlers.

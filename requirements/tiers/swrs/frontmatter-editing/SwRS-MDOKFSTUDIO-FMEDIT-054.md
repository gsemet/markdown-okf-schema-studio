---
type: SwRS
id: SwRS-MDOKFSTUDIO-FMEDIT-054
uuid: cb71b3a8-386b-4cc1-abfb-4d8ae1f59635
title: A frontmatter save message names its editor and field, or is ignored
description: When a previewFrontmatterSave message is malformed, because it does
  not name a non-empty editId and fieldName or carries a field outside its
  accepted shape, the extension SHALL ignore it without a reply.
project: markdown-okf-schema-studio
scope: frontmatter-editing
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-FMEDIT-008
- StRS-MDOKFSTUDIO-TRUST-009
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/protocol/pageToHost.ts
tested_in_files:
- test/core/protocol/pageStateMessages.test.ts
---

## A frontmatter save message names its editor and field, or is ignored

### Normative behavior

When a previewFrontmatterSave message is malformed, because it does not name a non-empty editId and fieldName or carries a field outside its accepted shape, the extension SHALL ignore it without a reply.

### Scenario (nominal): A frontmatter save that names its editor and field is accepted
| previewFrontmatterSave message | Outcome |
| --- | --- |
| editId e1 and fieldName status (with its fieldValue) | accepted |
| frontmatterAction add, afterField status and newFieldName owner | accepted |

The envelope, the size bound and the pin fields (pinLine, pinViewportTop) are checked once for all page messages (see SwRS-MDOKFSTUDIO-TRUST-052).

### Scenario (refusal): A save that does not name its editor, field or value is ignored
| previewFrontmatterSave message | Outcome |
| --- | --- |
| without fieldName, or with an empty fieldName | refused: nothing is replied and the document is unchanged |
| without editId, or with an empty editId | refused: nothing is replied and the document is unchanged |
| without fieldValue, unless frontmatterAction is remove | refused: nothing is replied and the document is unchanged |
| with fieldValueFormat other than yaml | refused: nothing is replied and the document is unchanged |

### Scenario (boundary): Accepted bounds of the optional fields
| Field | Accepted shape |
| --- | --- |
| afterField | a string of 1 to 1024 characters without a line break, only with frontmatterAction add; an add whose afterField contains a line break, or a remove with afterField, is dropped and the document is unchanged |
| frontmatterAction | add or remove |
| fieldValueFormat | yaml |
| fieldValueStyle | plain, and only with no frontmatterAction and no fieldValueFormat |
| flush | true |
| newFieldName | a string |

### Scenario (refusal): The frontmatter-save fields are accepted only on a frontmatter save
- GIVEN a previewScroll message with newFieldName owner (or any other message type that carries fieldValueFormat, fieldValueStyle, newFieldName, afterField or frontmatterAction)
- WHEN it is checked
- THEN it is refused

### Related requirements
- SwRS-MDOKFSTUDIO-FMEDIT-016: what the host answers to a well-formed save it refuses.

### Verification notes
- Method: test/core/protocol/pageStateMessages.test.ts (scenarios: valid save accepted, missing names, value and format refused, bounds of the optional fields, fields refused on another message type; the page-state validators accept exactly what the frozen validator accepted).
- Criteria: a valid save has a non-empty editId and fieldName, a fieldValue unless it removes, a fieldValueStyle plain only on a plain value save, an afterField of 1 to 1024 characters without line breaks only with an add, and a frontmatterAction add or remove.

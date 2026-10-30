---
type: StRS
id: StRS-MDOKFSTUDIO-TRUST-009
uuid: 986a38ee-650c-4d62-8057-2d815701d933
title: What the page and the host exchange is checked and never applied to
  another version
description: When the preview page asks the extension to do something or the
  extension sends an answer to the page, the Studio SHALL check the request
  before anything changes, leave the page unchanged for an answer meant for
  another document or an older page, and never apply a message about an older
  render to a newer one.
project: markdown-okf-schema-studio
scope: trust-security
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader or writer, I rely on what the preview page asks of the
  extension being checked before any file or setting changes, and I never see an
  answer, an edit, a move or a request meant for another document or for an
  older version of my page land in the current document.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-238
- SwRS-MDOKFSTUDIO-FMEDIT-054
- SwRS-MDOKFSTUDIO-GFM-027
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-055
- SwRS-MDOKFSTUDIO-TRUST-059
- SwRS-MDOKFSTUDIO-TRUST-061
- SwRS-MDOKFSTUDIO-TRUST-062
- SwRS-MDOKFSTUDIO-TRUST-063
- SwRS-MDOKFSTUDIO-TRUST-064
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-086
- SwRS-MDOKFSTUDIO-TRUST-090
default_owner_email: gaetan@xeberon.net
---

## What the page and the host exchange is checked and never applied to another version

### Normative behavior

When the preview page asks the extension to do something or the extension sends an answer to the page, the Studio SHALL check the request before anything changes, leave the page unchanged for an answer meant for another document or an older page, and never apply a message about an older render to a newer one.

### Preserved stakeholder intent

As a reader or writer, I rely on what the preview page asks of the extension being checked before any file or setting changes, and I never see an answer, an edit, a move or a request meant for another document or for an older version of my page land in the current document.

### Rationale and constraints

- What an invalid request causes is specified by the rendering-core record for ignored messages.
- The bounds of each request kind are specified with the feature that sends it, except the fields every message and every state message share.
- An answer is addressed by the document, the revision and the render request, or by an identifier of its own.
- A save or cancel from an older page is answered with an error instead of being dropped (block-editing and frontmatter-editing scopes).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-238](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-238.md): previewEditSave needs both texts and valid optional fields
  - [SwRS-MDOKFSTUDIO-FMEDIT-054](../../swrs/frontmatter-editing/SwRS-MDOKFSTUDIO-FMEDIT-054.md): A frontmatter save message names its editor and field, or is ignored
  - [SwRS-MDOKFSTUDIO-GFM-027](../../swrs/gfm/SwRS-MDOKFSTUDIO-GFM-027.md): The host validates checkbox toggle messages
  - [SwRS-MDOKFSTUDIO-TRUST-052](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-052.md): Every page message has a registered type and a valid envelope before any handler runs
  - [SwRS-MDOKFSTUDIO-TRUST-055](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-055.md): The validator of the message type must accept the payload
  - [SwRS-MDOKFSTUDIO-TRUST-059](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-059.md): The page accepts only registered host messages addressed to its render
  - [SwRS-MDOKFSTUDIO-TRUST-061](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-061.md): A content patch message is applied only within its bounds
  - [SwRS-MDOKFSTUDIO-TRUST-062](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-062.md): A properties table message needs string markup
  - [SwRS-MDOKFSTUDIO-TRUST-063](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-063.md): A link targets message needs an array of the current render
  - [SwRS-MDOKFSTUDIO-TRUST-064](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-064.md): Flush and editor watch messages are addressed by their own id
  - [SwRS-MDOKFSTUDIO-TRUST-065](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-065.md): A page message is matched to the shown render or document by the gate of its type
  - [SwRS-MDOKFSTUDIO-TRUST-086](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-086.md): The warning banner close message has a bounded key
  - [SwRS-MDOKFSTUDIO-TRUST-090](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-090.md): Every page request is answered once by its id and result type, or ends with a readable error
<!-- okf:links:end -->

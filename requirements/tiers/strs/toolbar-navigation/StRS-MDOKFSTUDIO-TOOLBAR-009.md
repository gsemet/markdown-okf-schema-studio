---
type: StRS
id: StRS-MDOKFSTUDIO-TOOLBAR-009
uuid: ef48de44-6610-4287-a7f7-92e86642971e
title: The reader goes Back and Next through followed links without losing typed
  text
description: When a reader follows links and anchors in the preview, the Studio
  SHALL let the reader return with Back and Next to the document and line they
  left, saving what was typed in an open block or properties editor before it
  navigates.
project: markdown-okf-schema-studio
scope: toolbar-navigation
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a reader, I follow a link to another document or a heading, and
  come back to the exact place with Back, then move forward again with Next; as
  a writer, I follow a link or press Back right after typing, and the text I
  typed is saved, not lost.
derived_by:
- SwRS-MDOKFSTUDIO-BLOCK-205
- SwRS-MDOKFSTUDIO-TOOLBAR-054
- SwRS-MDOKFSTUDIO-TOOLBAR-056
- SwRS-MDOKFSTUDIO-TOOLBAR-058
- SwRS-MDOKFSTUDIO-TOOLBAR-059
- SwRS-MDOKFSTUDIO-TOOLBAR-065
- SwRS-MDOKFSTUDIO-TOOLBAR-070
- SwRS-MDOKFSTUDIO-TOOLBAR-071
- SwRS-MDOKFSTUDIO-TOOLBAR-072
- SwRS-MDOKFSTUDIO-TRUST-006
default_owner_email: gaetan@xeberon.net
---

## The reader goes Back and Next through followed links without losing typed text

### Normative behavior

When a reader follows links and anchors in the preview, the Studio SHALL let the reader return with Back and Next to the document and line they left, saving what was typed in an open block or properties editor before it navigates.

### Preserved stakeholder intent

As a reader, I follow a link to another document or a heading, and come back to the exact place with Back, then move forward again with Next; as a writer, I follow a link or press Back right after typing, and the text I typed is saved, not lost.

### Rationale and constraints

- Each preview panel has its own history, limited to the last 50 places.
- External links, blocked links and links to files that are not Markdown documents are not recorded.
- Back and Next work in read-only previews too.
- A link to a place of the same page keeps the editor open.
- An editor with nothing typed is closed without a save.
- The page half (the final save before the move) is specified in the block-editing and table-editing scopes (SwRS-MDOKFSTUDIO-BLOCK-205).

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-BLOCK-205](../../swrs/block-editing/SwRS-MDOKFSTUDIO-BLOCK-205.md): Open editors are saved before the page hides or leaves the document
  - [SwRS-MDOKFSTUDIO-TOOLBAR-054](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-054.md): Back and Next follow the host's history state
  - [SwRS-MDOKFSTUDIO-TOOLBAR-056](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-056.md): A history state of another render is ignored
  - [SwRS-MDOKFSTUDIO-TOOLBAR-058](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-058.md): The host accepts only back or forward
  - [SwRS-MDOKFSTUDIO-TOOLBAR-059](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-059.md): Followed links and anchor jumps are recorded per panel and replayed at their line
  - [SwRS-MDOKFSTUDIO-TOOLBAR-065](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-065.md): The history keeps the last 50 places without duplicates
  - [SwRS-MDOKFSTUDIO-TOOLBAR-070](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-070.md): Back and Next save an open editor first
  - [SwRS-MDOKFSTUDIO-TOOLBAR-071](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-071.md): A link to another file saves an open editor first
  - [SwRS-MDOKFSTUDIO-TOOLBAR-072](../../swrs/toolbar-navigation/SwRS-MDOKFSTUDIO-TOOLBAR-072.md): An anchor of the same page keeps the editor open
  - [SwRS-MDOKFSTUDIO-TRUST-006](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-006.md): A read-only preview keeps every viewing action
<!-- okf:links:end -->

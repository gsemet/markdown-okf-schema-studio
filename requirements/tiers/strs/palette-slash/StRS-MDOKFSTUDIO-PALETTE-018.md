---
type: StRS
id: StRS-MDOKFSTUDIO-PALETTE-018
uuid: b64ab6ac-d54a-468a-a15a-6d59d4c8e1bf
title: A writer pastes screenshots and rich text safely as Markdown
description: When a writer pastes an image or rich text into a block text box,
  the Studio SHALL save an image as a file next to the document with a reference
  as a paragraph of its own, or replace the selection with the rich text
  converted to Markdown without scripts, styles, hidden content or unsafe
  addresses, in one undoable step saved with the other text of that editor.
project: markdown-okf-schema-studio
scope: palette-slash
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I paste a screenshot and it becomes a picture of the
  document without any dialog, and I copy from a web page, a word processor or
  an editor and the headings, lists, links and tables arrive as Markdown in my
  block, with no script or tracking content that a later reader could be exposed
  to.
derived_by:
- SwRS-MDOKFSTUDIO-PALETTE-196
- SwRS-MDOKFSTUDIO-PALETTE-203
- SwRS-MDOKFSTUDIO-PALETTE-213
- SwRS-MDOKFSTUDIO-PALETTE-217
- SwRS-MDOKFSTUDIO-PALETTE-229
- SwRS-MDOKFSTUDIO-PALETTE-264
- SwRS-MDOKFSTUDIO-TRUST-005
default_owner_email: gaetan@xeberon.net
---

## A writer pastes screenshots and rich text safely as Markdown

### Normative behavior

When a writer pastes an image or rich text into a block text box, the Studio SHALL save an image as a file next to the document with a reference as a paragraph of its own, or replace the selection with the rich text converted to Markdown without scripts, styles, hidden content or unsafe addresses, in one undoable step saved with the other text of that editor.

### Preserved stakeholder intent

Writers expect pasted content to become Markdown and to join the text they type.

As a writer, I paste a screenshot and it becomes a picture of the document without any dialog, and I copy from a web page, a word processor or an editor and the headings, lists, links and tables arrive as Markdown in my block, with no script or tracking content that a later reader could be exposed to.

### Rationale and constraints

- The conversion rules and the image file handling belong to the palette and paste use cases; this use case covers the result landing in the right editor.
- Text on the clipboard always wins: the paste then stays an ordinary text paste.
- The Studio chooses the file name; it never overwrites a file and refuses anything that is not a png, jpeg, gif or webp image.
- Pasting as plain text stays available with the paste-as-plain-text key combination.
- When the conversion fails or leaves nothing, the plain text of the clipboard is pasted.
- Only a few link and image address schemes are kept; every other element contributes its text only.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-PALETTE-196](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-196.md): The host saves a pasted image next to the document under a name it chooses
  - [SwRS-MDOKFSTUDIO-PALETTE-203](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-203.md): A pasted image is sent to the host and its name inserted on its own paragraph
  - [SwRS-MDOKFSTUDIO-PALETTE-213](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-213.md): Pasted rich text is converted by the host and replaces the selection in one step
  - [SwRS-MDOKFSTUDIO-PALETTE-217](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-217.md): Pasted HTML becomes the matching Markdown
  - [SwRS-MDOKFSTUDIO-PALETTE-229](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-229.md): Pasted HTML never brings active content
  - [SwRS-MDOKFSTUDIO-PALETTE-264](../../swrs/palette-slash/SwRS-MDOKFSTUDIO-PALETTE-264.md): A pasted URL becomes a link, an autolink or an image in the block text box
  - [SwRS-MDOKFSTUDIO-TRUST-005](../../swrs/trust-security/SwRS-MDOKFSTUDIO-TRUST-005.md): The host refuses every write request of a read-only preview with a reason
<!-- okf:links:end -->

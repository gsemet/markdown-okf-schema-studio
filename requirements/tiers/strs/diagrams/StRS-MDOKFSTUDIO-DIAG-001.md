---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-001
uuid: 8ae298a6-34f0-41a8-ba23-ac30c4ca6f9e
title: Read Mermaid diagrams in the preview
description: When a writer previews a document with a Mermaid fence or
  directive, the Studio SHALL draw it as a picture sized to the content width
  and keep its source available.
project: markdown-okf-schema-studio
scope: diagrams
lifecycle: draft
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I put a Mermaid diagram in my document and see the drawn
  diagram in the preview while the source stays one click away.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-001
- SwRS-MDOKFSTUDIO-DIAG-002
- SwRS-MDOKFSTUDIO-DIAG-003
- SwRS-MDOKFSTUDIO-DIAG-004
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-DIAG-020
- SwRS-MDOKFSTUDIO-DIAG-021
- SwRS-MDOKFSTUDIO-DIAG-022
---

## Read Mermaid diagrams in the preview

### Normative behavior

When a writer previews a document with a Mermaid fence or directive, the Studio SHALL draw it as a picture sized to the content width and keep its source available.

### Preserved stakeholder intent

Writers expect a Mermaid diagram written in a fence or a directive to appear as a picture in the preview, with the text still reachable.

As a writer, I put a Mermaid diagram in my document and see the drawn diagram in the preview while the source stays one click away.

### Rationale and constraints

- A `mermaid` fence and a `{mermaid}` directive both produce the diagram; the source is kept in a collapsed "Diagram source" disclosure and the picture is labelled "Mermaid diagram".
- The picture is drawn at its natural size, never enlarged, and scaled down to the content width with no minimum scale and no zoom. Known issue: a wide diagram can end up with small labels (UX-46, not fixed). In the auto width mode a wide diagram may use the wider column; that rule is owned by SwRS-MDOKFSTUDIO-LAYOUT-023 (Known issue: a PlantUML figure qualifies through the generic figure selector of the width mode, not through an entry of its own).
- While a diagram is edited in the preview it is hidden until the editor closes. Known issue: there is no live preview of the diagram being edited (UX-36, not approved).
- The renderer is loaded only when the document holds a Mermaid diagram, from the extension bundle and under the page's Content Security Policy; appearing or disappearing Mermaid reloads the whole page instead of patching it in place.
- The picture is inert: scripts and links inside the diagram do nothing. Page tools leave diagrams alone: no code copy button is added and no review quote is wrapped inside a diagram.
- Known issue: a diagram with empty text is skipped and left blank, with no message.

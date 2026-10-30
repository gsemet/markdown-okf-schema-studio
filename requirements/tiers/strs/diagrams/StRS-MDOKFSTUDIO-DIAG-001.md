---
type: StRS
id: StRS-MDOKFSTUDIO-DIAG-001
uuid: 8ae298a6-34f0-41a8-ba23-ac30c4ca6f9e
title: A writer reads and inserts Mermaid diagrams that follow the theme
description: When a writer previews a document with a Mermaid fence or
  directive, or picks Mermaid in the edition palette or the slash menu, the
  Studio SHALL draw the diagram as a picture sized to the content width in the
  colours of the preview theme, keep its source available, show a message with
  the parser reason on demand when the syntax is invalid, and insert a starter
  flowchart fence that renders at once.
project: markdown-okf-schema-studio
scope: diagrams
req_lifecycle: approved
status: stable
approved_by: gaetan@xeberon.net
approved_at: '2026-10-28T00:00:00Z'
verified:
  by: human:gaetan@xeberon.net
  at: '2026-10-28T00:00:00Z'
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I put a Mermaid diagram in my document, or insert one in
  a single step, and see the drawn diagram in the preview in the colours of my
  theme, with the source one click away.
derived_by:
- SwRS-MDOKFSTUDIO-DIAG-001
- SwRS-MDOKFSTUDIO-DIAG-002
- SwRS-MDOKFSTUDIO-DIAG-003
- SwRS-MDOKFSTUDIO-DIAG-004
- SwRS-MDOKFSTUDIO-DIAG-005
- SwRS-MDOKFSTUDIO-DIAG-006
- SwRS-MDOKFSTUDIO-DIAG-007
- SwRS-MDOKFSTUDIO-DIAG-008
- SwRS-MDOKFSTUDIO-DIAG-009
- SwRS-MDOKFSTUDIO-DIAG-010
- SwRS-MDOKFSTUDIO-DIAG-011
- SwRS-MDOKFSTUDIO-DIAG-012
- SwRS-MDOKFSTUDIO-DIAG-013
- SwRS-MDOKFSTUDIO-DIAG-014
- SwRS-MDOKFSTUDIO-DIAG-015
- SwRS-MDOKFSTUDIO-DIAG-016
- SwRS-MDOKFSTUDIO-DIAG-017
- SwRS-MDOKFSTUDIO-DIAG-018
- SwRS-MDOKFSTUDIO-DIAG-019
- SwRS-MDOKFSTUDIO-DIAG-020
- SwRS-MDOKFSTUDIO-DIAG-021
- SwRS-MDOKFSTUDIO-DIAG-022
- SwRS-MDOKFSTUDIO-DIAG-116
- SwRS-MDOKFSTUDIO-DIAG-121
- SwRS-MDOKFSTUDIO-DIAG-122
- SwRS-MDOKFSTUDIO-DIAG-123
- SwRS-MDOKFSTUDIO-DIAG-124
- SwRS-MDOKFSTUDIO-REVIEW-017
- SwRS-MDOKFSTUDIO-REVIEW-038
default_owner_email: gaetan@xeberon.net
supersedes:
- StRS-MDOKFSTUDIO-DIAG-002
- StRS-MDOKFSTUDIO-DIAG-003
- StRS-MDOKFSTUDIO-DIAG-004
- StRS-MDOKFSTUDIO-DIAG-005
---

## A writer reads and inserts Mermaid diagrams that follow the theme

### Normative behavior

When a writer previews a document with a Mermaid fence or directive, or picks Mermaid in the edition palette or the slash menu, the Studio SHALL draw the diagram as a picture sized to the content width in the colours of the preview theme, keep its source available, show a message with the parser reason on demand when the syntax is invalid, and insert a starter flowchart fence that renders at once.

### Preserved stakeholder intent

Writers expect a Mermaid diagram written in a fence or a directive to appear as a picture in the preview with the text still reachable. Readers expect diagrams to look like part of the page in every preview theme, with every label legible. Writers expect typing, saving or an outside change not to make every diagram flash or vanish. They expect a clear, non-destructive signal when a diagram does not parse, and a valid starting diagram from the edit tools rather than a blank fence.

### Rationale and constraints

- Reading: a `mermaid` fence and a `{mermaid}` directive both produce the diagram; the source is kept in a collapsed "Diagram source" disclosure and the picture is labelled "Mermaid diagram".
- The picture is drawn at its natural size, never enlarged, and scaled down to the content width with no minimum scale and no zoom. Known issue: a wide diagram can end up with small labels. In the auto width mode a wide diagram may use the wider column; that rule is owned by the width mode. Known issue: a PlantUML figure qualifies through the generic figure selector of the width mode, not through an entry of its own.
- While a diagram is edited in the preview it is hidden until the editor closes. Known issue: there is no live preview of the diagram being edited.
- The renderer is loaded only when the document holds a Mermaid diagram, from the extension bundle and under the page's Content Security Policy; appearing or disappearing Mermaid reloads the whole page instead of patching it in place.
- The picture is inert: scripts and links inside the diagram do nothing. Page tools leave diagrams alone: no code copy button is added and no review quote is wrapped inside a diagram.
- Known issue: a diagram with empty text is skipped and left blank, with no message.
- Theme: node, text, border, line and background colours come from the preview theme variables; the diagrams are drawn again when the theme mode changes (dark, white, cream, light), labels kept.
- When a theme variable is missing or is a CSS system colour keyword such as `Canvas`, built-in fallback colours are used and the diagram stays readable. Edge labels keep a contrast of at least 4.5:1 in the dark, light and fallback themes.
- A theme change that leaves the colours as they were draws nothing again. Evidence for the redraw is limited to dark, white and cream in the visual check; light and custom VS Code themes rely on the same observer.
- Typing: unchanged diagrams stay drawn after a content patch and new or changed ones are drawn after it. A diagram whose node was replaced but whose source and theme colours are the same reuses the earlier drawing; the 64 most recent drawings are kept.
- Diagrams are drawn one pass at a time in document order, and a late result for a theme that was replaced meanwhile is dropped.
- Failure: the message reads "Unable to render Mermaid diagram. Its source remains available below." and sits above the diagram; a collapsed "Show the parser error" section holds the parser's reason as plain text, never HTML; the message uses the theme error colour.
- However many times the theme changes, the invalid diagram keeps exactly one message and one details section; the earlier one is replaced.
- Known issue: a failed Mermaid diagram posts no diagnostic to the status line or the Problems list, because the drawing happens in the page.
- Insert: the "Mermaid" button (GitHub group of the edition palette, tooltip "Mermaid diagram") and the "/Mermaid" slash entry (aliases diagram, chart, graph, flowchart) insert a fenced `mermaid` flowchart set apart after the selection, with its first label "Start" selected.
- Only the GFM palette mode offers it: not Strict, not MyST, and no `{mermaid}` directive button exists.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-DIAG-001](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-001.md): Mermaid fences become inert diagram pictures
  - [SwRS-MDOKFSTUDIO-DIAG-002](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-002.md): The Mermaid renderer loads only when a Mermaid figure exists
  - [SwRS-MDOKFSTUDIO-DIAG-003](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-003.md): Mermaid diagrams are drawn as inert pictures
  - [SwRS-MDOKFSTUDIO-DIAG-004](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-004.md): Mermaid pictures keep their natural size within the content width
  - [SwRS-MDOKFSTUDIO-DIAG-005](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-005.md): Mermaid colours follow the preview theme
  - [SwRS-MDOKFSTUDIO-DIAG-006](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-006.md): Mermaid diagrams are drawn again when the theme changes
  - [SwRS-MDOKFSTUDIO-DIAG-007](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-007.md): Mermaid falls back to built-in colours
  - [SwRS-MDOKFSTUDIO-DIAG-008](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-008.md): Mermaid edge labels stay readable
  - [SwRS-MDOKFSTUDIO-DIAG-009](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-009.md): Mermaid diagrams are drawn once and late results are dropped
  - [SwRS-MDOKFSTUDIO-DIAG-010](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-010.md): The Mermaid drawing cache keeps 64 drawings
  - [SwRS-MDOKFSTUDIO-DIAG-011](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-011.md): A content patch draws only Mermaid diagrams not yet drawn
  - [SwRS-MDOKFSTUDIO-DIAG-012](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-012.md): Mermaid draw passes run one at a time
  - [SwRS-MDOKFSTUDIO-DIAG-013](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-013.md): Mermaid element ids stay unique for the page life
  - [SwRS-MDOKFSTUDIO-DIAG-014](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-014.md): A late Mermaid result for a replaced theme is not shown
  - [SwRS-MDOKFSTUDIO-DIAG-015](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-015.md): Invalid Mermaid shows one message with the parser reason
  - [SwRS-MDOKFSTUDIO-DIAG-016](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-016.md): An invalid Mermaid diagram keeps exactly one error
  - [SwRS-MDOKFSTUDIO-DIAG-017](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-017.md): The Mermaid action inserts a starter flowchart in GFM mode
  - [SwRS-MDOKFSTUDIO-DIAG-018](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-018.md): Mermaid is offered in the GFM palette mode only
  - [SwRS-MDOKFSTUDIO-DIAG-019](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-019.md): Comment quotes are never wrapped inside diagrams
  - [SwRS-MDOKFSTUDIO-DIAG-020](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-020.md): Selecting text inside a diagram offers no comment
  - [SwRS-MDOKFSTUDIO-DIAG-021](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-021.md): Diagrams can use the wider column in Auto width
  - [SwRS-MDOKFSTUDIO-DIAG-022](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-022.md): A diagram under edit is hidden
  - [SwRS-MDOKFSTUDIO-DIAG-116](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-116.md): A late Mermaid error for a replaced key is not shown
  - [SwRS-MDOKFSTUDIO-DIAG-121](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-121.md): Vega-Lite and Vega fences become chart figures
  - [SwRS-MDOKFSTUDIO-DIAG-122](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-122.md): Chart data files are read through the resource policy
  - [SwRS-MDOKFSTUDIO-DIAG-123](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-123.md): Charts are drawn as themed SVG pictures with errors in place
  - [SwRS-MDOKFSTUDIO-DIAG-124](../../swrs/diagrams/SwRS-MDOKFSTUDIO-DIAG-124.md): The chart runtime loads only with a chart and needs no eval
  - [SwRS-MDOKFSTUDIO-REVIEW-017](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-017.md): The quote of a thread is highlighted once in its block
  - [SwRS-MDOKFSTUDIO-REVIEW-038](../../swrs/review-annotations/SwRS-MDOKFSTUDIO-REVIEW-038.md): Selected body text offers a Comment button and a keyboard shortcut
- Supersedes:
  - [StRS-MDOKFSTUDIO-DIAG-002](StRS-MDOKFSTUDIO-DIAG-002.md): Mermaid diagrams follow the preview theme
  - [StRS-MDOKFSTUDIO-DIAG-003](StRS-MDOKFSTUDIO-DIAG-003.md): Mermaid diagrams stay in place while typing
  - [StRS-MDOKFSTUDIO-DIAG-004](StRS-MDOKFSTUDIO-DIAG-004.md): Understand why a Mermaid diagram failed
  - [StRS-MDOKFSTUDIO-DIAG-005](StRS-MDOKFSTUDIO-DIAG-005.md): Insert a Mermaid diagram from the edit tools
<!-- okf:links:end -->

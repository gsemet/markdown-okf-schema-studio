---
type: StRS
id: StRS-MDOKFSTUDIO-LIFE-005
uuid: 2e0d4e60-56ea-4e2e-a300-5295d68861ca
title: The preview updates in place as the text and its dependencies change
description: When a writer changes a Markdown file, saved or not, or a file or a
  setting that an open preview depends on changes, the Studio SHALL update that
  preview in place with the typed text, changing only what changed, without
  saving the file or reopening the preview.
project: markdown-okf-schema-studio
scope: lifecycle-sync
req_lifecycle: proposed
status: stable
origin: native
tier: StRS
derives_from: []
user_need: As a writer, I see my unsaved changes in the preview as I type, and a
  quick burst of typing does not make the preview flicker; I change an included
  file, rename a file or change a setting and the open preview follows, without
  reloading the window or making the page jump.
derived_by:
- SwRS-MDOKFSTUDIO-LIFE-004
- SwRS-MDOKFSTUDIO-LIFE-032
- SwRS-MDOKFSTUDIO-LIFE-039
- SwRS-MDOKFSTUDIO-LIFE-044
- SwRS-MDOKFSTUDIO-LIFE-048
- SwRS-MDOKFSTUDIO-LIFE-049
- SwRS-MDOKFSTUDIO-LIFE-059
- SwRS-MDOKFSTUDIO-LIFE-069
- SwRS-MDOKFSTUDIO-LIFE-071
- SwRS-MDOKFSTUDIO-LIFE-074
- SwRS-MDOKFSTUDIO-LIFE-081
- SwRS-MDOKFSTUDIO-LIFE-082
- SwRS-MDOKFSTUDIO-LIFE-089
- SwRS-MDOKFSTUDIO-LIFE-090
- SwRS-MDOKFSTUDIO-LIFE-091
- SwRS-MDOKFSTUDIO-LIFE-093
- SwRS-MDOKFSTUDIO-LIFE-094
- SwRS-MDOKFSTUDIO-LIFE-100
default_owner_email: gaetan@xeberon.net
---

## The preview updates in place as the text and its dependencies change

### Normative behavior

When a writer changes a Markdown file, saved or not, or a file or a setting that an open preview depends on changes, the Studio SHALL update that preview in place with the typed text, changing only what changed, without saving the file or reopening the preview.

### Preserved stakeholder intent

As a writer, I see my unsaved changes in the preview as I type, and a quick burst of typing does not make the preview flicker; I change an included file, rename a file or change a setting and the open preview follows, without reloading the window or making the page jump.

### Rationale and constraints

- The preview never writes to the file it shows.
- A burst of typing reaches the preview once, as the last text.
- Saving a file that the preview already shows changes nothing on the screen.
- Folders that churn during builds do not trigger a render.
- The colour theme follows the theme-zoom requirements and the incoming-change marks follow the review requirements.
- Only the changed blocks are replaced and the unchanged blocks and the open sections are kept; a setting can turn the in-place update off and reload the whole page on every change.
- When another tool, a file change on disk or an undo changes the previewed document, the changed blocks glow once, so the reader notices what an agent, another extension or an undo changed.
- Typing in the text editor and the preview's own edits never glow; a change spread over too many places glows nowhere, and nothing glows when the system asks for reduced motion.
- A preview that cannot be updated in place loads the page again and keeps the reading place.
- A page that does not answer an update in time gets the whole page.
- A page that VS Code created again is given the current document.

<!-- okf:links:start -->
### Links

<!-- Generated from the frontmatter relations; edit them instead. -->

- Derived by:
  - [SwRS-MDOKFSTUDIO-LIFE-004](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-004.md): Previews render in a worker thread that an abort stops
  - [SwRS-MDOKFSTUDIO-LIFE-032](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-032.md): Refresh Preview renders the shown document again
  - [SwRS-MDOKFSTUDIO-LIFE-039](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-039.md): Typing renders the new text after a short pause, without writing files
  - [SwRS-MDOKFSTUDIO-LIFE-044](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-044.md): Changes to files and settings the render depends on render again
  - [SwRS-MDOKFSTUDIO-LIFE-048](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-048.md): A changed setting that the page reads only at startup loads a new page document
  - [SwRS-MDOKFSTUDIO-LIFE-049](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-049.md): The status names the render state and shows pending, failed and recovered notices
  - [SwRS-MDOKFSTUDIO-LIFE-059](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-059.md): The status region is a polite live region of plain text
  - [SwRS-MDOKFSTUDIO-LIFE-069](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-069.md): A render of the loaded document updates the page in place
  - [SwRS-MDOKFSTUDIO-LIFE-071](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-071.md): A render that cannot patch loads a new page document
  - [SwRS-MDOKFSTUDIO-LIFE-074](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-074.md): The page refuses a patch whose status lines break the same bounds
  - [SwRS-MDOKFSTUDIO-LIFE-081](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-081.md): After a patch the page answers only to the new identifiers
  - [SwRS-MDOKFSTUDIO-LIFE-082](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-082.md): A patch with stale or malformed fields is ignored
  - [SwRS-MDOKFSTUDIO-LIFE-089](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-089.md): Equal blocks pair in document order and each kept node is used once
  - [SwRS-MDOKFSTUDIO-LIFE-090](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-090.md): Nodes the page added itself are never kept
  - [SwRS-MDOKFSTUDIO-LIFE-091](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-091.md): A block with a link has the same key on the first page and after a patch
  - [SwRS-MDOKFSTUDIO-LIFE-093](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-093.md): A document loaded from a patched record gets a fresh nonce
  - [SwRS-MDOKFSTUDIO-LIFE-094](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-094.md): Blocks changed by another tool glow briefly
  - [SwRS-MDOKFSTUDIO-LIFE-100](../../swrs/lifecycle-sync/SwRS-MDOKFSTUDIO-LIFE-100.md): Scrolling the text editor scrolls the preview to the same line
<!-- okf:links:end -->

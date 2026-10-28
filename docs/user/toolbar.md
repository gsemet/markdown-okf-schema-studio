# Floating Toolbar

The floating toolbar at the top right of the preview has three rows:

1. **Actions:** Refresh, Anchor (link the preview scroll to the text editor), Edit (writable
   previews only), and a chevron button that hides or shows rows 2 and 3.
2. **Navigation:** Back, Next, Zoom out and Zoom in.
3. **View options:** Theme, Width, Table of contents, Fold (folds every section, or unfolds them
   all when any is folded; see [Folding sections](folding.md)), the incoming-changes (Diff) toggle,
   the Side-by-side toggle and the Comments toggle (hides or shows the gray comment chips, in preview
   and in edit mode).

The Table of contents toolbar button shows the outline of the whole document next to the preview. A
`[TOC]` line (or `[[_TOC_]]`, or a `{contents}` directive) in the text (inserted by the Table of contents button of the edition palette or by
`/toc`) renders the same headings as a list inside the document itself.

The **Side-by-side** toggle turns each block changed since the last Git commit into a small diff
card: the block as it was at the last commit on the left, as it is now on the right, both rendered,
with the removed words struck through on the left and the added words underlined on the right. An
added block has an empty left side; a deleted block comes back with an empty right side. Unchanged
blocks stay as they are, so the page shows several small diffs. It is off by default (the green bar
stays), it works in reading mode only (the button is disabled in edit mode, where the green bars
remain), and it never changes the file. It needs the same conditions as the green bars: a file known
to Git in a trusted workspace, with `preview.showIncomingChanges` on, which also hides the button
when off.

The chevron button collapses the toolbar to its first row when you want the most room for the
text, and expands it again. The choice is remembered per workspace; a new workspace starts with
the toolbar collapsed, so click the chevron to reach rows 2 and 3. Hidden rows are skipped by the
Tab key.

| Expanded | Collapsed |
| --- | --- |
| [![The floating toolbar expanded: three rows of buttons](../../images/readme/toolbar-expanded.png)](../../images/readme/toolbar-expanded.png) | [![The floating toolbar collapsed to its first row](../../images/readme/toolbar-collapsed.png)](../../images/readme/toolbar-collapsed.png) |

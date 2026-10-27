# Floating Toolbar

The floating toolbar at the top right of the preview has three rows:

1. **Actions:** Refresh, Anchor (link the preview scroll to the text editor), Edit (writable
   previews only), and a chevron button that hides or shows rows 2 and 3.
2. **Navigation:** Back, Next, Zoom out and Zoom in.
3. **View options:** Theme, Width, Table of contents, Fold (folds every section, or unfolds them
   all when any is folded; see [Folding sections](folding.md)), the incoming-changes (Diff) toggle
   and the Comments toggle (hides or shows the gray comment chips, in preview and in edit mode).

The Table of contents toolbar button shows the outline of the whole document next to the preview. A
`[TOC]` line (or `[[_TOC_]]`, or a `{contents}` directive) in the text (inserted by the Table of contents button of the edition palette or by
`/toc`) renders the same headings as a list inside the document itself.

The chevron button collapses the toolbar to its first row when you want the most room for the
text, and expands it again. The choice is remembered per workspace; a new workspace starts with
the toolbar collapsed, so click the chevron to reach rows 2 and 3. Hidden rows are skipped by the
Tab key.

| Expanded | Collapsed |
| --- | --- |
| [![The floating toolbar expanded: three rows of buttons](../../images/readme/toolbar-expanded.png)](../../images/readme/toolbar-expanded.png) | [![The floating toolbar collapsed to its first row](../../images/readme/toolbar-collapsed.png)](../../images/readme/toolbar-collapsed.png) |

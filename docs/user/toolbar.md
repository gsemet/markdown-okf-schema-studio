# Floating Toolbar

The floating toolbar at the top right of the preview has five rows of at most three buttons, so it
stays narrow and covers little of the page:

1. **Actions:** Refresh, Edit (writable previews only), and a chevron button that hides or shows
   rows 2 to 5.
2. **Navigation:** Anchor (link the preview scroll to the text editor), Back and Next.
3. **Appearance:** Theme, Zoom out and Zoom in.
4. **Layout:** Width and Table of contents.
5. **Content:** Fold (folds every section, or unfolds them all when any is folded; see
   [Folding sections](folding.md)), the incoming-changes (Diff) toggle and the Comments toggle
   (hides or shows the gray comment chips and every review mark: the thread chips, the
   highlighted quotes, the badges and the Orphaned comments box; in preview and in edit mode).

The Table of contents toolbar button shows the outline of the whole document next to the preview. A
`[TOC]` line (or `[[_TOC_]]`, or a `{contents}` directive) in the text (inserted by the Table of contents button of the edition palette or by
`/toc`) renders the same headings as a list inside the document itself.

The chevron button collapses the toolbar to its first row when you want the most room for the
text, and expands it again. The choice is remembered per workspace; a new workspace starts with
the toolbar collapsed, so click the chevron to reach rows 2 to 5. Hidden rows are skipped by the
Tab key.

Rows 2 to 5 unroll and roll up as one block when you press the chevron. When a panel opens its
preview with the toolbar collapsed, it unrolls for a moment and rolls up again, to show that it can
expand; a mouse or key press cancels it, it never changes your saved choice, and it does not replay
on a refresh, a reload or when the panel follows another document. Tooltips of the toolbar, the edit
bar and the table menu slide in from the left. With the system setting "reduce motion" none of these
animate.

| Expanded | Collapsed |
| --- | --- |
| [![The floating toolbar expanded: five rows of buttons](../../images/readme/toolbar-expanded.png)](../../images/readme/toolbar-expanded.png) | [![The floating toolbar collapsed to its first row](../../images/readme/toolbar-collapsed.png)](../../images/readme/toolbar-collapsed.png) |

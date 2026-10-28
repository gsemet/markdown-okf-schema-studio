# Folding Sections

A long document is easier to read when you can hide the sections you are not reading. Every
heading that has content below it can fold that content in the preview.

## Fold and unfold one section

- **Chevron:** point at a heading, or move the keyboard focus to it, and a chevron appears in the
  left margin. Click it to fold the section: every block after the heading up to the next heading of
  the same or a higher level is hidden. A folded heading keeps its chevron visible, pointing right;
  click it again to unfold.
- **Keyboard:** `Cmd+Alt+[` (macOS) or `Ctrl+Alt+[` toggles the current section: the heading that
  has the focus, or else the last heading at or above the reading line. A heading with nothing
  below it folds the section of the heading above it. The keys do nothing while you type in a text
  box.
- **Several levels:** a folded section keeps the fold state of the sections inside it, so unfolding
  an `h2` shows its `h3` sections still folded if you folded them before.

## Fold all and unfold all

- **Toolbar:** the Fold button in the fifth row folds every section at once. While any section is
  folded it shows as pressed and the next click unfolds them all.
- **Command palette:** `Markdown OKF-Schema Studio: Fold All Sections in Preview` and
  `Markdown OKF-Schema Studio: Unfold All Sections in Preview` run on the preview that has the
  focus.

## What stays the same

- **The file:** folding is a view state. It is never written to the Markdown file, and the source
  text is untouched.
- **Remembered:** the folded sections are kept per document in the preview panel, so they survive a
  reload and a content update. A heading whose text changes is no longer folded.
- **Find and links:** the [find bar](find.md) (`Cmd+F` / `Ctrl+F`) still reaches text inside a folded
  section and unfolds it; a link, a table-of-contents entry or an editor jump to a heading or block
  inside a folded section unfolds the sections around it.
- **Edit mode:** folding works in edit mode too. A block inside a folded section cannot be selected
  or edited until you unfold the section. Folding is refused while a block editor is open.

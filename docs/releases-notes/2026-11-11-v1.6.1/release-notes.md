<h1 align="center">Markdown OKF-Schema Studio 1.6.1</h1>

<p align="center">
  <b>Edit any table cell, keep the page in step with undo, use the cell editor in a narrow pane.</b><br>
  <sub>13 changes since 1.6.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.6.1/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

This release fixes tables. Every fix comes from a long session of editing tables and front matter
in real VS Code windows.

## ✏️ Edit every table cell by cell

Two kinds of table could not be edited cell by cell. Both now open the cell editor on a click, and
their row and column handles work:

- a table whose delimiter row uses one or two dashes, such as `:--` or `--:`;
- a table row followed by a block id or another token after its closing pipe.

```markdown
| Step | Owner |
| :-- | --: |
| Parse | Ana |
| Render | Ben | ^row-render
```

A column move keeps a `^id` at the end of its row instead of carrying it into the middle.

A table written by hand, or by an agent, no longer needs to be rewritten before you can edit it in
the page.

## ↩️ Undo, redo and Revert File keep the table right

After an undo, a redo or a Revert File, the table in the page shows what the file holds. A table
whose cell editor is open closes it and shows the restored text. A table whose cell you left with
<kbd>Tab</kbd> is rebuilt, instead of keeping the text you had typed.

When you undo or redo the deletion of a row that carried a review comment, the comment mark comes
back on that row.

What the page shows is what the file holds, whatever way you went back.

## 📐 The cell editor fits a narrow pane

In a narrow pane, the editor of a table cell now fits the pane. Its field and its Done and Cancel
buttons stay visible instead of running past the right edge.

| Before | After |
| --- | --- |
| ![The cell editor runs past the right edge of a narrow pane, hiding its buttons](cell-editor-narrow-before.png) | ![The cell editor fits the narrow pane, with its Done and Cancel buttons visible](cell-editor-narrow-after.png) |
| A narrow pane, 1.6.0 | The same pane, 1.6.1 |

The page beside the source, or in a split, is now as editable as in a wide window.

## 🛠 Smoother editing

- **Escape cancels only the cell you are in**: pressing <kbd>Escape</kbd>, or the Cancel button,
  in a table cell cancels only the text typed in that cell. The cells you left with <kbd>Tab</kbd>,
  an arrow key or a click keep their text in the file, as the page already showed.
- **One click opens a property**: in edit mode, one click on a property below an open field editor
  opens it, instead of needing a second click when closing the unchanged editor moved the rows up.

<details><summary><b>🐞 All fixes</b></summary>

- Every fix of this release is described above.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- A change request now passes a Verifier step before its pull request turns ready: it proves the
  change at the pushed head, captures before and after screenshots, and checks the pull request
  description.
- Known issue: a real VS Code test of the table editor can fail once on a focus race and pass when
  run again.

</details>

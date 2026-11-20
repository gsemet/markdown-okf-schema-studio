<h1 align="center">Markdown OKF-Schema Studio 1.10</h1>

<p align="center">
  <b>Drag a list item into place, edit one item at a time, list items in the outline.</b><br>
  <sub>30 changes since 1.9.3 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.10.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## ↕️ Drag a list item to move it

![A bullet list in edit mode with a handle left of each item; one item is held down, dimmed, and a line shows where it will drop](list-item-handles-drag.png)

In edit mode, each list item has a handle on its left, as table rows do. Drag it, or focus it and
press <kbd>Alt</kbd>+<kbd>Up</kbd> or <kbd>Alt</kbd>+<kbd>Down</kbd>: the item moves with its
sub-items in one edit.

## ✏️ Edit one list item, not the whole list

![Left, a click on a list item opens the whole list in the editor; right, the same click opens only that item](edit-one-list-item.png)

A click on the list itself, outside its items, still edits the whole list.

## 🧭 List items in the table of contents

![The table of contents with the items of a top-level list shown under the heading before them](list-items-in-toc.png)

Turn on the setting `markdownOkfSchemaStudio.preview.listItemsInToc` (off by default) in the VS Code
settings to list the items of top-level lists in the table of contents, by their first line. A
document that writes each requirement as a list item gets a usable outline.

<details><summary><b>🐞 All fixes</b></summary>

- When a render fails without a message, the preview shows "The render failed." (or "The latest
  render failed." over the kept page) instead of "undefined" or an empty message.

</details>

<details><summary><b>🔎 Details</b></summary>

- From the keyboard, <kbd>Enter</kbd> on an item, or on a block inside an item, reached with
  <kbd>Right</kbd> as before, edits that item or that block only.
- An ordered list keeps its numbers in order when an item moves.
- The lists of alerts and admonitions get their handles left of the box.
- The table of contents leaves out the items of a `[TOC]` list, of the footnotes and of tables.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- The requirements of rendering, diagrams, trust, MyST, code blocks and GitHub Markdown are traced
  to their code and tests, with a use case diagram each; the requirements lint fails on a diagram
  that does not parse.
- Every heavy CI dispatch builds the gallery and the site.
- The table breakout width tests run on Linux in the visual job, with one bundled font.
- Three real-window tests and a build queue test no longer fail at random.
- The release notes are short and demo-first; the release guideline says how.

</details>

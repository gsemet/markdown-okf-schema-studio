<h1 align="center">Markdown OKF-Schema Studio 1.11</h1>

<p align="center">
  <b>Edit CRLF files without getting stuck, delete blocks, open Studio at the line you searched.</b><br>
  <sub>21 changes since 1.10.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.11.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 💾 Edit a file with CR LF line endings

The block editor of a file with CR LF line endings no longer stays stuck on "Saving Markdown..." when you leave it without a change. A block you edit keeps the line endings of its file.

## 🗑️ Delete a block

Each block's bar has a Delete block button (x), and <kbd>Delete</kbd> or <kbd>Backspace</kbd> on a selected block deletes it. Emptying a block and pressing Done removes the block instead of leaving blank lines.

![A block in edit mode with its bar below it: insert, move up, move down and a delete button](delete-block-button.png)

## ⬜ Reach and remove blank lines

In edit mode, two or more blank lines between blocks, at the start or at the end of a document show as a blank-lines block. Reach it with the arrow keys, click or press <kbd>Enter</kbd> on it to write a block in its place, or remove it with <kbd>Delete</kbd>.

![A run of three blank lines shown as a dashed blank-lines block between two paragraphs](blank-lines-block.png)

## 🔎 Open Studio at the line you searched

A search result, a Quick Open `file.md:40` or a link to a line opens Studio at that line, with an arrow in the margin. The setting `markdownOkfSchemaStudio.open.searchResultsInStudio` is on by default; the new setting `markdownOkfSchemaStudio.open.markdownFilesInStudio` opens every Markdown file in Studio, and **Open as Text** reads the raw text of one file.

![A code block with a blue arrow in the margin at line 15](line-marker-arrow.png)

## 🛠 Smoother editing

- **A new block starts clean.** It no longer keeps its leading blank lines, and one inserted after a list gets one blank line before it.
- **The line arrow stays clear of list handles** in edit mode.
- **Requirement pages on the website** draw each use case as one joined map, smaller and readable, and show table scenarios instead of empty columns.

<details><summary><b>🔎 Details</b></summary>

- The setting `markdownOkfSchemaStudio.open.markdownFilesInStudio` replaces the `workbench.editorAssociations` entry for Markdown files; an existing entry is migrated.
- Removing a blank-lines block keeps one blank line.
- On the requirement map, states shared by several paths are drawn once, each path keeps its colour, and Play walks the path in its colour.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- Test fixtures with CR LF line endings stay CR LF, and the save tests cover CR LF, LF and mixed files.
- The use case map tests run in their own CI job.
- Release notes highlights start with text; their pictures are cropped on the change.
- Requirement pages get one share card per feature category.

</details>

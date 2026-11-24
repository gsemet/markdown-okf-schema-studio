<h1 align="center">Markdown OKF-Schema Studio 1.12</h1>

<p align="center">
  <b>A Markdown file opens as text again, the blank-lines editor closes, each blank line is its own block.</b><br>
  <sub>21 changes since 1.12.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.12.1/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## 📄 A Markdown file opens as text again

Open With... > Text Editor stays a text editor, and a search result opens the text editor at the line again, as it did before 1.11.0. Studio no longer watches the files you open, so the settings `open.searchResultsInStudio` and `open.markdownFilesInStudio` are gone.

To open every Markdown file in Studio, associate `*.md` with Studio in `workbench.editorAssociations`. Where `open.markdownFilesInStudio` was on, the first activation sets that association for you. With it, a click in the Explorer opens Studio, and a jump to a line opens Studio at the top, without a marker in the side preview. Opening Studio at the line comes back in a later version.

## ⬜ One block for each blank line

Each extra blank line in edit mode now shows as its own blank-line block. Typing in one writes your text in place of that one blank line and keeps the others.

## 🛠 Smoother editing

- **Done closes the blank-lines editor.** It no longer stays on "Saving Markdown…".
- **Cancel and Escape always close a saving editor.** When a save fails, your text comes back in an editor you can save again.
- **Open Preview to Side and Refresh Preview finish again.** They complete once the page shows the document, as in 1.12.0, and so does a restored panel.

<details>
<summary><b>🔎 Details</b></summary>

- The side preview marks no line while a Markdown file is associated with Studio and you jump to a line: the jump opens Studio at the top.
- A search result or a jump with the default settings opens the text editor at the line.

</details>

<details>
<summary><b>🛠 For contributors</b></summary>

- The tests of Open Preview wait for the shown render before they read the preview counters, and the opening of a file is proven in a real window.
- The visual checks of the empty document and of six lines expect the blank-line block.
- Release pull requests can no longer carry merge commits, and each changelog line ends with its commit, pull request and issue.

</details>

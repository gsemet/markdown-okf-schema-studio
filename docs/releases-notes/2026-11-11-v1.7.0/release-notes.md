<h1 align="center">Markdown OKF-Schema Studio 1.7</h1>

<p align="center">
  <b>Export a page as one HTML file, paste cells from a spreadsheet, edit a table inside a quote or an admonition.</b><br>
  <sub>11 changes since 1.6.1 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.7.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

This release lets a page leave VS Code, and makes tables easier to fill.

## 📤 Export a page as one HTML file

The new Export button in the toolbar, or the **Export to HTML** command, saves the page as one
self-contained `.html` file, in the theme and the width of the preview. Open it in any browser,
attach it to a mail or drop it in a shared folder: it needs nothing else.

- Images and Mermaid, PlantUML and Vega diagrams are embedded in the file.
- Tabs and dropdowns still open, without JavaScript, and the properties table opens on a click.
- Links to other files of your workspace would break outside it: a warning tells you, and they
  are removed. Links to the web are kept.
- Review comments and editing controls are left out.

| In VS Code | The exported file |
| --- | --- |
| ![A requirement page in the Cream theme, with its properties table, tabs and a rendered diagram, and the Export button in the toolbar](html-export-preview-light.png) | ![The same page saved as one HTML file and opened in a browser with JavaScript off, Cream theme: the properties table, tabs, a dropdown, an image and a drawn diagram above a folded Diagram source](html-export-file-cream.png) |
| The page and its Export button, Cream theme | The same page as one HTML file in a browser, JavaScript off |

The exported file above was opened with JavaScript turned off: the properties table opens on a
click (open in the picture), the tabs and the "Read more" dropdown work, the image and the diagram are drawn, and
the diagram keeps its source in a folded "Diagram source".

A plan or a review written with an agent can now be read by someone who has no VS Code.

## 📋 Paste cells from a spreadsheet

Copy a block of cells in a spreadsheet, click a table cell, and paste: the cells fill from that
one, rightwards and downwards, like in the spreadsheet. The rows and columns the table lacks are
added. One undo takes the whole paste back. Pasting a single value works as before.

Cells copied from a table of the page paste the same way, so a block of a table can be copied into
another one.

Filling a table no longer means typing it cell by cell, or cleaning the tabs a paste left behind.

## 🗂 Edit a table inside a quote or an admonition

A table inside a quote, a GitHub alert (Note, Tip, ...) or a MyST admonition now opens the cell
editor and the table bar on a click, like any other table, instead of the raw Markdown editor.
The `>` prefixes and the rest of the quote stay as you wrote them.

```markdown
> [!NOTE]
> A GitHub alert that holds a table:
>
> | Depot | Capacity |
> | --- | --- |
> | Geneva | 60 |
```

| Light | Dark |
| --- | --- |
| ![A table inside a quote, with its cell editor open on the cell Lyon and the table bar above it](table-in-admonition-light.png) | ![A table inside a GitHub Note alert, with its cell editor open on the cell Geneva and the table bar above it](table-in-admonition-dark.png) |
| A table in a quote | A table in a GitHub alert |

A table is edited the same way wherever it sits in the page.

## 🛠 Smoother editing

- **Tab adds a row, and says so**: in the last cell of a table, the cell editor shows
  "Tab: new row". If you press <kbd>Tab</kbd> there by mistake, <kbd>Escape</kbd> (or Cancel) in
  the new row, still empty, removes it again.
- **Find shows the match in a wide table**: Find now scrolls a wide table sideways to show the
  match, instead of counting a match you could not see when the table was scrolled to another
  column.

<details><summary><b>🐞 All fixes</b></summary>

- The Rename label field of a table's label now opens above its anchor icon, so it no longer hides
  the first rows of the table, and a click on a cell opens the cell editor right away.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- The pull request of a version now shows the release notes and the announcement thread as they
  will read, not only as a diff.
- Every landed change and every release gets a short retro: what cost time, its root cause and the
  fix to the process. The lessons of the table changes of this release are folded into the process
  and the visual tests.
- A new documentation page, "How we ship", follows release 1.6.1 from the request to the
  Marketplace.
- CI installs the packages of the visual stage from its cache, without `apt-get update`, so an
  outage of the Ubuntu mirrors no longer slows it down.
- Known issue: exporting a page while a block editor is open leaves that block out of the file.
  Close the editor before you export.

</details>

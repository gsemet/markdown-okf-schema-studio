<h1 align="center">Markdown OKF-Schema Studio 1.13</h1>

<p align="center">
  <b>Render comments faster on large documents, copy a selection as Markdown, edit one block inside an admonition.</b><br>
  <sub>96 changes since 1.12.1 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.13.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## ⚡ See comments rendered faster on large documents

On a large test document, a new comment now restyles 4 elements of the page instead of about 3,100, and its highlight appears about 14% sooner. Adding, answering, resolving or deleting a comment updates only the marks that change, and the **Comment** button, the copy button and the edit mode outline follow the selection or the pointer at most once per frame.

![Bar chart: elements restyled by one new comment drop from 3,109 to 4, and the time until its highlight is drawn from 53 ms to 46 ms](comment-render-speed.png)

## 📋 Copy a selection as Markdown

Select text in the preview and press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>C</kbd> to paste its Markdown in a text editor, or the rendered text in a rich editor. Turn on the setting `markdownOkfSchemaStudio.preview.rawCopy.balanceEdges` (off by default, in the VS Code settings) to also get the markers and fence lines of what the selection cuts through, as in this clip.

![A selection copied from the preview and pasted as Markdown, with the fence lines of an admonition and a warning added](raw-copy-balance-edges.gif)

## ✏️ Edit one block inside an admonition or alert

In edit mode, a click or <kbd>Enter</kbd> on a paragraph, a list item or a directive inside an admonition or a GitHub alert edits that block only. The title or the frame still opens the whole box.

![A click in a note that opened the whole directive source, then the same click opening only the second paragraph inside the note](admonition-block-edit-before-after.png)

## 📊 Hover a chart to read its values

Hover a mark of a Vega-Lite chart in the preview to see its values.

![A grouped bar chart with a box showing the quarter, revenue and product line of the hovered bar](chart-hover.png)

## 🛠 Smoother editing

- **Open a file in Studio at the caret's line.** The command **Open in Studio at This Line**, in the Command Palette and the title bar menu of a Markdown text editor, opens a Studio tab, marks the line and keeps the text tab.
- **Links, Back and Next keep your place.** In a Studio tab, a link to another Markdown file and Studio's Back and Next open the target at its heading or line, in a Studio tab when the file opens as one.
- **Chart text follows your page text.** Vega-Lite and Vega legends, axes and titles scale with the Markdown font size and the zoom, and the preview no longer shows the **Chart source** section under a chart.
- **Front matter errors stand out.** A field with a schema error shows its name in red with a wavy underline under its value; a warning, also on a whole table, shows in the warning colour.

<details><summary><b>🐞 All fixes</b></summary>

- In Auto width, a code block whose longest line is a little wider than the column widens until the line fits, instead of keeping a scroll bar, with or without a caption.

</details>

<details><summary><b>🔎 Details</b></summary>

- The comment speed figures come from a generated test document in VS Code on a Linux CI runner, so your times depend on your document and your machine. The time to select text did not change measurably.
- The raw Markdown copy works in reading and edit mode.
- Inside an admonition or an alert, a diagram, a formula or a code block opens whole. <kbd>Enter</kbd> on the admonition selected as a whole opens all of it.
- <kbd>Alt</kbd>+<kbd>Up</kbd> and <kbd>Alt</kbd>+<kbd>Down</kbd> move a block of the body inside its box, the arrow keys keep the caret at the edges of its lists, and erasing a block of an alert keeps the alert.
- **Open in Studio at This Line** shows the Studio tab of a file that is already open in another group, instead of opening a second one.
- `"tooltip": null` on a chart mark turns its hover box off. A Vega chart shows only the tooltips it defines.
- A chart specification's own `config` still wins over the page's text sizes. Discrete labels on the x axis are horizontal.
- The HTML export keeps each chart as a static drawing, with its **Chart source** section.

</details>

<details><summary><b>🛠 For contributors</b></summary>

- Each screenshot of the published gallery has its own link, `gallery.html#<capture id>`, which stays the same from one CI run to the next and follows Back and Forward.
- The published docs site plays a feature clip as a looping video where a page shows its GIF. `just clip` builds a clip from its storyboard.
- The behaviour scenarios of the requirements have IDs, shown in the requirements viewer, and a new How we test page links the test levels to the requirements.
- The trust and security use cases are accepted in a real VS Code, and the visual checks run as two parallel CI jobs.

</details>

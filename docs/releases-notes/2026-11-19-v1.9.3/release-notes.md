<h1 align="center">Markdown OKF-Schema Studio 1.9.3</h1>

<p align="center">
  <b>A committed block edit shows up at once, even on long documents.</b><br>
  <sub>2 changes since 1.9.2 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from VS Code Marketplace</a> ·
  <a href="https://open-vsx.org/extension/GaetanSemet/markdown-okf-schema-studio">Install from Open VSX</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.9.3/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## ⚡ Committing a block edit no longer waits

On a long document, closing a block editor took up to two seconds before the page showed the
change. The preview was waiting for the same pause it leaves while you type, and the pause grows
with the size of the document. A commit now renders at once, and the table row handles are placed
in the next frame instead of during the page update. On a long chapter full of tables, the time
from commit to updated page went from about 2 seconds to under half a second.

Typing still waits for the pause, so the preview does not rebuild on every key.

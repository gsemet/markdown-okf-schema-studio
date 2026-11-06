<h1 align="center">Markdown OKF-Schema Studio 1.5</h1>

<p align="center">
  <b>Edit in any folder, see a comment on its sentence, dismiss the editor with a key.</b><br>
  <sub>6 changes since 1.4.0 · VS Code 1.95 or later · MIT</sub>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio">Install from the Marketplace</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio#readme">Read the guide</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/blob/v1.5.0/CHANGELOG.md">Full changelog</a> ·
  <a href="https://github.com/gsemet/markdown-okf-schema-studio/releases/tag/v1.0.0">1.0 showcase</a>
</p>

---

## ✏️ Edit a document whatever the workspace trust

A document opens for editing in Restricted Mode, and also when the file lives outside every
workspace folder. Blocks, frontmatter, checkboxes, comments, pasted images and dropped files all
work as in a trusted workspace. The reading limits stay: includes and resources remain in the
document's folder, and the features that need trust stay off, each with its reason.

A file that VS Code itself keeps read-only now says so on every edit, instead of reporting success.

A plan an agent wrote in a scratch folder is now as easy to fix as one in your project.

## 💬 See a comment on its sentence

A comment on a sentence that runs over several source lines is highlighted in the text, as any other
comment, instead of showing only a badge on its block.

![A comment thread open on a highlighted sentence of a handbook](comment-thread.png)

You see exactly which words a reviewer meant, even when your editor wraps them.

## 🛠 Smoother editing

- **The comment editor stays in the window**: near the bottom of the page it stays inside the window,
  and it follows its text when the page scrolls.
- **Dismiss it from anywhere**: <kbd>Esc</kbd> closes the comment editor wherever the focus is, and
  so does a click outside it. When a draft would be lost, the editor asks whether to keep it.

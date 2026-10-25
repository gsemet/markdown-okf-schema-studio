# Comparison With Other Markdown Tools

Checked on 2026-10-25. Method: we read the Marketplace pages, READMEs and the official VS Code
release notes (1.119 to 1.142) of each tool.

A feature marked "no equivalent found" means the page we read does not mention it. That is weak
evidence of absence, not proof: "not documented" is not "not supported". Tools change every few
weeks; the VS Code Markdown editor in particular moved in 1.131, 1.132, 1.137 and 1.142. We repeat
the check before each release.

Tools compared: VS Code built-in Markdown (1.142), Markdown All in One 3.6.3, Markdown Preview
Enhanced 0.8.40, the WYSIWYG extensions Markdown Editor (zaaack) 0.1.22, Office Viewer 4.2.2 and
Markdown Pro, and the MyST extension (ExecutableBookProject.myst-highlight) 0.11.0.

## Summary

| Studio feature | What we found elsewhere |
| --- | --- |
| Visual editing of MyST (grid cards, nested admonitions, figures with a form, `{list-table}`) | The MyST extension renders a preview only. The VS Code Markdown editor and the WYSIWYG extensions document no MyST. No equivalent found. |
| Schema-aware OKF frontmatter (JSON Schema diagnostics, enum and typed editors) and `x-okf-link` evidence | VS Code shows front matter as a table, as code or hides it. No equivalent found. |
| Review comment threads stored in a JSON file next to the document, with resolve and orphan handling | VS Code's experimental hybrid editor adds comments an agent can act on; storage is not documented. No equivalent found for human review threads in plain files. |
| Mermaid together with PlantUML, no Java, no server, offline, Restricted Mode | Mermaid alone is common (built into VS Code since 1.121). Markdown Preview Enhanced needs a PlantUML server or a local `.jar`. No equivalent found for the pair without Java. |

## Where others have it too

- Mermaid is not a differentiator on its own. It is documented by:
  - VS Code (built in since 1.121)
  - Markdown Preview Enhanced
  - Markdown Editor (zaaack)
  - Markdown Pro
- Changes since the last commit: VS Code renders Markdown diffs in the preview and, in the
  experimental hybrid editor, shows Git change markers and Markdown diffs (the baseline is not
  stated). Studio marks the blocks changed since the last Git commit with a green bar in the live
  preview, with a toolbar toggle. We claim only that form.
- Themes and slash menu: Markdown Pro documents both, and the Markdown Editor (zaaack) documents
  themes.
- Image paste and code copy buttons: the VS Code Markdown editor has both since 1.142.

## Per-tool notes

| Feature | VS Code | Markdown All in One | Markdown Preview Enhanced | Other WYSIWYG | MyST extension |
| --- | --- | --- | --- | --- | --- |
| Several built-in themes | not documented [1] | not documented [2] | unknown [3] | documented (zaaack [5], Markdown Pro [8]) | not documented [4] |
| Auto-margin wide table and figure breakout | not documented | not documented | not documented | not documented | not documented |
| Mermaid | built in since 1.121 [1][7] | not documented [2] | documented [3] | documented (zaaack [5], Markdown Pro [8]) | not documented |
| PlantUML without Java or server | not documented | not documented | needs server or `.jar` [3][9] | not documented; Office Viewer unknown [10] | not documented |
| MyST directives and admonitions rendered | not documented [1] | not documented | unknown | not documented | documented, preview only [4] |
| WYSIWYG editing of MyST | not documented | not documented | not documented | not documented | not documented [4] |
| Schema-aware OKF frontmatter | not documented | not documented | not documented | not documented | not documented |
| Review comment threads in a sidecar file | agent comments in an experimental editor [6] | not documented | not documented | not documented | not documented |

## Sources

1. <https://code.visualstudio.com/docs/languages/markdown>
2. <https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one> (3.6.3)
3. <https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced>
   (0.8.40) and <https://github.com/shd101wyy/vscode-markdown-preview-enhanced>
4. <https://marketplace.visualstudio.com/items?itemName=ExecutableBookProject.myst-highlight>
   (0.11.0) and <https://github.com/executablebooks/myst-language-support>
5. <https://marketplace.visualstudio.com/items?itemName=zaaack.markdown-editor> (0.1.22) and
   <https://github.com/zaaack/vscode-markdown-editor>
6. <https://code.visualstudio.com/updates/v1_131> (hybrid editor, comments for agents) and
   <https://code.visualstudio.com/updates/v1_132> (Markdown diffs in the hybrid editor)
7. <https://code.visualstudio.com/updates/v1_121> (built-in Mermaid, front matter as table)
8. <https://github.com/AshishSalaskar1/Markdown-Plus-Vscode> (Markdown Pro)
9. <https://raw.githubusercontent.com/shd101wyy/vscode-markdown-preview-enhanced/master/README.md>
10. <https://marketplace.visualstudio.com/items?itemName=cweijan.vscode-office> (Office Viewer
    4.2.2)
11. <https://code.visualstudio.com/updates/v1_142> (image paste, copy button in the Markdown
    editor)

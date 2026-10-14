# Use-Case Catalogue

Daily-usage journeys to exercise, grouped into the areas that charters and `coverage-map.py` use.
Pick areas changed since the last campaign and journeys never explored (the latest `QA-04`-style
coverage note), skip what the automated suites already assert, and re-check old findings with
their replay scenarios. Each journey names a corpus; never edit originals, only the copies under
the QA workspace.

Scripted sweeps cover some journeys without exploration: `noop-sweep.mjs` (D1–D3, E2 on any
document), `latency-probe.mjs` and `flicker-probe.mjs` (C1, C4). Run them on real chapters and let
the agent triage only their failures.

## A. Discovery and opening

| ID | Journey | Corpus |
| --- | --- | --- |
| A1 | Find and open the side preview (palette, title bar, context menus, keybinding) | any chapter |
| A2 | Open With → Markdown OKF-Schema Studio; compare with built-in Markdown Preview and Markdown Editor | `fixtures-visual/01-handbook-overview.md` |
| A3 | Side preview follows the active editor: Markdown → Markdown, Markdown → code/YAML/settings → back | chapters, `okf/okfreq-examples` |
| A4 | Close and reopen; Developer: Reload Window; restore of scroll, theme, edit mode | chapter 08 |
| A5 | Untitled Markdown, `.markdown` extension, file outside the workspace, empty file, untrusted workspace | `synth/empty.md` |

## B. Reading

| ID | Journey | Corpus |
| --- | --- | --- |
| B1 | Rendering fidelity: admonitions, figures, tables, code, math, Mermaid, PlantUML, citations, cross-refs, includes, raw blocks | chapters, `synth/diagrams-and-math.md` |
| B2 | Scroll sync both ways; anchor toggle; sticky headings; jump to top/bottom | chapter 08 (107 KB) |
| B3 | Links: relative, anchors, `#L42`, wikilinks, external, broken | `synth/links.md`, vault copy |
| B4 | Theme: toolbar cycle and VS Code theme switch; light/dark legibility | any |
| B5 | Find widget (Cmd+F in the preview), copy text, zoom | any |
| B6 | Narrow preview (drag the sash to about 380 px), wide preview with `maxContentWidth` 0 | wide table fixture |

## C. Editing in the source with the preview open

| ID | Journey | Corpus |
| --- | --- | --- |
| C1 | Type a paragraph; count webview navigations; watch scroll stability | chapter 02 / 08 |
| C2 | Undo/redo bursts; paste a large section; delete a section; move a section (cut/paste) | chapter 08 |
| C3 | Transient syntax errors: unclosed fence/directive, invalid YAML; recovery | `synth/broken.md` |
| C4 | Typing next to Mermaid/math (flicker, re-render cost) | `synth/diagrams-and-math.md` |
| C5 | CRLF documents | `synth/crlf.md` |

## D. Editing inside the preview (edit mode)

| ID | Journey | Corpus |
| --- | --- | --- |
| D1 | Paragraph: click, type, blur / Cmd+Enter / Escape; caret placement | chapter 02 |
| D2 | Heading, list (Enter, Tab), admonition (title and body), code fence, blockquote, math, Mermaid | fixtures 02, 04, diagrams |
| D3 | Tables: cell typing, Tab, Enter, Escape, row/column actions, formatting preservation | `synth/tables.md` |
| D4 | Keyboard navigation across blocks (arrows at block edges) | any |
| D5 | Write a full section from scratch in the Open With editor; empty document | `synth/empty.md` |
| D6 | Concurrent edits: source editor and inline editor on the same block; external file change while editing | any |
| D7 | Undo/redo inside the inline editor in both modes; Cmd+S | any |

## E. Frontmatter and OKF

| ID | Journey | Corpus |
| --- | --- | --- |
| E1 | Properties table display, schema validation messages, strict additional properties | `okf/*`, `synth/frontmatter-edge.md` |
| E2 | Edit each type: text, enum, number, date, boolean, list, object; formatting preservation | `synth/frontmatter-edge.md` |
| E3 | Add, remove, rename fields; required fields | `okfreq-examples` |
| E4 | x-okf-link: resolution modes, tooltips, preview fields, marker line navigation, project root per bundle | `okfreq-examples`, `synth/related-target.md` |
| E5 | Invalid YAML frontmatter and recovery | `synth/broken.md` |

## F. Robustness

| ID | Journey | Corpus |
| --- | --- | --- |
| F1 | Rename/delete the previewed file; rename a linked target | synth |
| F2 | `git checkout`-style external rewrite while previewing and while an inline editor is open | synth |
| F3 | Settings toggled live (all `markdownOkfSchemaStudio.*` keys) | any |
| F4 | Long session: memory and responsiveness after 30 minutes of edits | chapter 08 |

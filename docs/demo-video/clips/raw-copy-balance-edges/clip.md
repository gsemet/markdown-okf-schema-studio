---
title: Feature clip raw-copy-balance-edges
status: approved
date: 2026-11-25
---

# Feature clip: raw-copy-balance-edges

**This is the live storyboard.** The clip is built from this file: edit any row marked *(on screen)*,
save, and run `just clip raw-copy-balance-edges render`, then `check`. Rows marked *(filmed)*
describe the take: changing them means a new take. The text of an *(on screen)* row is the clip's
exact text (`**bold**` takes the orange accent).

The clip is one continuous shot: the action on the left, then a zoom on the right. It shows two
texts in turn. The times and the pictures follow the last take and render; the approved texts and
shots do not change, and the maintainer still reviews the cut in the pull request.

## Clip

| Field | Content |
| --- | --- |
| Length | 9.8 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | `markdownOkfSchemaStudio.preview.rawCopy.balanceEdges`: on |
| Filmed on | Windows, VS Code 1.147.0, extension 1.12.1 VSIX built from the branch |
| Stage | `stage/runbook.md` (opened in Studio, left) and the empty `stage/notes.md` (text editor, right) |

## 1. Copy on the left, paste on the right

![The selection, from inside the bold to inside the warning, copied](frames/01-selected.png)

![The paste in notes.md](frames/02-pasted.png)

| Field | Content |
| --- | --- |
| Time | 0 to 4.4 s (drag 0.3 to 2.6 s, copy at 2.6 s, click in `notes.md` at 3.7 s, paste at 4.2 s) |
| Shot *(filmed)* | Studio in reading mode on `runbook.md` (left), the empty `notes.md` in the text editor (right). The mouse drags from "migrations", in the middle of the bold "database migrations first" inside the untitled `important` admonition, across a small table, a thematic break (`---`) and a paragraph, to "every worker" inside the `warning` admonition. Copy chord. The pointer moves to `notes.md` and clicks. Paste chord. |
| Text 1 *(on screen)* | From the preview, select and copy **raw Markdown** |
| Badge copy *(on screen)* | Ctrl+C / ⌘C |
| Badge paste *(on screen)* | Ctrl+V / ⌘V |

## 2. Zoom on the pasted text

![Zoom, mark 1 on the added opening line](frames/04-mark-1.png)

![Mark 2 on the added opening bold](frames/05-mark-2.png)

![Mark 3 on the added closing line](frames/06-mark-3.png)

| Field | Content |
| --- | --- |
| Time | 4.4 to 9.8 s (zoom from 4.5 s, held to 8.8 s, then back to the start for the loop) |
| Shot *(filmed)* | Zoom (at most 2x) on the 16 pasted lines in `notes.md`, from the opening `:::{important}` to the closing `:::`, the table and the `---` in view. |
| Zoom | result, hold to 8.8 s |
| Mark 1 *(on screen)* | Orange outline around the added line `:::{important}`, 5.0 to 6.2 s |
| Mark 2 *(on screen)* | Orange outline around the added opening `**` before "migrations", 6.2 to 7.4 s |
| Mark 3 *(on screen)* | Orange outline around the added closing `:::`, 7.4 to 8.6 s |
| Text 2 *(on screen)* | Cut-off syntax is **completed** on copy to ensure valid Markdown |

Expected paste, the scenario's check (added by the setting: the opening `:::{important}` line, the
opening `**` and the last `:::`; the table and the `---` paste as their Markdown):

```markdown
:::{important}
**migrations first**, then restart the workers one at a time.
:::

| Step | Command |
| --- | --- |
| Migrate | `just migrate` |
| Restart | `just restart-workers` |

---

The deploy script refuses to start the workers on an old schema.

:::{warning}
Never restart every worker
:::
```

## Review notes

- With the setting off, the same selection copies from `migrations first**` to `every worker`,
  with no opening line, no opening `**` and no closing `:::`. That case is not filmed.
- The raw screencast ran at 4.2 frames per second: the pointer is drawn smooth by the kit, but
  the selection grows by steps. A 15 fps output does not change it.

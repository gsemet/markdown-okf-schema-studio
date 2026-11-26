---
title: Feature clip keyboard-navigation
status: draft for the owner's review
date: 2026-11-26
---

# Feature clip: keyboard-navigation

**This is the live storyboard.** The clip is built from this file: edit any row marked
*(on screen)*, save, and run `just clip keyboard-navigation render`, then `check`. Rows marked
*(filmed)* describe the take: changing them means a new take. The owner reviews this file and the
clip in the pull request; the times and pictures come from the batch's take. `**bold**` in a text
takes the orange accent.

The clip is one continuous shot, and the mouse is never used: the pointer stays still in the
bottom right corner of the page the whole time. Fifteen key presses, each shown as a badge: `E`
turns edit mode on, the arrows pick and go down to a sub-item of a list inside an admonition, Enter
opens it, Escape closes, Ctrl/Cmd+Enter saves. It shows three texts in turn.

## Clip

| Field | Content |
| --- | --- |
| Length | 26.0 s |
| Size *(on screen)* | 1280x720 16:9 |
| Frame rate *(on screen)* | 15 fps |
| Outputs | silent, loops; MP4 (X, release), WebM (docs site), GIF 960 px (release notes, docs page) |
| Cards | none |
| Logo | top right |
| Setting filmed | none: every setting at its default |
| Filmed on | Windows, the VS Code version and the extension version written in `check.json`, VSIX built from the branch |
| Stage | `stage/release-plan.md` (Studio, the whole window, reading mode, Cream): a heading, a `note` admonition titled "Before the release" that holds a sentence and a list of three items (the second one with two sub-items), then a closing sentence |

Off camera (`setup`): the toolbar expanded (so the Edit toggle is in view), Studio in reading mode,
the page in Cream, no block selected. The keyboard focus is given to the page with one click in the
blank right margin of the page (in reading mode a margin click selects and opens nothing), then the
pointer is parked in the bottom right corner of the page, off every block and off the zoom. Frame 0
shows no selection ring and no hover.

## 1. E for edit mode, the arrows pick a block

Pictures: ![Edit mode on](frames/edit-on.png) ![The admonition selected](frames/admonition-selected.png) ![The whole admonition in its editor](frames/admonition-editor.png) ![The editor closed, the admonition still selected](frames/admonition-back.png)

| Field | Content |
| --- | --- |
| Time | 0 to 7.8 s (E at 0.6 s, Down at 2.2 and 3.6 s, Enter at 5.2 s, Escape at 7.0 s) |
| Shot *(filmed)* | Studio on `release-plan.md` in reading mode. `E`: the Edit toggle of the toolbar turns on. Down: the heading is selected (the first press takes the block nearest the top of the pane). Down: the selection ring moves to the admonition. Enter: the whole admonition opens in its source editor, from `:::{note} Before the release` to the closing `:::`. Escape: the editor closes with nothing changed, and the admonition stays selected. |
| Text 1 *(on screen)* | Press **E**, then the arrows pick a block |
| Badge edit *(on screen)* | E |
| Badge down *(on screen)* | ↓ |
| Badge enter *(on screen)* | Enter / ↩ |
| Badge escape *(on screen)* | Esc |

## 2. Right goes one level deeper

Pictures: ![Zoom on the admonition, its sentence selected](frames/sentence-selected.png) ![The list selected](frames/list-selected.png) ![The first item selected](frames/item-selected.png) ![The second item selected](frames/second-item-selected.png) ![The sub-list selected](frames/sublist-selected.png) ![The sub-item selected](frames/subitem-selected.png)

| Field | Content |
| --- | --- |
| Time | 7.8 to 19.2 s (zoom from 8.0 s; Right at 8.6 s, Down at 10.2 s, Right at 11.8 s, Down at 13.4 s, Right at 15.0 s, Down at 16.6 s, Right at 18.2 s) |
| Shot *(filmed)* | Zoom (at most 2x) on the admonition. Right: the selection goes inside the admonition, to its sentence. Down: the selection moves to the list below the sentence, inside the admonition. Right: the selection goes inside the list, to its first item "Tag the release on Friday". Down: the second item, "Build the packages", with its sub-list. Right: the selection goes inside that item, to its own text. Down: the sub-list. Right: the selection goes inside the sub-list, to its first item "the VSIX". |
| Zoom | admonition, hold to 25.7 s |
| Text 2 *(on screen)* | **Right** goes one level deeper |
| Badge right *(on screen)* | → |

## 3. Change one word, save

Pictures: ![Enter on the sub-item opens it alone in its editor](frames/subitem-editor.png) ![The word changed](frames/word-changed.png) ![Mark 1 on the saved sub-item](frames/04-mark-1.png)

| Field | Content |
| --- | --- |
| Time | 19.2 to 26.0 s (Enter at 19.8 s, Ctrl+Backspace at 21.4 s, "extension" typed from 21.9 to 22.6 s, Ctrl+Enter at 23.4 s; then back to the start for the loop) |
| Shot *(filmed)* | Enter: the sub-item opens alone in its editor (its one line, `- the VSIX` with its indentation, the caret at its end). Ctrl+Backspace (Option+Backspace on macOS) deletes the last word, "VSIX"; "extension" is typed. Ctrl/Cmd+Enter: the editor closes, the sub-item reads "the extension"; the rest of the admonition is unchanged. |
| Mark 1 *(on screen)* | Orange outline around the saved sub-item, 23.9 to 25.5 s |
| Text 3 *(on screen)* | Change a word and **save**, no mouse at all |
| Badge delete-word *(on screen)* | Ctrl+⌫ / ⌥⌫ |
| Badge save *(on screen)* | Ctrl+Enter / ⌘↩ |

Expected result, the scenario's check (read from the preview after each press, and from disk):

- After `E`, the page is in edit mode (`data-sphinx-preview-edit-mode` is `on`); it was `off` at
  the start.
- After each press the selected element (`data-sphinx-preview-block-selected`) is, in turn: the
  heading, the admonition, (Enter) a block editor whose text starts with `:::{note} Before the
  release` and ends with `:::`, (Escape) no editor and the admonition, the sentence "Run these steps
  in order, one person per step.", the list, its first item, the second item "Build the packages",
  that item's text, the sub-list, the sub-item "the VSIX".
- After the second Enter, the block editor holds `  - the VSIX` alone, with the caret at the end of
  that line.
- After Escape, `release-plan.md` on disk is byte for byte `stage/release-plan.md`.
- After Ctrl/Cmd+Enter, no editor is open, the sub-item reads "the extension", and
  `release-plan.md` on disk (after the autosave) is `stage/release-plan.md` with the line
  `  - the VSIX` replaced by `  - the extension`, nothing else changed.

## Review notes

- **The `E` key and the Enter key.** The owner's request uses `e` at step 6 to open the list for
  editing. In Studio `E` alone turns edit mode on from reading mode (SwRS-MDOKFSTUDIO-LIFE-172,
  `src/page/features/editMode.ts`) and does nothing in edit mode; Enter opens the selected block,
  item or inner block (SwRS-MDOKFSTUDIO-BLOCK-004, SwRS-MDOKFSTUDIO-BLOCK-254,
  `src/page/features/blockSelectionView.ts`, `src/page/features/structuralNavigationView.ts`). The
  clip keeps the owner's intent, "how easy it is to enter editing with `e`", by pressing `E` first,
  and uses Enter at step 6 (keyboard-nav-Q6).
- **What Right selects.** Right on the admonition selects its first inner block, the sentence
  (owner's step 3, as written). Down then selects the list (owner's step 4). Right on the list
  selects its first item, not the list: the list is already selected by Down
  (`src/page/modules/structuralCursor.ts`, `docs/user/editing.md` "A list has three levels"). The
  walk then goes on into the sub-list: Down selects the second item, Right its own text "Build the
  packages" (its first inner block, a paragraph), Down the sub-list, Right its first item "the VSIX",
  the sub-item the clip edits. The path is the one of the page test "the arrows walk on into a nested
  sub-list of an admonition and Enter opens that sub-item only"
  (`test/page/runtimeStructuralNavigation.test.ts`), and the take checks the selection after each
  press.
- **How the first block is selected without the mouse.** In edit mode with no selection, the first
  Down selects the block nearest the top of the pane, here the heading; a second Down reaches the
  admonition (`stepSelection` in `blockSelectionView.ts`). Right with nothing selected would select
  the first block of the page too. The keyboard focus itself is given to the page off camera, with
  one margin click in `setup` (keyboard-nav-Q8).
- **The admonition title.** The trial checks that Right lands on the sentence, not on the title "Before
  the release". Right goes to the first mapped block inside the admonition (`mappedChildren` in
  `src/page/features/mappedBlocks.ts`), and SwRS-MDOKFSTUDIO-BLOCK-254 says "its first inner
  block". If the take shows the title selected first, it is a finding against the feature, reported
  with what was selected, and the clip waits.
- **Changing one word.** Enter on the selected sub-item opens that item alone, its one line
  `  - the VSIX` with its indentation, with the caret at the end of the line
  (`focusTextControlAtLastContent` in `src/page/features/textControls.ts`), so the scene needs no
  caret move: Ctrl+Backspace on Windows deletes the last word, "VSIX" (a native text box key; Studio
  does not take it). On macOS the same key is Option+Backspace: the scenario presses
  `Control+Backspace` on Windows and `Alt+Backspace` on macOS, never `ControlOrMeta`, which would be
  Cmd+Backspace (delete to the line start) on macOS. The letters of "extension" are typed with no
  badge, as the address of `export-html` was: the typed word shows in the editor (keyboard-nav-Q9).
- **The badge of the word delete.** `Ctrl+⌫ / ⌥⌫` passes the storyboard check when filmed on
  Windows. Filmed on macOS, the kit would refuse it: its combined form wants `⌘` in the second group,
  and this key has `⌥`. The take is filmed on Windows, so no kit change is needed now; the smallest
  change, if a macOS take is wanted later, is to accept `⌥` as well as `⌘` in the second group of
  `isCombinedBadge` (`clip-kit/lib/storyboard.mjs`).
- **Length.** 26 s: fifteen presses about 1.6 s apart (a badge shows 1.2 s and fades over 0.33 s,
  so two badges never overlap, except the two Down presses 1.4 s apart, the same key), plus the typed
  word and the mark. It needs more than 12 s because the walk goes one level further, into the
  sub-list (four presses more than a walk to the first item). The 30 s limit of the kit comes from
  the CR `clip-the-advanced-renderings-tour` (keyboard-nav-Q5). The GIF budget (3 MB) at this length
  may need the kit's ladder (10 fps, 800 px); `check.json` reports the step used.
- **The selection after the save.** In the take, Ctrl/Cmd+Enter closes the editor and the selection
  ring is then on the whole admonition, not on the saved sub-item (`frames/02-pasted.png` and
  `frames/04-mark-1.png`; Mark 1 is around the sub-item). The scenario does not check the selection
  after the save and does nothing to change it.
- **The loop seam.** The clip starts in reading mode with "the VSIX" and ends in edit mode with
  "the extension" and the admonition selected. The differences are small (the Edit toggle, one word,
  one ring), but the seam SSIM (at least 0.98) is measured by `check`. If it fails, the fallback is a
  last Escape press at 25.8 s, badge Esc, after the zoom is released: it clears the selection ring;
  if that is still not enough, the batch reports it in the PR and the owner decides on a retake
  (keyboard-nav-Q10).
- **The pointer.** It never moves, so the keyboard selection ring is never hidden by a pointer move
  (`bindHover` in `editMode.ts`).
- **The take (Windows, VS Code 1.147.0, extension 1.12.1 from the branch VSIX).** 26.0 s, 73 raw
  screencast frames (2.8 fps) retimed to 30 fps by ffmpeg, playback rate 1.002, mp4 0.52 MB, webm
  0.35 MB, GIF 1.62 MB at ladder step 0 (960 px, 12 fps, 128 colours), loop seam SSIM 0.99037 (no
  Escape fallback needed), `check.json` passed. The badged presses are at 0.6, 2.2, 3.6, 5.2, 7.0,
  8.6, 10.2, 11.8, 13.4, 15.0, 16.6, 18.2, 19.8, 21.4 and 23.4 s; there is no unbadged key press, only
  the typed word.
- The edit is a real change to the file: the take restores the stage before each run (the kit
  copies `stage/` into a fresh workspace).

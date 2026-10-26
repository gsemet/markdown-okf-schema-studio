# Update Log

## 2026-10-26 (bold dollar prices preserve emphasis)

- SwRS-MDOKFSTUDIO-MYST-024: permissive MyST dollarmath no longer consumes the `**` markers
  around dollar prices; the exact four bold prices remain text inside strong spans, while valid
  `$x^2$` and `$a + b$` spans still typeset. Unit and light/dark visual contracts cover the fix.

## 2026-10-26 (save pins precede status layout changes)

- SwRS-MDOKFSTUDIO-BLOCK-228: final block and table saves capture the viewport pin before
  changing the saving status. The strengthened runtime regression fails with the old ordering
  and passes with the new ordering. Save-position and alert-dropdown scenarios are registered
  for real-window stress validation without changing their assertions or timeouts.

## 2026-10-26 (shared requirements guidance)

- Replaced the project-specific requirements guide with the generic guide shipped by
  okf-schema, and synchronized the retained baseline copy. Project paths, scopes, commands
  and coverage policy are resolved from configuration and governing project instructions.
  Repeated IDs are allowed beside distinct tests in one file; restored the LIFE-119 marker
  beside the pending layout-induced scroll regression test. The installed-guide regression
  test and byte-for-byte comparison with both Studio copies pass.

## 2026-10-26 (layout-induced scrolling preserves the reading anchor)

- SwRS-MDOKFSTUDIO-LIFE-119: a pending scroll updates the reading anchor only when block
  geometry is unchanged. Closing a comment above the reader no longer treats the browser's
  layout-induced scroll as a new reading position. Both scroll-order unit tests and all six
  comment reading-position visual scenarios pass.

## 2026-10-26 (palette selector and toolbar tooltips)

- SwRS-MDOKFSTUDIO-THEME-025: forced palettes now override dropdown colours, including the
  edition palette's mode selector on a dark host.
- SwRS-MDOKFSTUDIO-TOOLBAR-001: disabled controls dim only their icons, keeping tooltips opaque;
  hover and keyboard focus keep long labels aligned with their button. Focused style tests pass.

## 2026-10-27 (preview next to an editor no longer stuck at the top)

- SwRS-MDOKFSTUDIO-LIFE-119: new row in "Layout changes re-apply the stored anchor". A layout
  pass handles a pending user scroll before it re-applies the anchor. A webview placed next to a
  text editor reports a visual viewport resize ahead of each scroll; the layout pass then ran
  first and scrolled back to the old anchor, so the preview could not leave the top.

## 2026-10-26 (Auto width no longer pulls the scroll back on tables with row handles)

- SwRS-MDOKFSTUDIO-LAYOUT-023: new scenario "Table with row handles in edit mode". A wide table
  with row handles is capped at the pane minus two 34 px handle gutters, and the measurement lifts
  the !important row-handle cap. Before, the table flipped between broken out and shifted at every
  frame for some pane widths, and each re-measure pulled the scroll back to the anchor.

## 2026-10-26 (real-window typing scenario follows the block-open behaviour)

- SwRS-MDOKFSTUDIO-BLOCK-041: the verification note names the real-window scenario
  scenarioTypingUndoGrouping, which now expects the clicked heading's editor to open after the
  paragraph save and closes it with Escape before the undo. No behaviour change.

## 2026-10-26 (test and marker quality)

- No requirement text changes. SwRS-MDOKFSTUDIO-DIAG-009 gains page tests of the Mermaid entry point
  (element ids never repeat, passes run one at a time, a late drawing never replaces the current
  one, a failed drawing shows one error); SwRS-MDOKFSTUDIO-DIAG-024 gains a visual scenario for a
  bundled theme and an OpenIconic sprite. The superseded SwRS DIAG-012, 013, 014, 031 and 116 keep
  no marker (their behaviour is these two requirements).
- Markers narrowed from the whole style module to the CSS section that implements them:
  SwRS-MDOKFSTUDIO-LAYOUT-007 and SwRS-MDOKFSTUDIO-THEME-025.
- Companion marker files (`*.markers.ts`) name their host file and are checked by
  `just check-markers`.

## 2026-10-26 (toolbar and sticky band fixes)

- SwRS-MDOKFSTUDIO-TOOLBAR-018: the sticky band follows the headings of the running text only; a
  heading without height is no longer a parent line, and headings inside an admonition or the
  properties table (which the table of contents leaves out) never enter the band. The scenario
  "Every heading level" uses a normal section; two scenarios are added or reworded; the Known issue
  line is removed. StRS-MDOKFSTUDIO-TOOLBAR-004 and -006 lose their Known issue line about the
  mismatch with the table of contents.
- SwRS-MDOKFSTUDIO-TOOLBAR-040: the accessible name of a twisty is Fold followed by the heading while
  the subtree is shown and Unfold while it is folded; both Known issue lines are removed.
- SwRS-MDOKFSTUDIO-TOOLBAR-128 (and StRS-MDOKFSTUDIO-TOOLBAR-013): the editor-selection mark goes to
  the block that contains the cursor line (innermost when blocks nest, nearest edge between blocks);
  the Known issue line is removed.
- The toolbar over the scrolled text (StRS-MDOKFSTUDIO-TOOLBAR-001): unchanged; its Known issue line
  stays.

## 2026-10-26 (link navigation and history fixes)

- SwRS-MDOKFSTUDIO-TOOLBAR-059: Back or Next within the same document scrolls the preview to the stored
  line even when the preview does not follow the editor (the sourceScroll of a history move carries
  reveal). The Known issue line is removed.
- SwRS-MDOKFSTUDIO-TOOLBAR-054: a Back or Next whose document cannot be opened leaves the history
  position and the list as they were. The Known issue line is removed.
- SwRS-MDOKFSTUDIO-TOOLBAR-085 (and StRS-MDOKFSTUDIO-TOOLBAR-011): a link to a missing or blocked target
  keeps its text and colour and is followed by a warning icon with the reason as its tooltip and as the
  description of the link; a missing file reads "File not found: {path}". The Known issue line is
  removed from both. The scenario "shown only in the tooltip" is replaced by the icon scenario.
- SwRS-MDOKFSTUDIO-TOOLBAR-079: the links in view are asked again when the preview regains focus or
  becomes visible, so a file created or deleted meanwhile is reflected. The Known issue line is
  narrowed to the preview that stays focused.
- SwRS-MDOKFSTUDIO-TOOLBAR-090: a link path is decoded once; a file name with a literal percent
  (100%25.md) is reachable and an escaped percent is not decoded twice. The scenario "Decoding at most
  four times" becomes "Decoding once"; the Known issue line is removed.
- SwRS-MDOKFSTUDIO-TOOLBAR-117: the page refuses an escape left after four rounds whatever its digits
  (same class as the host). The Known issue line is removed.

## 2026-10-26 (small preview lifecycle fixes)

- SwRS-MDOKFSTUDIO-LIFE-010: Open Preview to Side from a Studio Open With tab previews that tab's
  file; a custom editor of another type is still refused. The Known issue line is removed.
- SwRS-MDOKFSTUDIO-CORE-001 (and the archived CORE-027): a failed engine load is not cached, so the
  first render after a failed warm-up loads the engine again; the Known issue line is removed.
- SwRS-MDOKFSTUDIO-LIFE-097: the setting doubleClickToSwitchToEditor is removed, a click keeps
  revealing the source line and a double click has no behaviour of its own. Title, description,
  scenarios and verification change (two settings instead of three); the Known issue line is
  removed. SwRS-MDOKFSTUDIO-LIFE-048, -071, -108, -156 and StRS-MDOKFSTUDIO-LIFE-010 drop the
  setting. SwRS-MDOKFSTUDIO-LIFE-112 (archived) described the removed behaviour and stays as is.
- SwRS-MDOKFSTUDIO-LIFE-094: unchanged. Its Known issue stays: VS Code does not say where a change
  of the active document comes from, and the host knows only the cursor line, so an edit of another
  tool cannot be told from typing without glowing while the writer types.

## 2026-10-26 (table editor polish)

- SwRS-MDOKFSTUDIO-TABLE-055: a column button now edits only the lines it concerns (padding,
  indentation and outer pipes of every line are kept; a new cell takes the style of its neighbour); a
  panel, popover or slash menu belongs to the cell it was opened in and closes when the editor moves to
  another cell or a row or column button is pressed. Two scenarios state both; both Known issue lines
  are removed.
- SwRS-MDOKFSTUDIO-TABLE-102: an unescaped pipe inside a code span splits a cell, as the preview does
  (GFM); a row that then has too many cells is not a pipe table of the editor. The title, the
  description and the code-span scenarios change; the Known issue line is removed here and from
  StRS-MDOKFSTUDIO-TABLE-011.
- SwRS-MDOKFSTUDIO-TABLE-091: a pipe typed inside a code span is written escaped like any other.
- SwRS-MDOKFSTUDIO-TABLE-048: one rule per group (none between Col + and Col −) and the rule of the
  cell formatting group wraps with the group; both Known issue lines are removed.

## 2026-10-26 (one colour grammar for tables and colour spans)

- SwRS-MDOKFSTUDIO-GFM-034: colour spans and raw HTML table styles share one grammar (a closed list
  of colour names, the keywords currentcolor, inherit, initial and unset, hex, rgb/rgba and hsl/hsla in
  comma or space form); a colour span inside a raw table keeps its colour; a
  removed span style records removed-unsafe-style. The behaviour of GFM-031 and TRUST-036 is aligned.
  Gradient stops in table styles narrow from any lowercase word ([a-z]{1,32}) to the closed list plus
  the keywords. No Known issue line described this difference.

## 2026-10-26 (small block editing and palette fixes)

- SwRS-MDOKFSTUDIO-BLOCK-130: AltGr with an up or down arrow in the text box is no move chord; a
  boundary row states it and the Known issue line is removed.
- SwRS-MDOKFSTUDIO-BLOCK-127: the host also refuses a paste after the closing fence line of an
  include directive (a new refusal scenario), so the refusal no longer depends on the page; the Known
  issue line is removed.
- SwRS-MDOKFSTUDIO-PALETTE-183: exactly 20 bibliography files are a complete list and are not marked
  truncated; a boundary row states it and the Known issue line is removed.

## 2026-10-26 (a refused field value no longer stays open next to a block editor)

- SwRS-MDOKFSTUDIO-BLOCK-041: a click on a block or a plus insert point while a field editor holds a
  value now waits for the answer to the field's save; a saved value opens the block editor, a refused one
  is cancelled (the field shows its saved value) and the block editor opens. A new table row and a
  boundary scenario state it; the second Known issue line is removed here and from the superseded
  FMEDIT-002 and FMEDIT-073, and the first one is narrowed to clicks on another field or the background.

## 2026-10-26 (one read-only reason names the real cause)

- SwRS-MDOKFSTUDIO-TRUST-005: every refusal of a read-only preview (edits, comments, threads, block
  moves and clipboard, rename, palette requests) and the tooltip of a disabled checkbox now give the
  one read-only reason: the trust text for an untrusted workspace, the missing-folder text for a file
  outside every workspace folder. The three Known issue lines are removed; the boot context carries the
  reason for the tooltip. Aligned in TRUST-006, -065, -090, FMEDIT-051, MYST-042, PALETTE-148, -183,
  -192, -196, GFM-021 and -026. StRS TRUST-001: the Known issue line about the trust sentence is removed.
- SwRS-MDOKFSTUDIO-TRUST-001: the first load of a read-only page builds its properties table without
  edit cells; the Known issue line is removed and the verification note names the test.

## 2026-10-26 (a refused checkbox toggle is visible and always answered)

- SwRS-MDOKFSTUDIO-GFM-021: the reason of a refused toggle now also shows in a short status note next to
  the box; a toggle in a preview of a file outside every workspace folder names the missing folder. The
  Known issue line is removed here and from the superseded GFM-024 and GFM-026.
- SwRS-MDOKFSTUDIO-GFM-027: a toggle message the validator rejects is answered with a refusal, so the box
  no longer stays busy; the Known issue line is removed.
- SwRS-MDOKFSTUDIO-TRUST-005: the checkbox row of the table gives the two read-only reasons; the Known
  issue narrows to the other request types and the tooltip of a disabled checkbox.

## 2026-10-26 (a failed preference write warns the reader)

- SwRS-MDOKFSTUDIO-LIFE-169: when the workspace storage rejects the write of the theme mode or a view
  preference, the reader now gets one short warning (the choice still holds for the session); the Known
  issue line is removed here, in StRS TOOLBAR-001 and in the superseded LAYOUT-021, and the deprecated THEME-055 scenario and note are aligned, and the verification
  note names the new test.

## 2026-10-25 (Comments button hides the thread chips too)

- SwRS-MDOKFSTUDIO-REVIEW-152: the toolbar Comments button now hides the inline thread chips together
  with the gray chips (TODO chips stay), like the preview.showComments setting. The scenario states
  it and the Known issue line is removed.

## 2026-10-25 (empty YAML schema reported as empty)

- SwRS-MDOKFSTUDIO-FMSCHEMA-023: an empty or comment-only YAML schema file no longer makes the
  analysis throw; the type stays without schema and one informational row reads "schema file '{name}' is empty" (okf-schema wording). The Known issue
  line is removed (also from the superseded FMSCHEMA-025 and from StRS FMSCHEMA-006 and -008) and
  a boundary scenario states the behaviour.

## 2026-10-25 (doc and download roles without a label show their target)

- SwRS-MDOKFSTUDIO-MYST-017: a `{doc}` or `{download}` role written without a label now shows the
  written target as link text (the file name for a download) instead of an empty link; the Known
  issue line about the empty link is removed and the boundary scenario states the new behaviour.

## 2026-10-25 (dollar amounts stay text, as in Sphinx)

- SwRS-MDOKFSTUDIO-MYST-024: the dollar-amounts scenario now states Sphinx's dollarmath rule (an
  opening `$` is not followed by whitespace, a closing `$` neither follows whitespace nor precedes
  a digit): `$5 and $6` stays text and only a real `$x$` span is typeset. The Known issue is
  replaced by two Known issue lines (a price followed by a real span in the
  same paragraph loses the maths; `*a $5 and* $6` shows literal asterisks); the two visual scenarios `myst/v35` and `myst/v36` assert the new behaviour.

## 2026-10-25 (message sender check accepts the webview host frames)

- SwRS-MDOKFSTUDIO-TRUST-059: in a real VS Code webview the host message comes from a frame that is
  neither the parent nor the page's window but has the page's own origin; the page now also accepts a
  same-origin sender other than its opener. Confirmed with a real-window run.

## 2026-10-25 (table row handle reorders the body rows of a table)

- StRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-002 (new): in edit mode each body row of a
  pipe table or `{list-table}` shows the list editor's handle just left of the table, centred on its row;
  dragging it, or Alt+Up and Alt+Down on it, moves the row as one edit of the table text. A
  list-table row moves as a whole item and `:header-rows:` stay fixed. Out of scope and stated as
  refusals: captioned and HTML tables, included tables, the header rows, and any move while an
  editor is open. Verified by unit tests (table model, list-table source, page runtime) and fifteen
  visual scenarios (table-editing v06 to v20); no real VS Code window drag was run.

## 2026-10-25 (page security hardening: sanitizer allow-list, message sender check, no stylesheet link)

- SwRS-MDOKFSTUDIO-TRUST-036: the sanitizer keeps only the elements and attributes of the supported
  rendering (allow-list); others are removed with the diagnostics blocked-element and
  blocked-attribute. Scenario replaced, Known issue line removed.
- SwRS-MDOKFSTUDIO-TRUST-042: a linked stylesheet is removed from the page (the diagnostic that it is
  ignored stays); Known issue line removed.
- SwRS-MDOKFSTUDIO-TRUST-059: the page hands a window message to the host message filter only from
  its parent frame, its own window or an event without a sender; Known issue line removed. The
  sender check cannot be proven without a real webview: covered by a unit test; it still needs one real-window run.

## 2026-10-25 (trust granted: an open Restricted Mode preview becomes writable)

- SwRS-MDOKFSTUDIO-TRUST-001: on a trust grant, an open preview that was read-only only because of
  Restricted Mode moves to a trusted session on the same panel (editing, checkboxes, palette,
  workspace resource and navigation roots), renders once and keeps its reading state. Scenario and
  verification note changed; removed the Known issue line about the preview staying read-only
  (it also covers the former SwRS-MDOKFSTUDIO-LIFE-155). Host-level test only; no real-window run.

## 2026-10-25 (returning to a document restores its reading state)

- SwRS-MDOKFSTUDIO-LIFE-125: switching A, B, back to A restores the focused block, selection, open
  sections and Description state of A (scenario changed, verification notes updated). Removed the two
  Known issue lines and the one of StRS-MDOKFSTUDIO-LIFE-014. SwRS-MDOKFSTUDIO-LIFE-026: its Known
  issue now states only the remaining case (a replaced session starts with an empty map).

## 2026-10-25 (a refused block open keeps its reason and a way out; a refused key move says why)

- SwRS-MDOKFSTUDIO-BLOCK-216: the status line is in the editor frame from the start ("Loading
  Markdown source..."), then holds the refusal reason; the frame of a refused open has a Close
  button and closes on Escape, Close, Refresh or a click on another block. Added a scenario,
  removed the Known issue line. The stale-open reason (out of date render) is now shown.
- SwRS-MDOKFSTUDIO-BLOCK-033, TABLE-034, TRUST-065: removed the Known issue lines about the hidden
  loading text and the stuck cell editor; the table cell region has the same exits.
- SwRS-MDOKFSTUDIO-BLOCK-130, BLOCK-156: a move refused after a key press shows its reason next to
  the bar under the moved block or selection. Removed the Known issue lines.
- StRS-MDOKFSTUDIO-BLOCK-025: removed the Known issue line about the empty frame.

## 2026-10-25 (a link inside a paragraph is followed and opens no editor)

- SwRS-MDOKFSTUDIO-BLOCK-014: in edit mode a click, Enter or Space on a link inside a paragraph
  follows the link only; the text outside the link still opens the editor. Added a row, removed
  the two Known issue lines.
- SwRS-MDOKFSTUDIO-BLOCK-017: hovering such a link no longer outlines the paragraph. Added a row,
  removed the Known issue line.

## 2026-10-25 (a click on another block opens it once the save lands; no second final save)

- SwRS-MDOKFSTUDIO-BLOCK-041: a click on another block while the open editor holds changed text saves
  the first editor and opens the clicked block when that render arrives, without a second click.
  Removed the Known issue line.
- SwRS-MDOKFSTUDIO-BLOCK-047: Done, Ctrl+Enter and the blur post no second final save while the first
  is in flight. Added a scenario, removed the Known issue line.

## 2026-10-25 (a request of an older render is answered, not dropped)

- SwRS-MDOKFSTUDIO-TRUST-065, TRUST-090, BLOCK-216: the render gate answers a request that names an older
  render with the out-of-date reason (block move, block copy, cut and paste, thread, list, picker and
  paste requests, block open, checkbox toggle), so the page clears its pending state and shows it.
  Removed the Known issue lines of TRUST-065 and TRUST-090 and the one of BLOCK-216 about the unanswered open; the open answer clears the pending state, its reason stays hidden (Known issue kept). History, view preference and palette mode messages are no
  requests and stay unanswered.

## 2026-10-25 (every label with an anchor icon can be renamed)

- SwRS-MDOKFSTUDIO-MYST-038: one label name pattern for the icon, the field and the host, so a
  label starting with `_`, `.` or `-` opens the rename field; the invalid-name message no longer
  asks for a leading letter or digit. Added two scenarios (symbol labels, stale render), removed the
  Known issue line.
- SwRS-MDOKFSTUDIO-PALETTE-178: a label starting with a symbol is now listed as a target.
- SwRS-MDOKFSTUDIO-MYST-041, MYST-051: message text and name rule follow; a stale rename is answered.
- SwRS-MDOKFSTUDIO-TRUST-065: a rename from a stale render is answered with the stale-line refusal.
- SwRS-MDOKFSTUDIO-MYST-094 (superseded): removed its Known issue line.

## 2026-10-25 (block edits and insertions keep CRLF and lone-CR line endings)

- SwRS-MDOKFSTUDIO-BLOCK-234: the line breaks inside an edited multi-line block are written with
  the one line ending the block already uses (the text box returns LF). Added a scenario (a block of one
  line takes the document's ending), removed the Known issue line.
- SwRS-MDOKFSTUDIO-BLOCK-094: the insertion planner counts lines by LF, CR LF and CR and inserts
  with CR in a lone-CR document. Added a scenario, removed the Known issue line.

## 2026-10-25 (a soft shadow under the sticky heading band)

- SwRS-MDOKFSTUDIO-TOOLBAR-002 (new): the sticky heading band casts a soft theme-coloured shadow
  while text scrolls under it, none at the top. Added three visual scenarios (light, dark, cream).

## 2026-10-25 (the copy button says Copied only when the text was copied)

- SwRS-MDOKFSTUDIO-CODE-019, CODE-026: the host now answers every copy request (`previewCopyTextResult`,
  ok or a reason); the button shows Copied only on success and the reason otherwise. The size
  limit is answered ("Too large to copy.") instead of dropped. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-TRUST-065: a copy request moves from the render gate to the document gate, so
  typing since the render no longer drops it. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-CODE-020: Copied is shown when the host confirms, not at the click.
- SwRS-MDOKFSTUDIO-CODE-027 (superseded): removed its Known issue line.

## 2026-10-25 (the code-block copy button is reachable with the keyboard)

- SwRS-MDOKFSTUDIO-CODE-017: each copyable code block is now a tab stop; focusing it shows the
  Copy code button, Tab moves to the button, Enter or Space copies. Removed the Known issue line,
  added keyboard and not-a-tab-stop scenarios and a light and a dark focus scenario.
- StRS-MDOKFSTUDIO-CODE-004: said the button also appears on keyboard focus.

## 2026-10-25 (a table inserted with the caret in a table goes after it)

- SwRS-MDOKFSTUDIO-TABLE-106, TABLE-115, TABLE-117: Table, Table with caption and HTML table now
  insert the new table after the table that holds the caret (pipe, `{list-table}` or HTML) instead
  of splitting it. Removed the three Known issue lines and added scenarios.
- StRS-MDOKFSTUDIO-TABLE-012: stated that an inserted table never splits the table at the caret.

## 2026-10-25 (a line break pasted into a table cell becomes a space)

- SwRS-MDOKFSTUDIO-TABLE-091: a line break pasted into the cell text box is now replaced by a
  space, so the source row stays one line. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-TABLE-070: removed the refusal and nothing-recognised scenarios (both
  unreachable now; the dead refusal branch is gone from the button) and the two Known issue lines;
  added a scenario for a pasted line break.
- StRS-MDOKFSTUDIO-TABLE-012: removed the Known issue about a pasted line break and said that
  pasted text cannot split the row.

## 2026-10-25 (dollar amounts in the preview are specified as they render)

- SwRS-MDOKFSTUDIO-MYST-024: added a boundary scenario and a Known issue line: the preview typesets
  the text between two dollar amounts (`$5 and $6`) as inline maths, unlike Sphinx. Added a visual
  scenario pair (light and dark) with a real `$x$` span as control.

## 2026-10-25 (a pasted image removes the leftovers of an interrupted save)

- SwRS-MDOKFSTUDIO-PALETTE-196: the next paste into a folder now deletes hidden `.partial` files of
  the extension's exact naming that are older than 10 minutes (left by a save cut off before its
  rename); newer files and every file of another form are kept. Added a scenario.

## 2026-10-25 (a pasted image that loses a file-name race takes the next name)

- SwRS-MDOKFSTUDIO-PALETTE-196: when another program creates a file under the chosen name
  between the name choice and the rename, the paste now keeps that file and saves the image under
  the next free name (up to 5 attempts) instead of refusing with the raw "file exists" error.

## 2026-10-25 (an include with no path keeps the document rendering)

- SwRS-MDOKFSTUDIO-CORE-012: an `{include}` with an empty argument now leaves the include
  placeholder with a warning on its line, and the rest of the document renders, like the other
  incomplete forms. Changed the refusal table row and removed the Known issue line (also from the
  superseded SwRS-MDOKFSTUDIO-CORE-014).

## 2026-10-25 (watcher ignore list read below the root)

- SwRS-MDOKFSTUDIO-LIFE-044: the ignored build and tool folders (tmp, out, dist...) are now matched
  against the path below the preview's root, so a workspace stored under such a folder refreshes on
  included-file, image, sibling-file and conf.py changes. Changed the refusal table and removed the
  Known issue line.

## 2026-10-25 (palette requests keep working while the block editor is open)

- SwRS-MDOKFSTUDIO-TRUST-065: Reference, Citation, Document link, Image and the Browse of the
  figure form are now answered while the block editor is open on the shown render, although its
  own saves moved the document revision; without an open editor the out-of-date answer stays.
  Added a row to the "older revision accepted" table and removed the Known issue line. Removed
  the matching Known issue lines from SwRS-MDOKFSTUDIO-PALETTE-109, -140, -148 and -150.

## 2026-10-25 (Restricted Mode support declared)

- SwRS-MDOKFSTUDIO-TRUST-001: the manifest now declares `capabilities.untrustedWorkspaces`
  (limited, with the PlantUML engine settings as restricted configurations); the boundary scenario
  and the unit test changed from "no capabilities entry" to that declaration. Removed the
  Known issue lines about a packaged VSIX being disabled in Restricted Mode from
  StRS-MDOKFSTUDIO-TRUST-001, SwRS-MDOKFSTUDIO-TRUST-001, -007 and -011.

## 2026-10-25 (site Requirements page)

- Added SwRS-MDOKFSTUDIO-CORE-069: the Pages site build writes a Requirements page with the
  chain diagram from use case to test and the figures of the okfreq report (active requirements
  only), and degrades to a "not generated" text when the report is missing. Filed in
  `rendering-core`, the closest scope, deriving from StRS-MDOKFSTUDIO-TRUST-014 (maintainer
  builds), because the lowest free `trust-security` number is a retired id.
- Marked at `test/site/requirementsPage.test.ts` (`@tests_req`) and, because the code lives in
  `test/site/`, outside the configured `source_dirs`, at the companion
  `src/core/render/requirementsPage.markers.ts` (`@implements_req`).

## 2026-10-25 (complete baseline)

- Completed the baseline for all 16 scopes: **76 StRS (one per use case) and 364 SwRS (one per
  observable behaviour)**, each with named scenarios (`nominal`, `refusal`, `boundary`), a table
  for equivalent cases, its Known issues as the code behaves, and verification notes that name the
  test of each scenario. 13 cross-cutting rules are written once and cited with `depends_on`:
  the page message envelope, gates, read-only refusal, answer correlation, host message
  acceptance, read-only affordances, edit exclusivity, source edit outcome, palette popovers
  (two) and the view choice store and start. Each palette action and each page and host
  message type has its own SwRS. The guideline "Levels" states these rules.
- Markers: 813 `@implements_req` and 1072 `@tests_req` links (one per requirement per file) in
  `src/`, `sphinx/` and `test/`; stakeholder-validation markers on 69 StRS; the marker companions
  of `editPalette.ts`, `editActions.test.ts` and `okfFrontmatter.test.ts` are folded into their
  hosts. Every SwRS has a test marker and every SwRS that is not declarative has a source marker (3
  declarative SwRS are exempt).
- Retired requirements: 508 are `superseded` by the requirement that now holds their behaviour
  and 8 non-observable ones are `archived`; all are exempt from markers and kept for their ids.
  The 1138 ids below were allocated while the baseline was being written, never published, and
  have no file. **They must never be allocated again** (`okfreq new` takes the lowest free number,
  so create requirements only in a change that deletes none):
  - StRS-MDOKFSTUDIO-BLOCK: 002, 004–005, 007, 009–010, 012–013, 015, 017–024
  - StRS-MDOKFSTUDIO-LIFE: 002, 004, 006, 008–009, 011–013, 015–018, 020, 022–023
  - StRS-MDOKFSTUDIO-PALETTE: 003–004, 006, 008–012, 014, 016–017, 019–027
  - StRS-MDOKFSTUDIO-REVIEW: 002, 004–007, 009–011, 013–014, 016, 018
  - StRS-MDOKFSTUDIO-TABLE: 002–005, 007, 009–010, 013–015
  - StRS-MDOKFSTUDIO-THEME: 001, 003, 005–010, 012–013
  - StRS-MDOKFSTUDIO-TOOLBAR: 002–003, 005, 007–008, 010, 012, 014
  - StRS-MDOKFSTUDIO-TRUST: 002–003, 005, 007–008, 010–011, 013, 015
  - SwRS-MDOKFSTUDIO-BLOCK: 002–011, 013, 015–016, 018–020, 022, 024–025, 027–028, 030–032, 034–040, 043–046, 048–052, 054–057, 059–060, 062–068, 070–076, 078, 080–086, 088–093, 095–101, 103–108, 110–116, 118–123, 125–126, 128, 131–138, 141–147, 149–155, 157–165, 167–168, 170–173, 175–190, 192, 194–204, 206–215, 217–226, 229–231, 246–248, 251, 253
  - SwRS-MDOKFSTUDIO-LIFE: 002, 004–009, 011–017, 019–023, 025, 027–031, 033–037, 040–043, 045–047, 050–054, 056–058, 060–061, 063–068, 070, 072–073, 075–080, 083–088, 092, 095–096, 098–099, 101–107, 109–111, 113–115, 118, 120–124, 126, 128–135, 138–142, 144–148, 150, 152–155, 157–168
  - SwRS-MDOKFSTUDIO-PALETTE: 002–009, 011–016, 018–020, 022–030, 032–035, 037–038, 040–042, 044, 046–047, 051, 055–057, 059–068, 070–071, 073–077, 079–082, 084–085, 087–088, 090–091, 093–108, 110–113, 116–122, 128–129, 131, 134, 139, 141–146, 151–152, 154–159, 161–173, 175–177, 179–182, 184–191, 193–195, 197–202, 204–212, 214–216, 218–228, 230–231, 233–237, 239, 241, 243–251, 253–255, 257–262, 264–274
  - SwRS-MDOKFSTUDIO-REVIEW: 002–003, 005–011, 013–016, 018–020, 022–027, 029–037, 039–043, 045–048, 050–053, 055–064, 066–068, 072, 075–080, 082–085, 087–093, 095–099, 102–106, 108–118, 120–124, 126–132, 134–138, 140–142, 144–151, 153–155, 157–159, 161–166, 168–170, 172–177, 179–185, 187–189, 191, 193–194, 196–199, 201–202, 204–206, 209–213, 215–217
  - SwRS-MDOKFSTUDIO-TABLE: 002–005, 007–012, 014–017, 019–024, 028–029, 031–033, 036–043, 049–054, 056–063, 065–069, 071–072, 075, 077–079, 081–084, 086–090, 092–093, 095–101, 103–105, 107–110, 112–114, 116, 118–129
  - SwRS-MDOKFSTUDIO-THEME: 002–012, 014–015, 017, 019–023, 026–030, 032–033, 035–037, 039–042, 044–054, 057–058
  - SwRS-MDOKFSTUDIO-TOOLBAR: 002–006, 008–012, 014–017, 019–021, 023–024, 026–029, 031–032, 034–036, 038–039, 041–044, 046–053, 055, 057, 060–064, 066–069, 073–076, 078, 080–082, 084, 086–089, 091–093, 095–097, 099–101, 103–112, 114–116, 118–119, 121, 123–125, 127, 129–149
  - SwRS-MDOKFSTUDIO-TRUST: 002–004, 008–010, 013–021, 023–024, 026–035, 037–041, 043–049, 051, 053–054, 056–058, 060, 066–069, 071, 076–085, 087–089
- Verification: `okfreq validate --prose --check-links`, `lint --check`, `update-coverage --check`,
  `okfreq trace` (no missing id, no duplicate), `just check` and `just preflight` pass (440 active
  requirements).

## 2026-10-24 (batch 1)

- Added the first requirements: 27 StRS and 237 SwRS for rendering-core (5 / 68), code-blocks
  (4 / 38), gfm (4 / 38) and myst (14 / 93). Each SwRS derives from a StRS and has a nominal
  and a boundary scenario. No traceability markers yet. Verification: `okfreq validate
  --prose --check-links`, `lint --check` and `update-coverage --check` pass (264 requirements).

## 2026-10-24

- Created the okfreq requirements bundle for the Markdown OKF-Schema Studio: two tiers (StRS,
  SwRS) with the prefixes `StRS-MDOKFSTUDIO` and `SwRS-MDOKFSTUDIO`, 16 scopes mapped to the e2e
  groups of `test/shared/e2eGroups.ts`, the strict StRS coverage mode
  `linked-swrs-and-validation-test`, a local guideline that specializes the okfreq baseline, and
  the checks `just requirements-lint` (part of `just check`) and `just requirements-report`
  (part of `just preflight`). okfreq is a project dependency (`okf-schema` 0.13.0, dependency
  group `requirements`) and runs through `uv run`. No requirement exists yet.
  Verification: `okfreq validate`, `okfreq lint --check` and `okfreq update-coverage --check` pass
  on the empty bundle (see the pull request for the run).

## 2026-10-26

- SwRS-MDOKFSTUDIO-FMSCHEMA-005: the key column of the frontmatter properties table keeps each key
  on one line, takes the width of the longest key up to 40% of the table and cuts a longer key with
  an ellipsis (CR 109). Verification: `just requirements-lint`.
- SwRS-MDOKFSTUDIO-FMSCHEMA-005 (CR 109, round 2): the key column also keeps its width next to a long
  description and a code block in the values, and the Names label never breaks inside the word.
  Verification: `just requirements-lint`.

# Update Log

## 2026-10-28 (find in preview: replace-all check waits for the host)

- SwRS-MDOKFSTUDIO-TOOLBAR-012: the real-window replace-all check now waits for the host's answer
  before reading the status note (it could read the transient "Replacing..."). Test only, no
  behaviour change. Verification: test/integration/findInPreview.test.ts.

## 2026-10-28 (structural keyboard navigation)

- SwRS-MDOKFSTUDIO-BLOCK-254 (new, CR 157): with edit mode on and no editor open, ArrowRight moves
  the keyboard selection one level down (a table to its first cell, an admonition, card or tab to its
  first inner block, the whole page to its first block), ArrowLeft and Escape one level up, the four
  arrows walk the cells of a selected table without wrapping, Escape returns to the table block and
  Enter opens the cell editor; the selected cell is outlined and announced. Verification:
  test/page/modules/structuralCursor.test.ts, test/page/runtimeStructuralNavigation.test.ts, visual
  scenarios block-editing/v20 and v21, test/integration/realInput/blockKeys.ts.

## 2026-10-28 (empty document started from the keyboard)

- SwRS-MDOKFSTUDIO-BLOCK-253 (new, proposed, CR 156): in edit mode on an empty document the Start
  writing button is the keyboard selection (selection marker and ring), Enter and Arrow Down open
  the new-block editor as a click does (also when the focus is on the body, the preview, the
  edit-mode toggle or the button itself), and the hint "Enter to create a new block" sits under it
  in the editor hint typography. The Enter shortcut row of SwRS-MDOKFSTUDIO-BLOCK-041 is unchanged.
  Verification: test/page/runtimeEmptyDocumentStart.test.ts, test/visual/capture_start_hint.py
  (scenarios layout-width/v86 and v87, 700 px).

## 2026-10-28 (a click in a MyST tab panel edits the whole tab item)

- SwRS-MDOKFSTUDIO-MYST-098 (text unchanged, implementation fixed): the blocks inside a tab
  panel carry no source line of their own, so a click on the shown panel in edit mode opens the
  whole `{tab-item}` in the Markdown editor instead of the inner paragraph alone. A table (so no
  row or column handles), a code block, a card, a grid and a nested tab set in an item are no
  blocks of their own either: a click in a nested set edits the outer item. A comment, a TODO
  comment and a THREAD in a panel keep their own source line range, so replying to or deleting
  a thread and anchoring a comment still work. Verification: test/core/render/cardsTabs.test.ts,
  test/visual/cardsTabsScenarios.ts, test/integration/mystBlocksWindow.ts.

## 2026-10-28 (front matter change bars)

- SwRS-MDOKFSTUDIO-REVIEW-215 (new, CR 155, `proposed`, derives from StRS-MDOKFSTUDIO-REVIEW-017,
  relates to SwRS-MDOKFSTUDIO-REVIEW-195 and SwRS-MDOKFSTUDIO-REVIEW-207): a front matter field
  changed or added since HEAD gets its own change bar on its properties table row; a removed
  field adds a range on line 1 so that the table as a whole gets one bar when no row has one.
  Before, the table was the block of line 1 only, so a change in a field showed no bar. The
  approved requirements were not touched. Verification: test/core/frontmatter/frontmatterChanges.test.ts,
  test/core/frontmatter/propertiesTable.test.ts, test/page/modules/incomingChanges.test.ts and the
  visual scenarios review-annotations/v27 and v28.

## 2026-10-28 (five-row floating toolbar)

- SwRS-MDOKFSTUDIO-TOOLBAR-001 and StRS-MDOKFSTUDIO-TOOLBAR-001 (updated, CR 153): the floating
  toolbar has five rows of at most three buttons (Refresh, Edit, collapse; Anchor, Back, Next;
  Theme, Zoom out, Zoom in; Width, Table of contents; Fold, Diff, Comments). It is 102 px wide
  instead of 198 px, and never wider than 134 px, so it no longer covers the column handle strip
  of a table under the first heading in the 1400x900 integration window (boundary scenario,
  checked by test/integration/tableMoves.ts and the width check of the visual layout checks).
- SwRS-MDOKFSTUDIO-TABLE-064 (updated): a table bar that opens under the preview controls at the
  top of the page gives up the width they cover, so its buttons wrap left of them (the taller
  toolbar covered the Delete selected column button of a table under the first heading).
- SwRS-MDOKFSTUDIO-MYST-081 (updated): the warning banner reserve is the three-button width in both
  toolbar states (124 px). SwRS-MDOKFSTUDIO-LIFE-049 (updated): the pending overlay sits 192 px
  from the top under the expanded toolbar.
- SwRS-MDOKFSTUDIO-TOOLBAR-005, SwRS-MDOKFSTUDIO-TOOLBAR-007, SwRS-MDOKFSTUDIO-LIFE-170,
  SwRS-MDOKFSTUDIO-TRUST-001, SwRS-MDOKFSTUDIO-THEME-038, SwRS-MDOKFSTUDIO-LAYOUT-020,
  StRS-MDOKFSTUDIO-THEME-011, StRS-MDOKFSTUDIO-LAYOUT-003 and StRS-MDOKFSTUDIO-LAYOUT-006
  (updated, wording): the Fold button is on row 5, Zoom on row 3, Width on row 4, the collapse
  button hides rows 2 to 5; the read-only toolbar keeps the same five rows with 14 buttons.
- SwRS-MDOKFSTUDIO-TABLE-007 and SwRS-MDOKFSTUDIO-TABLE-002: the scenario rows "the floating
  toolbar lets a table drag through" go with their CSS rule; the narrow toolbar keeps the handle
  strip clear instead (TABLE-007 verification note: the strip is not under the toolbar).
- SwRS-MDOKFSTUDIO-PALETTE-021 (fix to the specified behaviour, verification note): a code block
  taller than the pane, opened scrolled, whose bar sticks under the band (`data-sphinx-palette-top`)
  is no longer revealed by the anchor pass, which scrolled the page up to the reading offset
  (src/page/features/scrollCore.ts). A frame that grows taller than the pane after it opened now
  gives back the distance reserved at open for its stuck bar, so the bar stays attached to the
  frame; at the top of the page the bar's reserve is no longer capped at one bar height, so the
  bar stays above the frame under the taller toolbar (visual palette-slash/v04 and v28;
  src/page/features/editorChrome.ts).
- Approval: the owner (`gaetan@xeberon.net`) approved changing the toolbar requirements for this
  layout on 2026-10-28. None of the requirements changed above is `approved` (all are `proposed`,
  SwRS-MDOKFSTUDIO-TOOLBAR-005 is `draft`), so no `approved_by` / `approved_on` field changes.

## 2026-10-28 (lifecycle meanings, owners and approval locks)

- Moved every `draft` requirement to `proposed` (466 StRS and SwRS): each one is implemented
  and linked, and `draft` now means a proposal not implemented yet. No requirement is
  `approved`: approval is the owner's decision.
- `config.yml` uses the okfreq 0.16 names: `tiers` instead of `levels`, and `lifecycle.field`
  instead of repeating the values, which now come from `base.schema.yaml`. StRS have
  `approval_lock: true`, SwRS `false`; both tiers name the owner, and
  `default_owner_email` is generated into every requirement.
- `base.schema.yaml` describes each lifecycle state and adds `owner_email`,
  `default_owner_email`, `approved_by` and `approved_on`. The installed requirements
  guideline was refreshed with `okfreq init --force`.
- Needs okf-schema 0.16.0 or later: earlier releases reject `default_owner_email` in
  `generated_fields` and do not read `tiers`.

## 2026-10-28 (Vega-Lite and Vega charts, the Full palette mode)

- SwRS-MDOKFSTUDIO-DIAG-121 (new, CR 149): a `vega-lite` or `vega` fence renders, in every palette
  mode, as a chart figure holding the specification text, its kind and a collapsed Chart source
  section. Verification: test/core/render/chartRendering.test.ts, test/core/render/chartData.test.ts,
  test/page/chartCsp.test.ts.
- SwRS-MDOKFSTUDIO-DIAG-122 (new, CR 149): a relative chart data url (csv, tsv, json) is read
  through the include resource policy (workspace, Restricted Mode, symlinks, 5 MiB, 16 files,
  include budget) and handed to the page; a remote url or a refused file shows a message and loads
  nothing. Verification: test/core/render/chartRendering.test.ts, test/core/render/chartData.test.ts,
  test/page/modules/vegaChart.test.ts.
- SwRS-MDOKFSTUDIO-DIAG-123 (new, CR 149): the page draws each chart as one themed SVG picture,
  draws it again on a theme change only, and shows the reason in place of an invalid chart.
  Verification: test/page/modules/vegaChart.test.ts, test/page/modules/chartError.test.ts,
  test/page/chartCsp.test.ts.
- SwRS-MDOKFSTUDIO-DIAG-124 (new, CR 149): the chart runtime script is added only to a page with a
  chart and runs under the unchanged page policy (no unsafe-eval, connect-src none; expressions by
  vega-interpreter). Verification: test/session/diagReq.chart.requirements.test.ts,
  test/page/chartCsp.test.ts (headless Chromium, real policy, no violation),
  test/page/modules/vegaChart.test.ts (eval and new Function refused), test/security/package-contract.test.ts.
- SwRS-MDOKFSTUDIO-PALETTE-265 (new, CR 149): the Full palette mode lists the Vega-Lite chart and
  Vega chart actions in the palette and the slash menu (`/chart`, `/vega`) and no other mode does.
  Verification: test/core/palette/paletteActions.test.ts, test/page/modules/editActions.test.ts,
  test/page/modules/editPalette.test.ts, test/page/modules/slashMenu.test.ts,
  test/page/runtimeEditPalette.test.ts.
- SwRS-MDOKFSTUDIO-PALETTE-001, SwRS-MDOKFSTUDIO-PALETTE-010, SwRS-MDOKFSTUDIO-LIFE-169 and
  SwRS-MDOKFSTUDIO-LIFE-170 (CR 149): the palette modes are strict, gfm, myst and full. The unit
  assertions that listed the three modes (palette select, setting enum in package.json, the
  host message check, the registry order and modes) changed with it; their intent is unchanged.
  Verification: `just requirements-lint`, `just check`.
## 2026-10-28 (the writing skill for Studio)

- SwRS-MDOKFSTUDIO-CORE-073 (new, CR 150): the writing skill `skills/writing-for-markdown-okf-schema-studio/`
  holds only examples that the preview pipeline renders without a diagnostic or an unresolved
  directive, covers every syntax family it lists, and stays a short self-contained folder.
  `requirements/config.yml`: `skills` added to the `source_dirs` of the rendering-core scope, since
  the skill is the implementation (marker in `SKILL.md`). Verification:
  test/core/render/writingSkill.test.ts (4 tests, failing while the skill folder is absent),
  `just requirements-update`.

## 2026-10-28 (real-window scenarios leave edit mode off)

- SwRS-MDOKFSTUDIO-BLOCK-004, SwRS-MDOKFSTUDIO-PALETTE-264 (CR 152): the paste-URL real-window
  scenario left the workspace in edit mode, so the next scenario (windowSwitchKeys) opened its
  preview in edit mode, never clicked the toggle and its arrow keys reached no page. The scenario
  now turns edit mode off again; test/build/integrationEditModeRestore.test.ts checks every
  top-level scenario that turns it on. No product behaviour changed; a known issue is recorded in
  BLOCK-004 (a preview that has just opened holds no keyboard focus in the test window).
  Verification: test/build/integrationEditModeRestore.test.ts, test/integration/windowSwitchKeys.test.ts.

## 2026-10-27 (MyST patches applied in memory, no postinstall)

- SwRS-MDOKFSTUDIO-CORE-070 (CR 135): the three MyST source patches (including the single line
  split per parse) are applied in memory by an esbuild plugin and a Node load hook; the postinstall
  script is gone and nothing is written into node_modules. A package version or content other than
  the reviewed one fails loudly. Verification: test/build/mystSourcePatches.test.ts.
## 2026-10-27 (find and replace in the preview)

- StRS-MDOKFSTUDIO-TOOLBAR-003 and SwRS-MDOKFSTUDIO-TOOLBAR-009 to -012 and -014 (CR 144): new. Cmd/Ctrl+F
  in the preview opens a find bar (the key is taken in the page before VS Code's webview find, and
  left to the text editor and to the fields of an open editor), the matches of the rendered text are
  painted with the CSS Custom Highlight API and walked with Enter, Shift+Enter and F3 (a match in a
  folded section unfolds it), match case, whole word and regular expression, and Replace / Replace
  all edit only the matched source spans through the new page request previewFindReplace (one
  undo step, groups of a regular expression expanded, matches that do not map one-to-one to the
  source skipped and counted, refused in a read-only preview or during an open edit).
  SwRS-MDOKFSTUDIO-CORE-043 is unchanged: the webview find widget stays enabled for the entry
  points that do not go through the page. Verification: unit tests under test/core/find,
  test/core/edits, test/core/protocol, test/page/modules and test/session, the real-window run
  test/integration/findInPreview.test.ts, `just requirements-lint`, real-window screenshots under
  the CR 144 reports.
## 2026-10-27 (fold and unfold sections in the preview)

- StRS-MDOKFSTUDIO-TOOLBAR-002 and SwRS-MDOKFSTUDIO-TOOLBAR-003 to -006 and -008 (CR 143): new. The
  preview folds the sections under its headings: a chevron per heading, the section shortcut, the
  Fold button and the Fold All / Unfold All palette commands, the folds kept per document in the
  webview state (never in the file), unfolding by the browser find and by navigation, and no
  selection or edit of a block in a folded section. SwRS-MDOKFSTUDIO-TOOLBAR-001 and
  StRS-MDOKFSTUDIO-TOOLBAR-001 now list the Fold button (14 buttons, 6 in row 3). Verification:
  unit tests under test/core/state, test/page/modules, test/session and test/security, the Chromium
  check check_heading_fold in test/visual/capture_layout_checks.py, `just requirements-lint`, real-window
  screenshots under the CR 143 reports.

## 2026-10-28 (MyST cards, tabs and version titles)

- SwRS-MDOKFSTUDIO-MYST-100 (new, CR 148): a standalone `{card}` renders like a grid card, with its
  `:header:` / `:footer:` options and `^^^` / `+++` separators (header first), `:link:` and the safe
  names of `:class-card:` (also taken by `{grid-item-card}`). Verification:
  test/core/render/cardsTabs.test.ts, screenshot scenarios myst/v41 and myst/v42, test/integration/mystBlocksWindow.ts.
- SwRS-MDOKFSTUDIO-MYST-098 (new, CR 148): `{tab-set}` / `{tab-item}` render a tab bar with ARIA tab
  roles, one panel shown (the `:selected:` item, else the first), `:sync:` and `:sync-group:` kept as
  attributes, and every tab item a mapped block that edit mode edits on its own lines. The sanitizer
  is unchanged. Verification: test/core/render/cardsTabs.test.ts, test/integration/mystBlocksWindow.ts.
- SwRS-MDOKFSTUDIO-MYST-099 (new, CR 148): click, arrows, Home and End select a tab and move the
  focus, synced tabs follow, the page keeps the choices over a content patch. Verification:
  test/page/modules/tabs.test.ts, screenshot scenario myst/v43, test/integration/mystBlocksWindow.ts.
- SwRS-MDOKFSTUDIO-MYST-001 (CR 148): the version admonitions are titled "Added in version X",
  "Changed in version X" and "Deprecated since version X" without a trailing colon; the superseded
  SwRS-MDOKFSTUDIO-MYST-011 and SwRS-MDOKFSTUDIO-CORE-061 follow. The existing unit assertions
  changed with it (the three titles lost their colon).
  Verification: test/core/render/mystFeatures.test.ts, test/core/render/cardsTabs.test.ts,
  `just requirements-lint`.

## 2026-10-27 (worker-thread render, abort and adaptive debounce)

- SwRS-MDOKFSTUDIO-LIFE-004 (new, CR 135): in the VS Code host the MyST render runs in a worker
  thread; an aborted render terminates its worker at once, and a worker that cannot start leaves
  renders in-process. SwRS-MDOKFSTUDIO-LIFE-039: the wait after the last edit is 40 ms or twice the
  last render time (at most 1 s), and a running render that has run more than 1 s and twice the
  wall-clock time of the last render is aborted when a newer render is due. Verification: test/node-services/renderWorker.test.ts,
  test/node-services/build/buildQueue.test.ts, test/core/render/renderPipeline.test.ts,
  `just requirements-lint`.

## 2026-10-27 (lifecycle and typing nits)

- SwRS-MDOKFSTUDIO-REVIEW-012: the watch of the comments file disposes its three subscriptions with
  the watcher when the preview shows another document or closes. SwRS-MDOKFSTUDIO-TOOLBAR-079: a
  rescan unobserves the links the replaced content detached. SwRS-MDOKFSTUDIO-MYST-081: the memory
  of closed warning banners keeps at most 200 documents. SwRS-MDOKFSTUDIO-LIFE-156: a boot element
  that is not a JSON object reads as an empty boot context (CR 135). Clipboard events of the paste
  modules are typed. Verification: unit tests named in the four requirements, `just requirements-lint`.

## 2026-10-27 (one line split per parse of directives)

- SwRS-MDOKFSTUDIO-CORE-070 (new, CR 135): the postinstall patch of markdown-it-myst splits the
  source into lines once per parse instead of once per directive fence; the tightness of each
  directive is unchanged and the parse of a 55k-line document is about 5 times faster.
  Verification: test/build/mystSourcePatches.test.ts, `just requirements-lint`.

## 2026-10-27 (the Edit button is greyed with the reason in a read-only preview)

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview (untrusted workspace, or a file outside every
  workspace folder) keeps the Edit button, greyed (`aria-disabled`), with the reason as tooltip,
  instead of hiding it; the toolbar always holds 13 buttons. CR 126. StRS-MDOKFSTUDIO-TOOLBAR-001,
  SwRS-MDOKFSTUDIO-BLOCK-001 and SwRS-MDOKFSTUDIO-LIFE-170 reworded. Unit, integration and visual
  checks changed with it.

## 2026-10-27 (table handle drop zone)

- SwRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-007: while a row or column handle is held, the
  whole table and the strip of the handles are a drop zone; the marker shows on the nearest gap, follows
  the pointer and goes when it leaves the zone (CR 128). Unit tests and the real-window suite
  `test/integration/tableMoves.ts` cover it. Verification: `just requirements-lint`.

## 2026-10-27 (block actions follow the keyboard selection)

- SwRS-MDOKFSTUDIO-BLOCK-109: the plus and the up and down arrows show on one block, the one that
  moved last (the keyboard selection or the hovered block); a pointer move takes them back and
  removes the selection outline. A page unit test, a style test and a real-window test (cream and
  dark) cover it, CR 130.

## 2026-10-27 (code blocks: Dark+ highlighting, dark background, line numbers)

- SwRS-MDOKFSTUDIO-CODE-039 (new): blocks of two lines or more are numbered by the setting
  `preview.codeBlocks.lineNumbers` (on by default); the numbers are generated content, never copied;
  a MyST `:linenos:` or `:lineno-start:` block is numbered whatever the setting says.
- SwRS-MDOKFSTUDIO-CODE-040 (new): code blocks are drawn on the Dark+ background with the Dark+ token
  colours in every preview theme, by the setting `preview.codeBlocks.darkBackground` (on by default);
  off keeps the theme background with the Light+ colours.
- SwRS-MDOKFSTUDIO-CODE-001, CODE-005, CODE-007 and CORE-028: highlight.js is replaced by Shiki (VS Code
  TextMate grammars, JavaScript regular expression engine, no WebAssembly, colour classes instead of
  inline styles); every block of two lines or more is wrapped into lines; the YAML link-colour override
  is removed because YAML has its own token colours; comments are no longer italic (as in Dark+).
  Unit tests and the cream, white and dark visual scenarios (code-blocks v19 to v23) cover it. CR 131.

## 2026-10-26 (unclosed directives render as raw text)

- SwRS-MDOKFSTUDIO-MYST-096 (new): a directive or fence the parser cannot build (an unclosed or
  empty `{list-table}` or `:::{table}`) shows its own lines as a code block and the rest of the
  document renders, instead of the render failing. Unit tests and the cream and dark visual
  scenarios cover it.

## 2026-10-26 (edit bar tooltips and rule hit area)

- Added `SwRS-MDOKFSTUDIO-PALETTE-002` (every edit bar button carries the slide-in tooltip; the rule button
  is drawn as three dashes) and `SwRS-MDOKFSTUDIO-BLOCK-002` (a horizontal rule has a 25 px hit area), CR 112.

## 2026-10-26 (table cells keep a usable width in edit mode)

- SwRS-MDOKFSTUDIO-TABLE-006: in edit mode every table cell is at least 8em wide (an empty new
  column stays clickable) and the cell being edited at least 300 px wide; the reading view is
  unchanged. A style unit test and the visual cell-editor check cover it. Round 2: a real-window
  test (cream preview on a dark VS Code theme) adds a column with the toolbar, saves it, opens its
  empty header and measures the empty column (8em) and the edited cell (300 px, editor inside).

## 2026-10-26 (table bar inserts before and after, and works on a list-table)

- SwRS-MDOKFSTUDIO-TABLE-003, -004 and -005 (new): Row above, Col left, and the row and column
  buttons on a plain `{list-table}`. SwRS-MDOKFSTUDIO-TABLE-055: a row or column button now saves
  the table and has the page render it again before the editor reopens in the new position; it no
  longer leaves the editor over a cell that shows another cell's text (Col + wiped the title of the
  selected column). SwRS-MDOKFSTUDIO-TABLE-048 lists seven buttons; SwRS-MDOKFSTUDIO-TABLE-001
  keeps the raw editor for a list-table that is not plain.

## 2026-10-26 (table column handles, row moves with a cell editor open)

- SwRS-MDOKFSTUDIO-TABLE-007 (new, derived from StRS-MDOKFSTUDIO-TABLE-002, which now covers
  columns): a handle above each column of a pipe table or a `{list-table}` moves the column in
  every row, by drag or Alt+Left and Alt+Right.
- SwRS-MDOKFSTUDIO-TABLE-002: a row handle now moves its row while a cell editor of the same table
  is open (the known issue "a move needs every editor closed" is removed); the real-window suite
  drags with the mouse.
- SwRS-MDOKFSTUDIO-TABLE-001: a click on a cell of a table the cell editor cannot read (a
  `{list-table}`) opens the raw editor after the hidden table, in view. Before, the frame stayed
  inside the hidden table and the table seemed to vanish. The webview regression and the
  real-window round trip fail with the old code.

## 2026-10-26 (Enter in the image alt text validates it)

- SwRS-MDOKFSTUDIO-BLOCK-069: Enter in the alt text of a Markdown image (selected after a paste or
  a pick, or typed in) keeps the alt text and moves the caret just after the image instead of
  replacing the selection by a line break. Runtime and unit tests, and the visual scenarios
  palette-slash/v22 to v24 (cream and dark), fail on the previous code.

## 2026-10-26 (edit mode follows VS Code undo, redo, select-all and delete-line keys)

- SwRS-MDOKFSTUDIO-BLOCK-003 (new): in a block or table-cell text box, undo, redo, select all and
  delete line are contributed VS Code key bindings on the `markdownOkfSchemaStudio.previewEditing`
  context, so a rebinding applies. SwRS-MDOKFSTUDIO-BLOCK-069: its undo, redo and select-all rows now
  distinguish the block and cell text boxes from the frontmatter fields.

## 2026-10-26 (keyboard-only block editing)

- SwRS-MDOKFSTUDIO-BLOCK-004 (new): in edit mode, plain Up and Down select and move a one-block
  selection, Enter opens the selected block, and Escape or Cmd/Ctrl+Enter leave the edited block
  selected. Unit tests and the cream and dark visual scenarios cover it.

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
- SwRS-MDOKFSTUDIO-PALETTE-021 (CR 123): the block edit toolbar never covers the first lines of the
  editor or the panels in it: the frame reserves the distance the sticky palette rides down in a
  narrow pane, the page scroll that keeps the text in place stops at the host's top, and a tall block
  opened in its middle scrolls the first line seen under the sticky band below the stuck bar.
  Verification: visual scenarios palette-slash/v27-palette-clears-content-cream-1100 and
  palette-slash/v28-palette-clears-text-rule-cream-900, `just requirements-lint`.
- SwRS-MDOKFSTUDIO-PALETTE-021 (CR 123, rework): a block taller than the viewport keeps the clicked
  text in place and its bar sticks at the top of the pane (under the sticky band when the floating
  toolbar overlaps only the bar's empty end), covering the first lines; no reserve and no opening
  scroll-up for it; the caret at the end of a large paste is brought into view whether the bar is
  stuck or not. Verification: real-window test test/integration/tallBlockScroll.test.ts, visual
  scenario palette-slash/v27-palette-clears-content-cream-1100, `just requirements-lint`.

## 2026-10-27

- SwRS-MDOKFSTUDIO-BLOCK-004 (CR 129): the keyboard block navigation also works while the page itself
  (body or content root) holds the focus, the page shows no focus ring, and a window or tab that
  comes back restores the block selection. Verification: `just requirements-lint`.
- SwRS-MDOKFSTUDIO-PALETTE-021 (CR 134): a paste into an open block editor keeps the page where the
  writer is: the scroll of the text editor to the edit the autosave applied does not move the page
  (until 750 ms after the edit settled); wording of the sticking line under the band corrected.
  Verification: test/session/toolbarReq.requirements.test.ts, real-window test
  test/integration/tallBlockScroll.test.ts, `just requirements-lint`.
- SwRS-MDOKFSTUDIO-MYST-097 (new, CR 135 T20): code fences and front matter are read by one shared
  primitive (`src/core/syntax/markdownSyntax.ts`): a fence opens at up to three spaces of indent and
  closes only with a matching fence followed by white space; front matter is a first-line `---`
  closed by `---` or `...`. Verification: test/core/syntax/markdownSyntax.test.ts.
- SwRS-MDOKFSTUDIO-REVIEW-003 (CR 140, new): in edit mode an opened comment is titled with its
  literal tag in code font, `<!-- -->` or `<!-- TODO -->`; SwRS-MDOKFSTUDIO-REVIEW-139 widened: a
  comment starting with `todo` in any case is a TODO comment. Verification:
  test/core/render/commentMarkers.test.ts, test/core/render/blockTagTitle.test.ts, real-window
  scenario test/integration/commentTitleWindow.ts.

- SwRS-MDOKFSTUDIO-CORE-071 (CR 141, new): README-style HTML (`div` and `p` with `align`, `br`, `img`
  with size, `a` around `img`, `picture` with colour-scheme sources that follow the preview theme,
  `details`, `kbd`, `sub`, `sup`) renders like on GitHub, Markdown after a blank line inside an HTML
  block is rendered, and in edit mode each HTML block is titled with its literal opening tag; no
  new sanitizer attribute. Verification: test/core/render/mystRawHtml.test.ts,
  test/core/preview/previewStyles.test.ts, real-window scenario test/integration/readmeHtmlWindow.ts.

- SwRS-MDOKFSTUDIO-CORE-072 (CR 142, new): a paragraph made only of `[TOC]` or `[[_TOC_]]` (any case),
  or a MyST `{contents}` directive (`:depth:`, `:local:`), renders the headings of the document as a nested list of links to heading ids (duplicate texts get
  `-1`, `-2`; includes are left out; the list is generated and never written to the file), and in
  edit mode the block is an admonition-like frame titled with the literal marker (`[TOC]`, `[[_TOC_]]` or the `{contents}` line). Verification:
  test/core/render/mystToc.test.ts, real-window scenario
  test/integration/tocWindow.ts.
- SwRS-MDOKFSTUDIO-PALETTE-003 (CR 142, new): the Table of contents palette action and the `/toc`
  slash entry insert a `[TOC]` line after the current line, in every mode. Verification:
  test/page/modules/tocAction.test.ts.
- SwRS-MDOKFSTUDIO-PALETTE-264 (new, CR 145): a plain-text http, https or mailto address pasted into
  the block text box becomes `[text](url)` over a selection, an autolink alone or an image for a
  picture address; Cmd/Ctrl+Shift+V, rich text, other schemes and code stay native. Verification:
  test/page/modules/pasteUrl.test.ts, test/page/runtimePaletteActions.test.ts,
  test/integration/pasteUrl.test.ts, `just requirements-lint`.

## 2026-10-28

- SwRS-MDOKFSTUDIO-LIFE-039, SwRS-MDOKFSTUDIO-LIFE-062, SwRS-MDOKFSTUDIO-FMSCHEMA-067 (CR 135 T24,
  pure refactor, behaviour unchanged): the render queue moved to `src/core/render/buildQueue.ts`
  (host-neutral); the session layer reaches the canonical path, the source check, the user name, the
  render queue and the direct watches of linked targets through the `HostPaths`, `RenderQueues` and
  `LinkedTargetWatcher` ports (Node implementations in node-services, in-memory ones in host-memory);
  `fileLinkTypes.ts` breaks the `fileLinks` / `okfFrontmatter` cycle; the session-to-node-services
  exception list of `.dependency-cruiser.cjs` is empty. Verification:
  test/host-memory/memoryHostSession.test.ts, `just check-boundaries`, `just check`.
- SwRS-MDOKFSTUDIO-FMSCHEMA-046, SwRS-MDOKFSTUDIO-LIFE-004, SwRS-MDOKFSTUDIO-LIFE-038,
  SwRS-MDOKFSTUDIO-LIFE-039, SwRS-MDOKFSTUDIO-LIFE-049, SwRS-MDOKFSTUDIO-LIFE-071,
  SwRS-MDOKFSTUDIO-LIFE-094, SwRS-MDOKFSTUDIO-TABLE-076, SwRS-MDOKFSTUDIO-TABLE-080,
  SwRS-MDOKFSTUDIO-TRUST-001, SwRS-MDOKFSTUDIO-TRUST-007, SwRS-MDOKFSTUDIO-TRUST-022 (CR 135 T26,
  pure refactor, behaviour unchanged): the 700+ line modules are split and their `@implements_req`
  markers moved with the code: `fileLinkAnnotations.ts` (out of `fileLinks.ts`),
  `pageDocument.ts` (the page-document base class of `rendering.ts`), `tableConversion.ts` (out of
  `markdownTable.ts`), `sessionFactory.ts` (session creation out of `previewManager.ts`); the
  message types of `pageToHost.ts` and the types of `editPalette.ts` moved to
  `pageToHostMessages.ts` and `editPaletteTypes.ts` (no markers). Requirement texts unchanged; only
  the generated source lists. Verification: `just requirements-update`, `just check`.

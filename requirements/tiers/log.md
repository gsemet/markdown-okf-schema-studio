# Update Log

## 2026-11-26

### Scenarios and markers of the requirements main added (CR-504, after the rebase)

- Changed (scenario headings and `scenarios:`, all `proposed`, no scenario text or normative text changed): the scenario blocks that main added without an id are numbered and moved after the last numbered one: SwRS-MDOKFSTUDIO-DIAG-121 S4, SwRS-MDOKFSTUDIO-DIAG-123 S4 to S6, SwRS-MDOKFSTUDIO-LAYOUT-023 S8. SwRS-MDOKFSTUDIO-CORE-096, added by main, declares S1 to S5 in heading order.
- Changed (markers, no test changed): the `@tests_req` markers of main's tests for SwRS-MDOKFSTUDIO-DIAG-009, DIAG-121, DIAG-123, DIAG-128, LAYOUT-023 and CORE-096 name the scenario the test checks. A test that checks no declared scenario has its marker removed (a rule of the chart view cache, the place of the hover box, a chart input binding, the chart runtime, a Mermaid figure that is not a code block, the markup and the escaping of the gallery page). The DIAG-123 S2 line of the chart error style test is removed: that test checks no redraw on a theme change.

## 2026-11-25

### StRS paths and SwRS scenarios on okfreq 0.18 (CR-504, first layer)

- Bumped okf-schema to 0.18.1 and the bundle schemas to its declarations (`scenarios:`, `accepted_in_files`, the StRS acceptance waiver fields); `markers.accepts` is `@accepts_req` and `accepted_in_files` is a generated field. `strs_test_coverage_mode` is unchanged (`linked-swrs-and-validation-test`).
- Added (`proposed`): SwRS-MDOKFSTUDIO-CORE-097 (the marker check reads the scenarios of every requirement and refuses an undeclared, missing or unexpected `#S<n>` fragment, an `@accepts_req` on the wrong bench or on a SwRS, and a `@tests_req` StRS marker under `test/integration/`), derived from StRS-MDOKFSTUDIO-CORE-007. Reason: CR-504; the new-mode fragment rules are enforced while the bundle is still in the old mode.

### Scenarios declared on okfreq 0.18 (CR-504, second layer)

- Changed (all 16 groups): every live requirement that is not exempt declares `scenarios:` (`id: S<n>` and a `title`). A SwRS scenario heading is `### Scenario S<n> (<kind>): <title>`; a StRS path heading is `#### Path S<n>: <title>`; the ids follow the heading order. The titles come from the existing headings (Q24, Q31, Q38 agreements; D2 to D4), a requirement without a heading gets `S1` from its body. The wording of the behaviour is not changed.
- Changed: the `approved_at` field of the 15 approved StRS is set to 2026-11-25T15:37:43+01:00 (`approved_by` kept), as the 0.18 schema asks; their text is not changed.
- Added: `### Main paths` and `scenarios:` for StRS-MDOKFSTUDIO-BLOCK-027 (copy a selection verbatim; copy a selection that an edge cuts inside a construct), StRS-MDOKFSTUDIO-TRUST-012 (read a text of the preview; find the Studio in the Extensions view) and StRS-MDOKFSTUDIO-TRUST-014 (install and package from pinned dependencies). They state what the extension does today and cite only SwRS that derive from the StRS. Reason: CR-504, D6; the StRS had no path. Round 3: TRUST-014 first had a second path (lint and draw the use case diagrams) citing SwRS CORE-090 and CORE-087; it does not fit a StRS about pinned dependencies and the package, so the path and its scenario are removed and the StRS says in its rationale that those two SwRS are build-time checks no path cites.
- Changed (markers, no requirement text): every `@tests_req SwRS-...` marker of these groups names its scenario (`#S<n>`, one marker per line). A first pass chose the scenario by a keyword match between the scenario titles and the test, with `S1` when nothing matched. Round 3 of CR-504 re-read 486 of the weakest matches (the test, against the scenario titles): 142 were kept, 206 moved to the scenario the test exercises, and 136 had no fragment line left because the test checks no declared scenario (the marker block is removed; the SwRS keeps its other markers, and the scenarios left with no marker are listed in the CR evidence as uncovered). The matches that were not flagged weak (a SwRS whose scenarios are only the generic "Nominal case" and "Boundary cases") were not re-read. The two exempt SwRS (TRUST-070, TRUST-075) keep fragmentless markers and declare no scenario.
- Changed (markers): each `@tests_req StRS-...` marker of these groups was sorted. A path walked in real VS Code became `@accepts_req StRS-...#S<n>` (or `@tests_req` for a path walked on the simulated bench; StRS-MDOKFSTUDIO-TRUST-014 is accepted under `test/security`, D7). A snapshot, a partial path or a duplicate of a SwRS marker was removed; its SwRS markers stay. `strsTestsInIntegration` shrank accordingly in `scripts/marker-baseline.json`.
- Changed (metadata only): SwRS-MDOKFSTUDIO-LIFE-174, LIFE-182, LIFE-183, LIFE-184 and LIFE-185, archived by CR-477, get a specific `exemption_reason` (the generic "Archived. Another requirement specifies this behaviour" text is gone). SwRS-MDOKFSTUDIO-CORE-097 scenario headings use the `Scenario S<n>` form.
- Owner note (SwRS-MDOKFSTUDIO-CORE-097, added by the first layer of this CR and still `proposed`): it is a new requirement written by the agent, not one you reviewed. It sets the marker rules above (fragment declared, required or unexpected; `@accepts_req` placement; no StRS `@tests_req` under `test/integration/`; at most three IDs per marker block). Please read it before the pull request is merged.

- Changed (round 3, tooling and docs): the requirements viewer shows the scenario id (`S<n>`) beside each scenario and the path id in the path legend and headings, and reads a `#### Path S<n>:` heading (it had read the id as part of the title); `scripts/check-marker-companions.mjs` also refuses an `@implements_req` with a fragment (`implements-fragment`); the mutation report reads `@tests_req <ID>#S<n>` markers; the project guidelines gain "Scenario and path markers" and use `#### Path S<n>:` in the format.
- Changed (round 4, viewer, trace and skills): SwRS-MDOKFSTUDIO-CORE-069 gains scenarios S5 (the cards "StRS paths tested", "StRS paths accepted", "StRS covered" and "SwRS scenarios tested", and the area columns "Paths tested" and "Paths accepted", replacing the card "StRS with a stakeholder validation test") and S6 (no trace file: the counts of declared paths and scenarios stay, the tested and accepted counts read n/a); SwRS-MDOKFSTUDIO-CORE-080 gains S3 (a use case page lists each path with its tested and accepted files) and S4 (a waived path shows the waiver and its reason); SwRS-MDOKFSTUDIO-CORE-082 gains S5 (a behaviour page lists the tests of each scenario and marks an untested one "missing"). All three are `proposed`, no approved requirement is touched. The viewer reads `scenarios:` and `out/reports/requirements/requirements-trace.json` (`okfreq trace requirements --json`, `scenario_markers` by id and fragment), which `just requirements-report` and `just requirements-report-json` now write. Skills `.agents/skills/okfreq` and `okfreq-gardening` and `requirements/guidelines/requirements.guidelines.md` are refreshed from okf-schema 0.18.1 (`okfreq install-skills`, `okfreq init`); `okfreq-baseline.guidelines.md` matches no okf-schema file and is left as is; the skill gains a "Studio benches" note and CONTRIBUTING the bench convention (Q28, D7). `requirements/guidelines/project.guidelines.md` gains the sections "Benches" (Q28, the D7 exceptions; the acceptance layout is added by the acceptance CR) and "Scenarios of a SwRS" (its heading form overrides the one of the shared guideline), and "Main paths of a StRS" shows the `scenarios:` block; the skill note points to "Benches". No requirement changed by this.
- Changed (round 5, inspection fixes): the statements, frontmatter descriptions and verification notes of SwRS-MDOKFSTUDIO-CORE-069, CORE-080 and CORE-082 now cover the scenarios added in round 4 and name their tests. SwRS-MDOKFSTUDIO-CORE-080 S3 says what a use case page shows without a trace file, and S4 that a waived path shows its reason with or without one: the viewer showed the badge without the reason when the trace file was missing, now fixed, with the test "a waived StRS shows the waiver and its reason on each path without a trace file". All three are `proposed`, no approved requirement is touched. The hint of the use case page names the acceptance outside VS Code (the release, the site, the built VSIX), and CONTRIBUTING says that a `@tests_req` or `@accepts_req` needs a fragment on a declaring target and has none on another. `requirements/guidelines/project.guidelines.md` ("Main paths of a StRS") no longer limits a StRS to three paths nor lets one have no section: every in-force StRS has at least one path (all 95 do; StRS-MDOKFSTUDIO-LIFE-023 has four).
- Changed (round 6, verification fixes): SwRS-MDOKFSTUDIO-CORE-097 states the `implements-fragment` rule in its normative text and frontmatter description, with the new scenario S7 (refusal: "An implementation marker names a scenario"); its test in `test/build/checkMarkers.test.ts` is marked `#S7` (it was `#S3`, which is about a missing or unexpected fragment). The check already refused it; no code changed. It stays `proposed`, no approved requirement is touched.
- Changed (rounds 6 and 7, markers, no requirement text): the StRS marker sort was redone, each test read against the declared path. A StRS marker stays only where the test walks that whole path (every step through the product, every named outcome asserted; in doubt it is removed): `@tests_req StRS-...#S<n>` on the simulated bench, `@accepts_req StRS-...#S<n>` under `test/integration/`. Round 6 restored markers on simulated walks; round 7 re-read all 109 marker lines then kept or restored, removed 83 and kept 26 (19 `@accepts_req`, 7 `@tests_req`), which cover 23 of the 156 declared paths. No StRS is accepted outside `test/integration/` any more, so the marker bullet above saying StRS-MDOKFSTUDIO-TRUST-014 is accepted under `test/security` no longer holds (the D7 allow-list itself is unchanged). This sort leaves the SwRS markers as they were; `scripts/marker-baseline.json` is lowered for the files whose marker blocks got shorter.

### Retired SwRS are exempt from markers

- Changed (metadata only, no body text): 97 retired SwRS (92 superseded, 5 deprecated) that were not exempt get `annotation_exemption: true` and an `exemption_reason` in the existing form (`Superseded by SwRS-...; no marker expected.` or `Archived. ...`). Reason: CR-504, D5; okfreq counts every non-exempt SwRS as a coverage target of its StRS whatever its lifecycle, against the project convention. None of the 97 is approved.

### Vega charts: live view with a hover detail (CR-503)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-DIAG-123 (a chart is a live SVG view, no image; a hover box lists the fields of the mark: Vega-Lite by default, a full Vega chart only where its spec encodes a tooltip, none for `"tooltip": null`; no event binding), DIAG-009 (a detached chart view of the same source and theme is shown again, 16 views, finalized only when detached), DIAG-128 (an exported chart is its inline SVG with local gradient references, no hover box, no script), StRS-MDOKFSTUDIO-DIAG-015 (Path 1 step 3 wording)
- Reason: the owner wants to read the value under a chart mark; the picture was a static image; verified by the real-window scenario `live-chart` (test/integration/realInput/liveChart.ts, DIAG-123 verification notes)

### Vega charts: readable text, no Chart source in the preview (CR-502)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-DIAG-123 (legend, axis and title sizes follow the body text size, discrete x labels horizontal, subtitle in the label colour, a spec's own config wins; the error message is "Unable to render the chart." and no Chart source is shown in the preview), DIAG-121 (the preview hides the collapsed Chart source section and the HTML export shows it, closed), StRS-MDOKFSTUDIO-DIAG-015 (Path 1 step 1 wording)
- Reason: the owner found the chart text too small, legends first, and the source section repeats the document in the preview

### Gallery: a stable link for each screenshot (CR-506)

- Added (`proposed`): SwRS-MDOKFSTUDIO-CORE-096 (each screenshot of the site gallery has its own stable URL, `gallery.html#<capture id>`), derived from StRS-MDOKFSTUDIO-CORE-008
- Reason: a screenshot of the gallery could not be linked, bookmarked or reloaded, and Back left the gallery

### Auto width: a code block fits its longest line (CR-508)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-LAYOUT-023 (in Auto a code block is widened until its longest line fits, its border and a caption bar included; an overflowing code block has no 1 px tolerance; nested code blocks stay a Known issue)
- Reason: the measure used `scrollWidth`, which leaves out the borders while the breakout sets the border box, so a widened code block kept a 2 px scroll bar (and an overflow of up to 3 px was not widened); a captioned code block overflows inside its `pre`, so its figure never broke out
- Tests: test/page/runtimePageControls.test.ts (T10b code block cases), test/page/codeBlockBreakout.test.ts (real browser)

## 2026-11-24

### Site: feature clips play as video

- Added (`proposed`): SwRS-MDOKFSTUDIO-CORE-095 (the published site plays a feature clip as a looping video where a page shows its GIF), derived from StRS-MDOKFSTUDIO-CORE-008
- Reason: CR-482; the feature clip kit and its first clip, the raw copy with `balanceEdges` on

### Raw copy: edge balancing (opt-in)

- Added (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-278 (the opt-in setting `preview.rawCopy.balanceEdges`), BLOCK-279 (inline constructs), BLOCK-280 (containers), BLOCK-281 (code blocks), BLOCK-282 (tables), BLOCK-283 (list items), BLOCK-284 (headings), BLOCK-285 (definitions, HTML blocks, footnote definitions), BLOCK-286 (an unplaced edge snaps to its element)
- Changed (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-272 (an unplaced edge no longer leaves the copy native), BLOCK-273 (adds nothing at an edge while the setting is off; on, see BLOCK-278)
- Reason: CR-481; the cut stays verbatim by default and a writer opts in to a balanced copy
- Code block line numbers no longer count as page chrome in the raw copy, so an edge in a code block is placed (setting off or on)

### Open Studio at a searched line (CR-483)

- Added (`proposed`): SwRS-MDOKFSTUDIO-LIFE-196 (a link, Back or Next from a Studio tab opens the target at its line or anchor and reveals a Studio tab open in any group), LIFE-197 (the history of a link followed from a Studio tab: shared with a created tab, appended to an existing one, nothing for a text editor), LIFE-198 (the command Open in Studio at This Line opens a Studio tab at the caret's line and keeps the text tab). Changed: SwRS-MDOKFSTUDIO-LIFE-181 (any session, not only the side preview, holds a requested line), SwRS-MDOKFSTUDIO-TOOLBAR-059 (Studio tab rule in the refusal rows), StRS-MDOKFSTUDIO-LIFE-023 (title, statement, rationale). Reason: a link or Back in a Studio tab lost its line, and the reader had no explicit way to open Studio at a line.

### Raw copy of a selection (CR-480)

- Added (`proposed`): StRS-MDOKFSTUDIO-BLOCK-027 (a reader copies a selection as the exact Markdown under it), SwRS-MDOKFSTUDIO-BLOCK-271 (the host gives the page the source text of the render), BLOCK-272 (scope and native cases), BLOCK-273 (edge mapping and verbatim cut), BLOCK-274 (generated and included blocks whole), BLOCK-275 (Select all copies the whole source), BLOCK-276 (no chrome, no old side), BLOCK-277 (text/plain and text/html). Changed: SwRS-MDOKFSTUDIO-BLOCK-166 refusal row and StRS-MDOKFSTUDIO-BLOCK-016 constraint (a native selection is copied by the raw copy). Reason: Ctrl+C of a selection gave the rendered text, not the Markdown under it.

## 2026-11-23

### One blank-line block per extra blank line (CR-476)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-266 (each shown blank line is one blank-line block: N-1 between two blocks, every line at the end of the body, at line 1 and in a body of only blank lines; quote runs never show their first line), BLOCK-267 (arrows stop on each block), BLOCK-268 (the text replaces that one line, a separator only where needed), BLOCK-269 (Delete removes that one line; selection after it), BLOCK-265 and BLOCK-004 scenarios. StRS-MDOKFSTUDIO-BLOCK-011 amended (Path 3) and approved. Reason: a run of six blank lines showed one block and a delete removed all of them.

### Open Preview and Refresh Preview complete once the page shows the document (CR-479 heavy-red)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-LIFE-003 (scenarios "First preview" and "The shown document again": the command completes once the page shows the rendered document, not while it holds the pending status page; "Another document" is unchanged), SwRS-MDOKFSTUDIO-LIFE-032 (Refresh Preview, scenario "Dirty buffer": same sentence) and SwRS-MDOKFSTUDIO-LIFE-127 (restored panel, scenario "Restore of a saved reading place": same sentence). Reason: since the async show of a finished render (20b12216) the commands resolved before the page was assigned. No new StRS.

### Every final save ends (CR-475)

- Added (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-270 (every final save ends in a closed editor or an error that gives the text back). Changed (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-053 (Cancel and Escape close the editor during a final save), BLOCK-216 (the text comes back after a failed or crossed save, the Copy text warning), BLOCK-191 (the detached host edit), BLOCK-041 (no gesture while an edit is in flight), TABLE-025 (cell editors), FMEDIT-019 (an unchanged frontmatter save closes the editor); StRS-MDOKFSTUDIO-BLOCK-006 wording. Reason: an editor could stay on "Saving Markdown..." for good.

### The opening watcher is removed: the raw text stays text (CR-477)

- Added (`proposed`): SwRS-MDOKFSTUDIO-LIFE-195 (the `*.md` editor association is restored once from the retired setting `open.markdownFilesInStudio`, in the user and the workspace scope, association first and the retired settings removed after, silently). It supersedes SwRS-MDOKFSTUDIO-LIFE-175.
- Archived: SwRS-MDOKFSTUDIO-LIFE-174 (the Opening Files settings), LIFE-182 (links inside Studio open Studio at the line), LIFE-183 (Studio put in place of the text tab), LIFE-184 (the nine rules of the opening decision), LIFE-185 (the opening watcher). Superseded: SwRS-MDOKFSTUDIO-LIFE-175 by LIFE-195.
- Changed (all `proposed`): SwRS-MDOKFSTUDIO-LIFE-176 (the shipped list of introductions is empty), LIFE-177 (Open as Text no longer records the text editor as opened by Studio; the text editor is never replaced), LIFE-181 (the requested line belongs to the side preview only), LIFE-186 (file `studioSelections.ts`), LIFE-189 and LIFE-191 (wording), LIFE-001 (the restore of the association), LIFE-156 (five groups), StRS-MDOKFSTUDIO-LIFE-023 (new title, statement and paths: the line of a jump marked in the side preview, the raw text on request, the restore) and StRS-MDOKFSTUDIO-LIFE-001 (the association of VS Code makes Studio the default editor). No `approved` requirement is touched.
- Reason: the watcher closed a text tab opened on purpose ("Open With... > Text Editor") and put Studio in its place; the extension no longer replaces any editor, and opening every Markdown file in Studio goes back to `workbench.editorAssociations` (since 1.11.0 the setting was the way).

### A blank-lines block's editor closes after its final save (CR-474, issue #485)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-BLOCK-268 (the editor of a blank-lines block stays open across an autosave re-render and closes on the render that follows its final save; new scenario "Done closes the editor"). Reason: after Done the editor stayed on "Saving Markdown…" because the content patch kept it open. No new StRS.

### Commit of each changelog line (CR-473)

- Added (`proposed`): SwRS-MDOKFSTUDIO-CORE-094 (the release script adds to each line of `## Unreleased` the short SHA-1 of the commit on the base that added it, first in the line's reference group; it writes nothing when a commit is not on the base, unless `--skip-missing` leaves that line alone, or when the file has uncommitted changes). Derives from StRS-MDOKFSTUDIO-CORE-007. No existing requirement changed.

### Frontmatter file lookups behind the async FileSystem port (CR-468)

- Changed (no requirement text): code and tests of SwRS-MDOKFSTUDIO-FMSCHEMA-055 (the stem index) and FMSCHEMA-063 (link resolution) now read files through an async core port satisfied by `host.files`; behaviour is unchanged. New tests added to their `tested_in_files`. No new StRS or SwRS.

### PlantUML jar through the ProcessRunner port (CR-470)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-DIAG-089 (the JAR pipeline runs through the host process runner; a host without process capability reports the diagrams unavailable, and the session falls back to the built-in engine). Reason: `plantUmlRenderer.ts` no longer imports `child_process` and `fs`; behaviour and messages in VS Code are unchanged. No new StRS.
- Coverage: SwRS-MDOKFSTUDIO-DIAG-084 and DIAG-097 are now also tested at the node runner (`test/node-services/processRunner.test.ts`: process-group kill, output caps); the `ProcessRunner` port gains `maxStdoutBytes` and `maxStderrChars`.

## 2026-11-22

### Dropdown directive content (CR-465)

- Changed (`proposed`): SwRS-MDOKFSTUDIO-MYST-006 (a `{dropdown}` directive, colon or backtick fence, renders like a dropdown admonition: summary title or Details, body kept, closed unless `:open:`, mapped from opening to closing fence). Reason: the body of a `{dropdown}` was lost in the preview. No new StRS.

## 2026-11-21

### Change bar tooltip (CR-463)

- Added (proposed): SwRS-MDOKFSTUDIO-REVIEW-220 (hovering a green change bar itself shows a tooltip in the page's tooltip style, Changed lines 12–14 since last commit or Changed line 12 since last commit, from the source lines of the block that meet the changed ranges; nothing over the block away from the bar, with the bars hidden by the Diff button, or in edit mode). Derives from StRS-MDOKFSTUDIO-REVIEW-017 (a new option in its path 1); relates to REVIEW-207 and REVIEW-214. Round 2: added (proposed) SwRS-MDOKFSTUDIO-REVIEW-221 (a red removed-lines marker between the blocks around lines removed with nothing in their place, tooltip Removed lines 12–14 since last commit, hidden with Diff off and in edit mode) and SwRS-MDOKFSTUDIO-REVIEW-222 (a click on a bar or marker shows the side-by-side diff card of that block only, a second click or Escape closes it; the page asks the host for the baseline once). Both derive from StRS-MDOKFSTUDIO-REVIEW-017; REVIEW-220 relates to them. The tooltip bubble moved above the bar so it no longer covers the first line. No existing SwRS changed.

### Blank runs inside quotes and containers (CR-462)

- Changed (all `proposed`): SwRS-MDOKFSTUDIO-BLOCK-266 (a run of empty quote lines inside a quote, an alert, an admonition, a definition or a footnote is a blank run shown as a blank-lines block; a fence, an HTML block and a table still show none), BLOCK-268 (a block written in such a run keeps the quote markers or takes the container's indent; the host checks a `containerLine`), BLOCK-269 (removing a quote run keeps its first line byte for byte and the final line break).
- Reason: a run inside a quote or an admonition was invisible and could not be edited from the preview. No new StRS.

### Line marker precision (CR-457)

- Added (proposed): SwRS-MDOKFSTUDIO-LIFE-192 (the line marker marks the table row of the line, the header row for the delimiter line), LIFE-193 (the line marker shows the hidden tabs that hold the line, outermost first, the way a click does, and marks the exact line), LIFE-194 (the line marker marks the front matter property row of the line and expands a collapsed properties table for a property line only).
- Changed (all `proposed`): SwRS-MDOKFSTUDIO-LIFE-178 (the top of the enclosing block no longer covers a pipe table row, a tab item or the front matter; the code rule is "a code block itself"), LIFE-179 (boundary rows: another tab shown, the properties table collapsed by the reader), LIFE-180 (boundary rows: table row, delimiter line, property row and tab-panel line in edit mode), MYST-098 (the content of a tab item carries marker lines; a click still edits the whole item), MYST-099 (the marker selects a tab the way a click does; after a patch each set shows the later of its own and its group's choice), FMSCHEMA-090 (a requested property line expands a collapsed table, any other line leaves it collapsed).
- Reason: the marker sat at the top of the table, of the whole tab item and of the front matter, and a line in a hidden tab marked a wrong place.

### Side preview: multi-file diff and merge editor not followed (CR-461)

- Changed: SwRS-MDOKFSTUDIO-LIFE-026 (a scenario and a known limit: the multi-file diff editor and the merge editor are not followed, because the VS Code API gives them no tab input class). Documentation only, no code change.

### Diff scroll tests (CR-460)

- Tests only, no behaviour change: SwRS-MDOKFSTUDIO-LIFE-003 and LIFE-100 gain a real-window test (`test/integration/diffPreviewScroll.test.ts`: inline diff scroll follows; a staged-like diff with no file side previews the working-tree file and moves no scroll) and a host test of the staged-like no-scroll rule. No new SwRS.

### Impossible comment date refused (CR-459)

- Changed: SwRS-MDOKFSTUDIO-REVIEW-004 (a creation date naming a day that does not exist in its month, such as 2026-02-30, or 2026-02-29 in a non-leap year, rejects the whole sidecar like any other bad date); the parser used to accept it because Date.parse rolls the day over. No new StRS.

### Side preview jump marker (CR-456)

- Added (proposed): SwRS-MDOKFSTUDIO-LIFE-186 (the host tells a jump from a cursor move: a Command selection with one range that Studio did not ask for), LIFE-187 (the side preview that follows the editor marks the line of a jump, keyed by document, within 5 seconds, visible page only), LIFE-188 (the scroll of a jump follows the anchor setting: if-off-screen or reading line), LIFE-189 (the marker goes on an edit from the text editor or a switch of file), LIFE-190 (a cursor move never marks), LIFE-191 (a link or Back and Next followed in the side preview marks its target line).
- Changed (all `proposed`): SwRS-MDOKFSTUDIO-LIFE-178 (the reveal takes an optional scroll mode; if-off-screen scrolls only when the line is off screen), LIFE-181 (the requested line belongs to a document and an age, is posted only to a visible page showing that document within the window, and takes the anchor except in if-off-screen mode), LIFE-184 (the rule 6 row says the side preview marks the line), LIFE-185 (the watcher reads jumps from the host jump signal; behaviour unchanged), StRS-MDOKFSTUDIO-LIFE-023 (a main path: with the side preview open the text editor goes to the line and the side preview marks it).
- Reason: one definition of a jump for the opening watcher and the side preview; the real-window trial J1 (VS Code on Linux) recorded only the search click as a command move with one selection; cursorDown, cursorBottom, selectAll, an API selection and Go Back gave no selection change, and Go to Symbol, F3 and F8 were not driven (docs table updated).

### Side preview next to a text diff (CR-455)

- Changed: SwRS-MDOKFSTUDIO-LIFE-003 (Open Preview to Side works from a text diff: the real file of the diff is previewed, no text editor opens, the editor-title button is offered on the text diff editor, a staged diff uses the working-tree file as a stand-in); SwRS-MDOKFSTUDIO-LIFE-026 (a text diff that becomes active switches the following preview to its real file); SwRS-MDOKFSTUDIO-LIFE-100 (the diff side of the file scheme scrolls the preview, the git or virtual side never does); SwRS-MDOKFSTUDIO-LIFE-108 (a reveal from the preview targets the diff's file side only).

### Requirements viewer full IDs and ID search (CR-458)

- Added: SwRS-MDOKFSTUDIO-CORE-092 (the search finds a requirement by its full ID, short ID or bare number, in any case and with or without leading zeros; the ID matches come first and Enter opens the first) and SwRS-MDOKFSTUDIO-CORE-093 (every requirement of a use case or behaviour page is named by its full ID: eyebrow, tab title, share title, crumbs, pager name and links), both proposed and deriving from StRS-MDOKFSTUDIO-CORE-008.
- Changed: SwRS-MDOKFSTUDIO-CORE-085 (the share title of a use case is `Use case <full ID>: <title>` and of a behaviour `Behaviour <full ID>: <title>`, no longer the title then the ID); SwRS-MDOKFSTUDIO-CORE-084 (a use case or behaviour entry of the search index carries the full ID, shown in its result line).

### Blank-lines blocks inside lists (CR-448)

- Changed: SwRS-MDOKFSTUDIO-BLOCK-266 (a run between two items of a list or inside a list item is shown in the item that holds it; nothing is shown inside a fence, a directive, an HTML block, a table, a quote, an alert, an admonition, or a folded or included list); SwRS-MDOKFSTUDIO-BLOCK-267 (the arrows, Shift+Arrow and a click inside a list); SwRS-MDOKFSTUDIO-BLOCK-268 (a block typed or pasted inside a list takes the content indent, or the item indent for a sibling item; the host refuses an item line that is no list item line); SwRS-MDOKFSTUDIO-BLOCK-269 (a removal inside a list keeps one list and selects it).
- Reason: CR-444's SwRS said runs inside lists show nothing. No new StRS.

### Copy, cut and paste on a list followed by blank lines (CR-447)

- Changed: SwRS-MDOKFSTUDIO-BLOCK-166 and SwRS-MDOKFSTUDIO-BLOCK-169 (copy and cut drop the trailing CommonMark blank lines of a range, spaces and tabs only, before they plan; a no-break-space line is still refused); SwRS-MDOKFSTUDIO-BLOCK-174 (paste accepts the blank line that ends a list and inserts after the block, reusing the blank lines already there); SwRS-MDOKFSTUDIO-BLOCK-124 (the refusals of a blank-ended copy or cut and of a blank paste anchor are narrowed to the cases that remain).

### Real-window paste-url and drop-files join the default stress plan (CR-454)

- Changed: no SwRS. The `paste-url` and `drop-files` real-window steps run in every default round of `just ci-stress`, which defaults to 11 rounds of 21 scenarios instead of 12 of 19; their fixed 700 ms and 400 ms pauses became waits on a state the page reports, and each prints a failure trace in the CI log. The reds seen on CI (runs 44647675614, 44690391950, 44715893690) were the stored edit mode wait that e05f0b51 removed, and about 20 heavy runs since then never failed at either step.

### Mutation campaign on src/core: tests for the holes (CR-450, round 3)

- Changed (tests only, no requirement text): SwRS-MDOKFSTUDIO-BLOCK-042, FMEDIT-043, FMSCHEMA-046, FMSCHEMA-055, FMSCHEMA-067, FMSCHEMA-084, LIFE-094, LIFE-119, LIFE-183, MYST-038, MYST-045, MYST-066, PALETTE-192, PALETTE-196, PALETTE-217, PALETTE-229, REVIEW-001, REVIEW-004, REVIEW-009, REVIEW-167, REVIEW-186, TOOLBAR-059, TOOLBAR-090, TOOLBAR-102 and TRUST-059 gained tests (19 `*.holes.test.ts` files in `test/core`) that kill surviving mutants of their modules.

### Open Studio at a searched line: real VS Code trials and known limits (CR-445, round 4)

- Changed: SwRS-MDOKFSTUDIO-LIFE-185 (the jump is a selection change of kind Command, trial T2; the wait for the editor ends after 3 s or on close; the activation opening is never replaced, trial T11 not automated); SwRS-MDOKFSTUDIO-LIFE-184 (rule 5 keeps a plain opening reopened as text; a jump right after a Studio tab closed is a jump, trial T13; known limits T4 and T3d).

### Open Studio at a searched line: the opening policy and watcher, the marker's rounds (CR-445, round 3)

- Added: SwRS-MDOKFSTUDIO-LIFE-184 (the nine ordered rules of the opening policy) and SwRS-MDOKFSTUDIO-LIFE-185 (the opening watcher: reads the line from the editor selection, waits for the editor association migration, never replaces a tab present at start), both proposed and deriving from StRS-MDOKFSTUDIO-LIFE-023.
- Changed: SwRS-MDOKFSTUDIO-LIFE-183 (recency of the Studio tabs is the order they became active, not an approximation; a host test); SwRS-MDOKFSTUDIO-LIFE-179 now also covers the marker going when an editor opens; Studio's own navigation starts from the reader's group.

### Open Studio at a searched line: the marker, the placement, Studio's own navigation (CR-445, round 2)

- Added: SwRS-MDOKFSTUDIO-LIFE-178 to 183 (proposed, derive from StRS-MDOKFSTUDIO-LIFE-023): the page marks a requested line with an arrow and a band and scrolls to it silently, the marker stays through scrolls and layout changes and goes on a pointer press, an edit or a new line, in edit mode it covers no handle, a requested line reaches the page once it is ready and wins over the restored reading place, link and history navigation from a Studio tab opens Studio at the target line, and the host reveals the right Studio tab or opens a new one.
- Changed: StRS-MDOKFSTUDIO-LIFE-023 (main paths 3 and 4: open at a searched line, follow a link inside Studio).

### Open Studio at a searched line: settings, migration, introductions, Open as Text, lazy services (CR-445, round 1)

- Added: StRS-MDOKFSTUDIO-LIFE-023 (proposed): a reader opens a Markdown file at a searched line and sees that line marked in Studio.
- Added: SwRS-MDOKFSTUDIO-LIFE-174 to 177 (proposed, derive from StRS-MDOKFSTUDIO-LIFE-023): the Opening Files settings group and its defaults, the once-per-scope migration of the `*.md` editor association to `open.markdownFilesInStudio`, the feature introductions with Show Feature Introductions Again, and Open as Text with the registry of the text editors Studio opened.
- Changed: SwRS-MDOKFSTUDIO-LIFE-001 (the Markdown language is the fifth activation event, and activation starts no preview service), SwRS-MDOKFSTUDIO-LIFE-004 and SwRS-MDOKFSTUDIO-CORE-001 (the engine warm-up runs with the first Studio preview), SwRS-MDOKFSTUDIO-LIFE-149 (vscodeHost.ts is the one source that writes a setting), SwRS-MDOKFSTUDIO-LIFE-156 (the group Opening Files, order 6), StRS-MDOKFSTUDIO-LIFE-001 (the default-editor and built-in-settings constraints).
- Not yet: the marker, the opening policy and the watcher (later rounds of the change) add their own SwRS and extend StRS-MDOKFSTUDIO-LIFE-023.

### Blank runs show as a reachable blank-lines block (CR-444)

- Added: SwRS-MDOKFSTUDIO-BLOCK-266 (proposed): edit mode shows each blank run as a blank-lines
  block from the host's hidden run list.
- Added: SwRS-MDOKFSTUDIO-BLOCK-267 (proposed): arrows, Enter and a click reach it; Delete needs
  the selection; it is out of ranges, moves and clipboard.
- Added: SwRS-MDOKFSTUDIO-BLOCK-268 (proposed): typing or pasting writes the block in place of the
  run in one edit; Cancel restores it; a stale run is refused.
- Added: SwRS-MDOKFSTUDIO-BLOCK-269 (proposed): removing a run keeps one separator.
- Sources: `src/core/mapping/blankRuns.ts`, `src/page/features/blankLines.ts`,
  `src/session/features/blockEdits.ts`, `src/session/features/sourceEdits.ts`.

### Share cards of the requirements viewer: one picture per category (CR-443)

- Changed: SwRS-MDOKFSTUDIO-CORE-085 (proposed): one picture for the index (`areas-card.png`) and one per feature category (`area-<areaId>.png`) instead of one per level; each page has its own share title and a description without inline-code backticks or link syntax (the user need whole, a rule cut at a word at 200 characters); `requirements.html` carries the tags of the index.
- Changed: SwRS-MDOKFSTUDIO-CORE-086: scenario "A social card" names the index and a category instead of a level.
- Sources: `test/site/socialCard.ts`, `test/site/requirementsViewer/cards.ts`, `shell.ts`, `pages.ts`, `write.ts`.
- Tests: `test/site/requirementsViewer/cards.test.ts`, `shareText.test.ts`, `write.test.ts`, `test/site/siteTheme.test.ts`.

### The use case path graph as a joined map (CR-441)

- Added: SwRS-MDOKFSTUDIO-CORE-091 (proposed, derives from StRS-MDOKFSTUDIO-CORE-008): Play on a use
  case map walks the steps of the chosen path in the colour of that path, with the dot following
  the step indexes of that path.
- Changed: SwRS-MDOKFSTUDIO-CORE-081 (proposed): the map is a joined SVG at its natural size (a
  shared state drawn once, one stroke per path on a shared step, a pill with the full ID and the
  test count, a line above the map, a legend, no overlap at 1280 px and 800 px). SwRS-MDOKFSTUDIO-CORE-080,
  -082 and -083 (proposed): a link to a requirement shows its full ID.
- Sources: `test/site/requirementsViewer/layout.ts`, `pages.ts`, `viewer.css`, `viewer.js`,
  `test/site/siteTheme.ts`.
- Tests: `test/site/requirementsViewer/metroMap.test.ts`, `metroMap.browser.test.ts`,
  `pages.test.ts`.

### The requirements viewer shows table scenarios, not empty columns (CR-440)

- Changed: SwRS-MDOKFSTUDIO-CORE-082 (proposed): two new scenarios (a table scenario shows its table;
  a scenario with steps, a note and a table shows them in source order) and verification notes. The
  normative sentence is unchanged; no other requirement file changes.
- Sources: `test/site/requirementsViewer/model.ts`, `test/site/requirementsViewer/pages.ts`,
  `test/site/requirementsViewer/viewer.css`, `test/site/requirementsViewer/home.ts`.
- Tests: `test/site/requirementsViewer/model.test.ts`, `test/site/requirementsViewer/pages.test.ts`,
  `test/site/requirementsViewer/home.test.ts`, `test/site/requirementsViewer/bundle.test.ts`.

### Empty blocks leave no blank lines, and a Delete block button (CR-439)

- Added: SwRS-MDOKFSTUDIO-BLOCK-264 (proposed): an emptied top-level block or list item is deleted
  with its separator when the writer commits it, in one edit before an autosave and two after.
- Added: SwRS-MDOKFSTUDIO-BLOCK-265 (proposed): Delete block (button and Delete or Backspace on a
  block selection), one edit and one undo step, an included block refused.
- Changed: SwRS-MDOKFSTUDIO-BLOCK-094 (proposed): leading blank lines of a new block are dropped
  and an insertion after a blank line writes one separator, not two.
- Changed: SwRS-MDOKFSTUDIO-BLOCK-127, -004 and -109 (proposed): scenario rows for the delete
  refusal, the keys, and the button beside the arrows.
- Sources: `src/core/mapping/insertion.ts`, `src/core/edits/sourceEdits.ts`,
  `src/session/features/blockEdits.ts`, `src/session/features/sourceEdits.ts`,
  `src/page/features/blockSelectionView.ts`, `src/page/modules/deleteBlockButton.ts`.

## 2026-11-20

### A block editor never stays on "Saving Markdown…" (CR-436)

- Added: SwRS-MDOKFSTUDIO-BLOCK-263 (proposed, derives from StRS-MDOKFSTUDIO-BLOCK-006): the page
  puts the text of the text box in the line endings of the source block before it compares or posts
  it (an unchanged CR LF block posts nothing and closes), and the host answers every final save that
  ends with nothing to render with `previewEditSource` `done`, which closes the editor.
- Changed: SwRS-MDOKFSTUDIO-BLOCK-234 (proposed): a block with mixed line endings now keeps the
  endings of the lines an edit leaves alone (the row said the text box content was written as it
  is); a verification note. The rest of the requirement is unchanged.
- Sources: `src/core/edits/lineEndings.ts`, `src/page/features/blockEditor.ts`,
  `src/page/features/blockSourceEditor.ts`, `src/session/features/blockEdits.ts`,
  `src/core/protocol/hostToPage.ts`.
- Tests: `test/page/runtimeBlockEditorLineEndings.test.ts`, `test/host/editLineEndings.test.ts`,
  `test/core/edits/matchLineEndings.test.ts`, `test/integration/realInput/lineEndingLeave.ts`.

### Line-ending fixtures and byte-preservation tests (CR-435)

- Changed: SwRS-MDOKFSTUDIO-BLOCK-234: new scenario "A save on a real CRLF, LF or mixed file changes the block only", tested on real fixture files (test/fixtures/markdown-line-endings/) kept byte for byte by `-text` rules in .gitattributes. No behaviour change.

### Five code and SwRS mismatches of CR-347 settled (CR-431)

- Changed: SwRS-MDOKFSTUDIO-CORE-010: the code is right. "Raw HTML" is an HTML block or an HTML tag
  itself; text between two inline tags is converted like any text (new row in the refusal table;
  known issue removed; normative sentence unchanged).
- Changed: SwRS-MDOKFSTUDIO-CORE-025: the SwRS is right, the code was wrong. A failed render with no
  message (undefined, null, an Error with an empty message) now shows "The render failed." (error
  page) or "The latest render failed." (stale page) instead of "undefined"; a thrown string keeps
  its text. Known issue removed.
- Changed: SwRS-MDOKFSTUDIO-DIAG-005: the picture claim covers what the visual fixture draws (node
  fill, transparent background); the border, secondary and tertiary colours are checked as the
  values given to Mermaid. First known issue removed.
- Changed: SwRS-MDOKFSTUDIO-DIAG-009: Mermaid passes run one at a time, so a later theme is drawn
  only after the running pass ends; the replaced-key rule is stated for PlantUML and charts (normative
  change). The two Mermaid guards stay as defence, with a comment. Unreachable-guard known issue removed.
- Changed: SwRS-MDOKFSTUDIO-TRUST-042: an SVG `xlink:href` is treated like an HTML link (blocked: no
  href and the request in `data-sphinx-preview-navigation`; allowed: address kept and the attribute
  set, the host routes the click). Known issue removed; no behaviour change.
- Sources: `src/core/render/renderPipeline.ts`, `src/session/features/rendering.ts`,
  `src/session/previewManager.ts`, `src/page/modules/mermaidPreview.ts`,
  `src/core/security/html-sanitizer.ts` (comments only).
- Tests: `test/core/render/renderReq.coreRows.requirements.test.ts`,
  `test/host/coreReq.requirements.test.ts`, `test/page/modules/mermaidPreviewEntry.test.ts`,
  `test/security/trustReq.pageBuild.requirements.test.ts`.

### List item handles

- Added: SwRS-MDOKFSTUDIO-BLOCK-262 (proposed, derives from StRS-MDOKFSTUDIO-BLOCK-014): in edit
  mode a handle left of each list item moves it among its siblings by a drag or Alt+Up or Alt+Down,
  with its sub-items and blocks, as one edit; ordered lists keep their numbers; lists in quotes,
  alerts and admonitions keep their prefixes and show their handles outside the outermost box.
- Changed: StRS-MDOKFSTUDIO-BLOCK-014 (proposed): the list items in its intent and constraints, and
  a main path "Move a list item" citing SwRS-MDOKFSTUDIO-BLOCK-262.
- Sources: `src/page/features/listItemMove.ts`, `src/page/modules/listItemMove.ts`,
  `src/page/features/mappedBlocks.ts`, `src/page/features/editMode.ts`,
  `src/page/features/pageInput.ts`, `src/core/preview/styles/editModeStyles.ts`.
- Tests: `test/page/modules/listItemMove.test.ts`, `test/page/runtimeListItemMove.test.ts`,
  `test/session/listItemRange.test.ts`, `test/core/preview/listItemHandleStyles.test.ts`,
  `test/integration/listItemMoves.ts`, `test/visual/listItemHandleScenarios.ts`,
  `test/visual/capture_list_item_handles.py`.
- Commands: `just requirements-update` (1 index updated, then 0), `just check-markers` (406
  in-force SwRS marked), `just requirements-lint` (0 changes, main paths: 92 StRS checked, 581 SwRS
  citations, all valid; use case diagrams: 93 StRS checked, all parse).

### Use case diagrams parsed at the requirements lint (CR-429)

- Added: SwRS-MDOKFSTUDIO-CORE-090 (proposed, derives from StRS-MDOKFSTUDIO-TRUST-014): the
  requirements lint parses the use case diagram of every StRS with the project's Mermaid and fails
  naming the file, the line, the StRS id and Mermaid's message for each diagram that does not parse.
- Sources: `scripts/check-use-case-diagrams.mjs`, `package.json` (`check:diagrams`), `justfile`
  (`requirements-lint`).
- Tests: `test/build/checkUseCaseDiagrams.test.ts`.

### Real-window test flakes (CR-425)

- Changed: SwRS-MDOKFSTUDIO-PALETTE-264 Method no longer says the paste-url scenario waits until the
  workspace remembers edit mode off (the wait was a race in the test and is gone from paste-url,
  drop-files and find-in-preview). SwRS-MDOKFSTUDIO-BLOCK-058 gains a Known issue: the
  `checkbox-toggle` hang after `stock-coexistence`, what the CI dumps prove and do not.
- Sources: none (test-only change).
- Tests: `test/integration/pasteUrl.test.ts`, `test/integration/checkboxToggle.test.ts`,
  `test/integration/previewEditing.test.ts`, `test/build/integrationEditModeRestore.test.ts`.

### Numref to a captionless figure or table, tested (CR-430)

- Changed: SwRS-MDOKFSTUDIO-MYST-019 verification notes only. The contradiction reported on 2026-11-18
  (garden myst, code-blocks, gfm: the `{numref}` scenario against an inert placeholder) was a numref to a
  heading label: the placeholder it showed is the one SwRS MYST-017 documents for that case, and it was
  read as if the numref targeted a captionless figure. A numref to a captionless figure or table already
  shows its number (Figure 1, Table 1), and is now tested. No normative change and no code change.
- Tests: `test/core/render/mystFeatures.test.ts`.

### Gallery and site on a heavy CI dispatch (CR-350)

- Changed: SwRS-MDOKFSTUDIO-CORE-076 says a heavy dispatch builds the gallery and the site unless
  `gallery` is false, and only when `integration` and `report` succeed (one Normative sentence, two
  rows in the failure and other events scenario).
- Sources: `.github/workflows/ci.yml`.
- Tests: `test/build/test_workflows.py`.

### A click on a list item edits that item; list items can be listed in the TOC

- Changed, re-approved by the owner (2026-11-20): StRS-MDOKFSTUDIO-BLOCK-003, whose constraint "A
  click on a list item edits the list that holds it" now reads "A click on a list item edits that
  item; a click on the list itself, outside its items, edits the whole list"; approved_by unchanged,
  approved_at (and verified.at, set by `just requirements-update`) 2026-11-20T09:41:00+01:00.
- Changed: StRS-MDOKFSTUDIO-TOOLBAR-006 (proposed): the statement and the h1 to h4 constraint
  cover the list items the column lists when the setting is on.
- Changed: SwRS-MDOKFSTUDIO-BLOCK-014 (a click on a list item opens that item only, on the range
  the renderer gives the item; the list itself, outside its items, opens the whole list; an
  ordered list keeps its numbers while an item is edited: the edited item is collapsed and
  invisible rather than `display: none`, so it still counts in the list's numbering, which a
  `counter-increment: list-item` on the editor did not do in Chromium) and SwRS-MDOKFSTUDIO-BLOCK-017 (the
  hover outlines the item, the list itself outlines the whole list).
- Changed: SwRS-MDOKFSTUDIO-BLOCK-079 gets the scenario "Items of a list and inner blocks": the
  arrows at the edge of an item editor, or of the editor of a block inside an item, go to the
  sibling item, then past the list; the editor of an admonition inner block keeps the arrow at its
  edges, as before. The arrow row moved there from BLOCK-014, and `adjacentMappedBlock` is marked
  BLOCK-079.
- Unchanged: SwRS-MDOKFSTUDIO-BLOCK-130. Cmd+Alt+Up/Down (Ctrl+Alt elsewhere) in a list item editor
  saves the item and moves the whole list, as the list's editor did; the editor reopens on the
  list. The owner chose this (2026-11-20); BLOCK-014 has no known issue about it any more. Its
  behaviour is unchanged; one Method line cites the new test of the chord in an item editor.
- Changed: SwRS-MDOKFSTUDIO-BLOCK-001 (the tidy-up row outlines the item, and cites the renamed
  hover test).
- Changed: SwRS-MDOKFSTUDIO-BLOCK-254 (ArrowRight goes from a selected list to its first item and
  from an item to its first block, ArrowLeft back up; Enter opens the selected list, item or block
  of an item on its own lines).
- Added: SwRS-MDOKFSTUDIO-TOOLBAR-138 (proposed; with the new setting `preview.listItemsInToc`, off
  by default, the TOC column lists the items of top-level lists by their first line cut to 80
  characters, one level below the heading before them, as leaves without a rail tick; the `[TOC]`
  list, the footnotes, table cells and hidden tab panels are left out; a test checks these
  exclusions on a page rendered by the real renderer; the item row carries no attribute of its own).
  Changed: SwRS-MDOKFSTUDIO-TOOLBAR-040 (related requirement only).
- Why: in documents that write each requirement as a list item, a chapter is one long list, so a
  click on one requirement opened every requirement of the chapter, and the TOC showed the
  headings only. The owner chose this behaviour for every list (PR 404): a click edits one item,
  the keyboard walks list, item and blocks like the inner blocks of an admonition, and the TOC
  option is opt-in.
- Tests: `test/session/listItemEditOpen.test.ts`, `test/page/blockReq.requirements.test.ts`,
  `test/page/runtimeStructuralNavigation.test.ts` (also the arrow at the edge of a block inside an
  item and of an admonition inner block), `test/page/runtimeBlockEditor.test.ts` (the hover
  now marks the item; the arrows at the edge of an item editor), `test/page/runtimeBlockMoves.test.ts`
  (the move chord in an item editor moves the whole list), `test/page/runtimeContentPatch.test.ts`,
  `test/session/alertBlockEditOpen.test.ts` (the other item opens on its own
  line), `test/page/modules/tocColumn.test.ts`, the configuration tests, the visual checks of
  block-editing/v06 and v12 (renamed `v12-list-item-opens-item-dark-460`; v12 also edits the second
  item of a four-item ordered list and reads the markers Chromium draws, 1., 3. and 4., from its
  accessibility tree, `test/visual/capture_list_numbers.py`) and the real-window hover of
  block-editing/r12.
- Verification (Windows, 2026-11-20): `just requirements-update` (1 index updated, 0 projections);
  `just check-markers` (404 in-force SwRS marked, 25 files on the marker baseline);
  `just requirements-lint` (1165 requirements, 0 errors, 26 warnings; 0 index, projection or
  coverage changes; 92 StRS, 578 SwRS citations, all valid); `just check` passed (unit: 4095 tests,
  4080 passed, 15 skipped, 0 failed; security: 101 tests, 99 passed, 2 skipped). The visual and
  real-window checks named above were not run here.

## 2026-11-19

### Commit round trip of edit mode on large documents (issue 423)

- Changed: SwRS-LIFE-039 renders at once after a block edit is committed, instead of after the
  adaptive pause of up to 1 s (normative change; a running render still finishes first), with a new
  row in its pause scenario. SwRS-TABLE-002 gets a verification note: the table handles are placed in
  the next frame, not while the page is patched. No other normative change.
- Tests: `test/node-services/build/buildQueue.test.ts`, `test/page/runtimeTableRowMove.test.ts`.

### Edit mode on large documents (issue 420)

- Changed: SwRS-LAYOUT-023 gets the row "An editor opens or closes on a top-level block that cannot break
  out: nothing is measured again" in its re-measure scenario; its known issue about the untested
  mutation observer is removed (now tested in a real browser). SwRS-PALETTE-021 and SwRS-TABLE-002 get a
  verification line each (no second caret measure on a key release; one table box read per handle
  placement pass). No normative change.
- Tests: `test/page/tableBreakout.test.ts`, `test/page/runtimeEditPalette.test.ts`,
  `test/page/runtimeTableRowMove.test.ts`.

## 2026-11-18

### Garden myst, code-blocks, gfm

- Mapping (old to new, the text and tests kept, the old id superseded): SwRS CODE-005 into CODE-001 and
  CODE-039 (line wrapping goes with numbering and emphasis); CODE-026 into CODE-019 (the copy request
  bounds); GFM-027 into GFM-021 (the checkbox toggle message); GFM-039 into GFM-040 and GFM-041; MYST-051
  into MYST-045 (the rename message and its answer); MYST-101 into MYST-096. Every old ID is replaced in
  the markers, the `depends_on` lists, the Main paths and the citation lines of CODE-001, CODE-008,
  CODE-014, CODE-039, MYST-038, MYST-045, BLOCK-041, TRUST-052 and TRUST-055; CODE-019 and GFM-021,
  which received the scenarios, drop their citation of the old ID.
- Added: StRS-GFM-005 (a writer picks one option of a radio choice list) with SwRS GFM-040 (a radio
  choice list renders as a radio group) and GFM-041 (choosing an option moves the (x)); SwRS MYST-102
  (dollar prices stay text and keep their emphasis), from StRS-MYST-006; StRS MYST-015 (admonitions and
  context tags), 016 (grids, cards, tabs), 017 (figures, tables) and 018 (definition lists, roles), which
  replace StRS-MYST-001 (Q2, superseded; its Main paths now point to the four).
- Reparented (`derives_from`): MYST-001, 006 and 013 to StRS-MYST-015; MYST-053, 098, 099 and 100 to
  StRS-MYST-016; MYST-031, 063 and GFM-031 to StRS-MYST-017; MYST-017 to StRS-MYST-018; MYST-097 to
  StRS-CORE-001 (Q3); MYST-019 keeps only StRS-MYST-009, and MYST-097 leaves StRS-MYST-005. The shared
  rules are cited by `depends_on` (garden-Q3): GFM-009 on CORE-003; MYST-031 on TRUST-025; MYST-036 and
  038 on MYST-097; CODE-017, CODE-019, GFM-021, MYST-045 and MYST-081 on the TRUST envelope and gate rules
  they use, and MYST-078, which no longer handles the banner message, drops TRUST-052 and TRUST-065;
  TRUST-005, TRUST-065 and CORE-012 no longer derive from StRS of these scopes.
- StRS text: GFM-002's rationale is corrected (the kept colours are named, hex, rgb/rgba and hsl/hsla)
  and re-approved by gaetan@xeberon.net on 2026-11-18 (Q1); CODE-001 says the code uses the Dark+ colours
  (Light+ when the dark code background is off) and that plain fences are numbered by the setting;
  GFM-003 loses its radio path (now StRS-GFM-005) and says each refusal returns the box; MYST-009 says a
  rename tells how many references still use the old name; MYST-005 is retitled "Constructs the preview
  cannot build stay visible and labelled" (Q5). A `### Use case diagram` (sequence, no SwRS IDs) is added to
  CODE-001, CODE-004, GFM-002, GFM-003, MYST-005, 006, 007, 009 and 012, and written with the new GFM-005
  and MYST-015 to 018; an added diagram needs no re-approval (garden-Q2).
- SwRS text: CODE-007 and CODE-039 retitled; the token-colour scenarios of CODE-001 and CODE-007 moved
  to CODE-040; MYST-100 is retitled to cover a card in a grid or alone and takes the card scenarios of
  MYST-053; MYST-078 drops its two banner scenarios, and MYST-081, which already opened the Problems
  view, takes the malformed or mismatched message; the dollar-price scenarios of MYST-024 moved to
  MYST-102; the cache and lazy-load scenarios of CODE-001 and MYST-024 became verification notes (Q4), as
  did the table source lines of GFM-008, the gallery scenarios of MYST-006 and the read-once target of
  MYST-057. Format drift fixed on the SwRS MYST-096 to MYST-100: the first H2 of MYST-096 and MYST-097 is
  the title, and the scenario tables of MYST-098, MYST-099 and MYST-100 are named scenario blocks.
- Placements: the alert-body click of GFM-009 lives in BLOCK-014, which already held it (Q6), and its
  markers moved there; the table palette action stays in MYST-063, since no PALETTE SwRS fits (Q7, to the
  owner). MYST-019's `{numref}` scenario ("shows its number, Figure 1") contradicts the code and
  renderReq.myst, which keep a numref as an inert placeholder: left as is and reported, no test added.
- Tests added: CODE-007 (one font scale, one box, the scroll rule), CODE-019 (a second click restarts),
  GFM-008 (a reference without a definition), GFM-021 (the host refusals), MYST-019 (a reference to a
  heading shows its text), MYST-024 (the KaTeX bundle missing, and the visual scenario
  myst/v47-maths-offline-light-900, which also checks MYST-102's dollar prices), MYST-053 (a ninth grid
  level stays a placeholder); StRS markers on scenarios for CODE-001, GFM-005, MYST-005, 006, 009 and 015
  to 018. The existing host test of an edit with no visible editor (documents.test.ts) is now marked
  GFM-021 and GFM-041.

### Garden the requirements of toolbar-navigation and lifecycle-sync (CR 346, round 4)

- Tested, verification notes updated: SwRS-TOOLBAR-001 (all 16 tooltips equal to their titles, the tooltip on
  keyboard focus, the 12 px and 14 px offsets and the text covered by the toolbar), 054 (the render gate of
  previewHistoryGo, and Back and Next follow only the current render), 090 (a malformed escape is blocked as
  undecodable), 094 (a relative link below the second root opens), 120 (the initial state, and a pairing of
  another document, revision or request is ignored), 030 (Scroll to the end), 006 (the browser find opens a
  folded section, driven by a text fragment; the duplicated "Verification notes" heading is removed). No
  normative change.
- Changed: the TOOLBAR-129 and 130 markers of `propertiesStyles.ts` each sit on its own part of the
  reduced-motion rule (the tooltip selectors, the rows rule); `PREVIEW_THEME_CSS` is byte-identical.
- Tests: `test/core/preview/toolbarReq.requirements.test.ts`, `test/page/toolbarReq.runtime.requirements.test.ts`,
  `test/session/toolbarReq.requirements.test.ts`, `test/session/previewNavigator.test.ts`,
  `test/core/navigation/previewNavigation.test.ts`, `test/visual/capture_toolbar_checks.py` (scenarios
  toolbar-navigation/v03 and v06 to v21).

## 2026-11-17

### Garden the requirements of toolbar-navigation and lifecycle-sync (CR 346, round 1)

- Merged (old superseded by new, scenarios, verification notes and `depends_on` folded into the new one):
  TOOLBAR-013 into LIFE-169; TOOLBAR-056 and 058 into 054; 065 into 059; 083 into 079; 113 into 077;
  122 and 126 into 120; 133 into 037; 022 into 018; 002 into 025; 005 into 003; 011 into 010; 132 into 009;
  014 and 131 into 012; LIFE-010 into LIFE-003; LIFE-055 into LIFE-049; LIFE-097 into LIFE-100 and LIFE-108
  (a defaults scenario in each); LIFE-171 into LIFE-001 (the Agents scenarios). Every old ID is replaced in
  the markers, the `depends_on` lists and the Main paths.
- Changed: SwRS-LIFE-004 is retitled and written in observable words; the internal scenarios of LIFE-069 and
  LIFE-156 moved to a verification line; LIFE-149 is no longer exempt; TOOLBAR-007 gets the scenario "The
  collapsed choice is kept for the workspace"; the scenario "Table handle strip at the top of the page" moved
  from TOOLBAR-001 to SwRS-TABLE-007 (a table-editing SwRS, which already specified the handle strip; the
  marker of tableMoves.ts moved with it). The draft StRS TOOLBAR-002 and 003 and the draft SwRS TOOLBAR-003,
  004, 006, 008, 009, 010 and 012 are now `proposed`.
- Reparented (`derives_from`): LIFE-100 and 108 to StRS-LIFE-010; LIFE-026 to LIFE-003 and TRUST-001; 032 to
  LIFE-003 and LIFE-005; 049 to LIFE-003, 005 and 007; 156 to LIFE-021; 069 and 071 to LIFE-005; 119 to
  LIFE-010; 125 to LIFE-010 and LIFE-014; 018 to LIFE-001; 002 to LIFE-007; 172 to BLOCK-001. The StRS-TOOLBAR
  references of SwRS-LIFE-169, LIFE-170 and TRUST-001 are dropped; StRS-TOOLBAR-001 depends on LIFE-169 and 170.
- Added: StRS-MDOKFSTUDIO-LIFE-022 "Closing a preview or a folder leaves nothing behind" (proposed), with two
  Main paths on SwRS-LIFE-143; its test marker is `test/integration/workspaceDisposal.test.ts`.
- StRS: TOOLBAR-001 and LIFE-014 are retitled and rewritten; TOOLBAR-011's clause now covers only links in the
  page (`allowOutsideWorkspaceLinks` is read on the frontmatter-link path only); stray `## User Need` headings
  removed; Main paths reshaped on TOOLBAR-001, 013, 014, LIFE-001, 005, 007, 010 and 021.
- Added: a `### Use case diagram` on each of the 17 in-force StRS of the two scopes (LIFE-001, 003, 005, 007,
  010, 014, 021, 022; TOOLBAR-001, 002, 003, 004, 006, 009, 011, 013, 014).
- Not done in this round (rounds 2 and 3): markers moved to the code that carries them, the CSS split, moved
  and new tests. Sources: the markers touched are in `src/` scrollCore.ts, scrollSync.ts and `test/`
  sourceMapping, runtimeScroll, pageSettings, trustReq, workspaceDisposal, tableMoves.

### Garden block-editing and table-editing

- Mapping (old to new, same text kept, the old id superseded): BLOCK-236..245 into BLOCK-259; TABLE-070, 073, 074, 076, 080 into TABLE-122; TABLE-003, 004, 005 into TABLE-055; BLOCK-029 into BLOCK-033; BLOCK-002 into BLOCK-014; BLOCK-129 into BLOCK-109; TABLE-102 into TABLE-094; BLOCK-258 into BLOCK-260 (parent BLOCK-003) and BLOCK-261 (parent BLOCK-008); TABLE-035 into TABLE-123..126; TABLE-118 into BLOCK-255. StRS-TABLE-011 is split into StRS-TABLE-013 (conversion) and StRS-TABLE-014 (minimal diff).
- Reparenting: each SwRS derives from the StRS of its behaviour. BLOCK-041, BLOCK-058 and BLOCK-109 are shared rules with one parent each (StRS-BLOCK-003, StRS-BLOCK-025, StRS-BLOCK-014); every other StRS that derived or cites them lists them in `depends_on` instead (Q3, see below).
- StRS text changes (non-approved only): TABLE-008, BLOCK-001 path 2, BLOCK-006 user_need and rewordings. A `### Use case diagram` is added to BLOCK-001, 006, 008, 011, 014, 016, TABLE-002, 006, 008, 013 and 014 (state or sequence Mermaid, no SwRS ids). `@tests_req StRS-...` markers are placed on real scenarios (BLOCK-016 Ctrl+C step, TABLE-002 moves, BLOCK-001 hover, click and reopen steps).
- Approved StRS corrected under the owner's advance agreement (garden-Q1), each re-approved by gaetan@xeberon.net on 2026-11-18: BLOCK-025 (the known-issue bullet removed, `depends_on` BLOCK-041, diagram), BLOCK-003 (the two pointers to other scopes dropped from the rationale, diagram), TABLE-001 (the rationale bullets that only pointed to another scope cut or trimmed, diagram), TABLE-012 (superseded). Their Main paths are unchanged.
- Split: StRS-TABLE-012 is superseded by StRS-TABLE-015 (cell formatting: SwRS TABLE-018, 085, 091) and StRS-TABLE-016 (insert and shape a table from the palette: SwRS TABLE-106, 111, 115, 117 and PALETTE-031). The StRS marker of `scenarioTableCellBold` moves to TABLE-015; the new real-input scenario `scenarioTableInsertFromSlash` (`test/integration/realInput/tableInsertSlash.ts`, RI-T45) validates TABLE-016.
- `depends_on` (garden-Q3, after CR 341): SwRS BLOCK-041 derives only from StRS-BLOCK-003, BLOCK-058 only from StRS-BLOCK-025, BLOCK-109 only from StRS-BLOCK-014. Added to `depends_on`: BLOCK-041 on StRS BLOCK-025, FMEDIT-001, GFM-003, MYST-009; BLOCK-058 on StRS BLOCK-006, BLOCK-014, FMEDIT-008, GFM-003, REVIEW-015; BLOCK-109 on StRS FMEDIT-008 (BLOCK-006, 014, 016, FMEDIT-008 and REVIEW-008 already had BLOCK-041).
- Owner question (edit mode at reopen): the StRS-BLOCK-001 text (description, user_need, Path 2 "edit mode last chosen", "remembered per workspace") says a reopened preview starts in the edit mode last chosen, while SwRS LIFE-170/172 and the code (since b84b0585) start every fresh panel in preview mode. The StRS text is left as is pending the owner's decision; only its diagram and the RI-T16 reopen step follow the code.
- BLOCK-261: the code ignores Tab in that situation, while the spec said it leaves on Tab. The SwRS states what the code does; the owner decides.
- Tests: new tests for BLOCK-259 (malformed messages), BLOCK-058 (cancelled session that autosaved), TABLE-018 (pointer press 500 ms, `test/page/runtimeTableCellBlur.test.ts`), TABLE-122 and TABLE-094 (`test/page/modules/listTable.test.ts`). TABLE-055 marker on all six structural `addAction` calls in `src/page/features/tableCellEditor.ts`. BLOCK-102 Verification notes name no Enter tests (BLOCK-253 covers Enter).

### Gardening of review-annotations, frontmatter-editing, frontmatter-schema

- Merged (the survivor keeps its ID and takes the scenarios, verification notes and `depends_on` of the absorbed
  SwRS; the absorbed one is `superseded`): REVIEW-069 into REVIEW-054; REVIEW-070 and REVIEW-071 into REVIEW-074;
  REVIEW-081 folded into REVIEW-044 (now "a comment editor sends its text on Save or Cmd+Enter and keeps it until the
  host accepts it", with a comment-box and a reply-box scenario table); REVIEW-101 into REVIEW-100; REVIEW-216 into
  REVIEW-017; REVIEW-156 into REVIEW-152; REVIEW-178 into REVIEW-186 and REVIEW-192; REVIEW-007 into REVIEW-006
  and REVIEW-009; REVIEW-005 and REVIEW-010 into REVIEW-009; REVIEW-200 and REVIEW-203 into REVIEW-195; REVIEW-208
  into REVIEW-207; FMEDIT-054 into FMEDIT-016 (it did not take FMEDIT-054's parent TRUST-009); FMSCHEMA-060 into
  FMSCHEMA-050. Markers naming an absorbed ID were renamed to the survivor; no marker in `src/` or `test/` names a
  superseded or deprecated SwRS of these scopes.
- Text fixes without a merge: REVIEW-086 (Delete with its confirmation), REVIEW-094 and REVIEW-119 (the scenarios
  "Typing writes nothing" and "Change of a clean document" and the `shiftForEdits` marker move to REVIEW-094),
  REVIEW-133 and REVIEW-167 (a comment and a thread in a tab item keep their own source lines).
- Superseded: StRS-MDOKFSTUDIO-FMSCHEMA-002 by StRS-MDOKFSTUDIO-FMSCHEMA-001; SwRS FMSCHEMA-017, 018 and 076 now
  derive from StRS FMSCHEMA-001.
- Added: StRS-MDOKFSTUDIO-REVIEW-018 (a writer compares each changed block with its last-commit version side by
  side); SwRS REVIEW-006, 008 and 009 derive from it, no longer from REVIEW-008 and REVIEW-017 only. Use case diagrams
  added to StRS FMEDIT-001, 005, 008, FMSCHEMA-001, 006, 010, 014, REVIEW-008, 017 and 018.
- Reparenting: shared rules are cited by `depends_on` instead of derived. Removed from `derives_from`: FMEDIT-001,
  FMEDIT-008 and REVIEW-008 from BLOCK-041; FMEDIT-001, FMEDIT-008 and REVIEW-015 from BLOCK-058; FMEDIT-008 from
  BLOCK-109 and TRUST-005; FMEDIT-008 and REVIEW-015 from TRUST-065; REVIEW-001 from TRUST-001; REVIEW-012 from
  LIFE-170; FMEDIT-005 from FMSCHEMA-084 (now `relates_to`); FMSCHEMA-091 gains `relates_to` StRS FMSCHEMA-001.
- Owner approval: the approved StRS REVIEW-001, 003, 012 and 015 were re-approved by the owner on 2026-11-17
  (`approved_at` 2026-11-17T22:55:00+01:00). Commits: "docs: add a use case diagram to the comments file StRS",
  "docs: add a use case diagram to the comment write StRS and cite the merged reply SwRS", "docs: state that the TODO
  action comes from the palette or the slash menu", "docs: add a use case diagram to the thread reply StRS, undo step
  cited not derived". REVIEW-012 now says the TODO action comes from the palette or the slash menu (it has no
  shortcut).
- Markers: the 14-ID file-level blocks of `okfFrontmatter.test.ts` and `previewEditing.test.ts` are split onto their
  tests and steps (at most 3 per marker block); `realInput/markers.ts` lost the FMEDIT-019, FMSCHEMA-039, 043, 063
  lines and the StRS FMEDIT-001, 005, 008, FMSCHEMA-001, 014 lines, which now sit on their scenarios; the
  FMEDIT-054 check moved onto a focused FMEDIT-016 test in `pageToHost.test.ts`; `propertiesTable.ts`,
  `okfFrontmatter.ts`, `frontmatterEdit.ts` and `commentStyles.ts` carry one marker per branch (the comment
  stylesheet is split into named parts, same bytes); `scripts/marker-baseline.json` only shrank.
- New tests: `okfFrontmatter.test.ts` and `previewEditing.test.ts` keep their assertions (the patch tests moved to
  `okfFrontmatterPatches.test.ts`, the step helpers to `previewEditingHelpers.ts`, for the 1500-line limit); a flush
  test (FMEDIT-067) in `frontmatterEdit.test.ts`; a comments-file rename test (REVIEW-125) in
  `reviewReqComments.requirements.test.ts`; a refusal test of the frontmatter save message (FMEDIT-016) in
  `pageToHost.test.ts`; `commentStyles.test.ts` is marked; two real-window steps in `previewEditing.test.ts`
  (schema order and badge, schema problem row) and the real-window scenario `scenarioTodoToggle`
  (`realInput/blockKeys.ts`, REVIEW-012), type-checked only. Each new unit test was shown failing once with a
  broken assertion.
- No product behaviour change.
- Verified: `just requirements-update` and `just requirements-lint` pass (0 files would change after the update);
  `okfreq trace requirements --json` shows each in-force SwRS of the three scopes with an `@implements_req` and a
  focused `@tests_req`, and a validation test on each in-force StRS; `just check` and
  `just check-settings unit` pass; the real-window suites (`just e2e`) were not run.

### Garden the requirements of palette-slash, theme-zoom and layout-width (CR-345)

- Added (proposed): StRS-MDOKFSTUDIO-PALETTE-019, 020 and 021 replace the umbrella StRS-MDOKFSTUDIO-PALETTE-001
  (formatting buttons and shortcuts; GitHub Flavored Markdown constructs; MyST constructs), and SwRS-MDOKFSTUDIO-PALETTE-276
  to 280.
- Superseded, old to new:
  - StRS-PALETTE-001 to StRS-PALETTE-019, 020, 021;
  - SwRS-PALETTE-045, 048, 135, 138, 126 to PALETTE-276 (inline marker buttons);
  - SwRS-PALETTE-049, 052, 053, 123, 267 to PALETTE-277 (line-prefix buttons);
  - SwRS-PALETTE-265, 273, 274 to PALETTE-278 (starter blocks) and PALETTE-001 (mode membership);
  - SwRS-PALETTE-130, 137 to PALETTE-127; SwRS-PALETTE-268 to PALETTE-238;
  - SwRS-PALETTE-010 and SwRS-THEME-013 to SwRS-LIFE-169; SwRS-LAYOUT-018 to SwRS-LAYOUT-011.
- Split out: the scroll-follow scenario of PALETTE-021 became PALETTE-279 (derived from StRS-PALETTE-005), the rule
  icon of PALETTE-002 became PALETTE-280 (derived from StRS-PALETTE-019).
- Reparented: the in-force SwRS that derived from StRS-PALETTE-001 now derive from 019, 020 or 021 (PALETTE-039 and
  052 keep StRS-PALETTE-015 too), or only from the other parent they already had (StRS-PALETTE-002, 005, 007, 013,
  015 or 018); PALETTE-114 derives from StRS-REVIEW-015, PALETTE-275 from StRS-PALETTE-015, and PALETTE-115 from
  StRS-PALETTE-020 only (it no longer derives from StRS-PALETTE-005); the deprecated PALETTE-086 keeps
  StRS-PALETTE-001. Other SwRS only drop a palette or theme parent and keep their other parents: TABLE-085 drops
  StRS-PALETTE-015, TABLE-111 drops StRS-PALETTE-001, CORE-028 drops StRS-THEME-002, TRUST-001 drops
  StRS-PALETTE-002, TRUST-005 and TRUST-065 drop StRS-PALETTE-007 and 013, TRUST-006 drops StRS-THEME-011, and
  PALETTE-192, 196 and 203 drop StRS-PALETTE-013. SwRS-LIFE-169 and LIFE-170 no longer derive from StRS LAYOUT-003,
  PALETTE-002, THEME-004 and THEME-011, which cite them through `depends_on`. Main paths that cited a superseded SwRS
  now cite the merged one.
- Changed text: StRS PALETTE-002 (four nested modes), PALETTE-005 (title reworded, "visible" becomes "in reach"),
  PALETTE-018 (Explorer drops, pasted URL), LAYOUT-004 (history removed) and THEME-002 (the clause on recording the
  reduced-motion preference removed); a `### Use case diagram` added on all 15 in-force StRS of the three scopes.
- Rewritten in place (same ID, text corrected): SwRS-THEME-034, PALETTE-275, LAYOUT-023, LAYOUT-044, THEME-001,
  LAYOUT-022, LAYOUT-011, LAYOUT-001, LAYOUT-002 (verification notes), THEME-016 and THEME-043 (verification
  notes); the SwRS that took merged text: PALETTE-001, 127 and 238, LIFE-169 and LAYOUT-011; PALETTE-002 and 021 lost
  the text split out to PALETTE-280 and 279. The table scenarios of LAYOUT-023 moved to LAYOUT-044; the Margin
  wide-table scenario of LAYOUT-022 and the narrow-table part of a LAYOUT-001 scenario now point to LAYOUT-032; the
  machine geometry checks scenario of LAYOUT-001 was removed (test infrastructure, not a requirement) and the
  unknown-mode refusal of THEME-001 was removed (LIFE-170 owns it). Verification notes and known issues of
  LAYOUT-002, 011, 022, 023, THEME-016 and THEME-043 name the new unit tests.
- Edited in place, no wording change (the `implemented_in_files` and `tested_in_files` lists follow the moved
  markers): SwRS-LAYOUT-032, 043, LIFE-049, PALETTE-069, 078, 148, 232 and THEME-025, 031.
- New unit tests: `test/core/preview/layoutThemeStyles.test.ts`, `test/page/widthModeScenarios.test.ts`, and cases in
  `previewConfiguration`, `firstClearance` and `runtimePageControls` tests.
- Approved StRS: the owner agreed in advance (CR-345 `02-answers.md`, garden-Q1) to the text corrections of
  StRS-LAYOUT-001 and StRS-LAYOUT-003; StRS-PALETTE-015 only gets a diagram and generated links, which need no
  re-approval (garden-Q2). The `approved_at` and `verified.at` of the three are set to 2026-11-17 (`approved_by`
  unchanged) and the Driver records the re-approval.
- Checks run: `just requirements-update`, `just requirements-lint`, `just check-markers` and
  `okfreq validate --check-links`.

### Gardening of rendering-core, diagrams and trust-security (CR-347)

- Added (proposed): StRS-MDOKFSTUDIO-DIAG-015 (charts and drawings), CORE-006 (writing skill), CORE-007 (release) and
  CORE-008 (published site); SwRS-MDOKFSTUDIO-CORE-088 (CommonMark, palette-mode and long-document scenarios split from
  CORE-001), CORE-089 (inline code split from CORE-028), DIAG-129 (the renderer-script rule, written once), TRUST-091
  (restricted-reads images split from TRUST-002) and TRUST-092 (the package bundle split from TRUST-074).
- Superseded, old to new:
  - SwRS-TRUST-006 to TRUST-005 (the 13 `depends_on` links and CODE-025 now point to TRUST-005);
  - SwRS-GFM-029 to CORE-071, and GFM-030, GFM-033, CORE-044 and CORE-062, which pointed to GFM-029, to CORE-071;
  - SwRS-TRUST-061, 062, 063 and 064 to TRUST-059 (payload table added; TRUST-059 also derives StRS TOOLBAR-011 and
    BLOCK-006).
- Merged, not superseded: the "drawn once" rule of the diagram engines now sits in DIAG-009 (engine-agnostic);
  DIAG-039 and DIAG-123 keep their own behaviour and cite DIAG-009, and DIAG-097 lost its cache text. DIAG-039 and DIAG-123 were not
  superseded as first planned, because they hold other behaviour (PlantUML key and queue; the chart picture).
- Split: CORE-001 (to CORE-088), CORE-028 (to CORE-089), DIAG-001 (renderer-script rule to DIAG-129, cited by DIAG-001,
  DIAG-023 and DIAG-124 through `depends_on`), TRUST-002 (to TRUST-091), TRUST-074 (icon stays; bundle to TRUST-092).
- Reparented: DIAG-121 to 127 now derive from StRS DIAG-015; CORE-073 and 074 from CORE-006; CORE-075, 076 and 078 from
  CORE-007; CORE-069 and 080 to 086 from CORE-008. Dropped as parents: TRUST-052 (CORE-001), REVIEW-017 and 038
  (DIAG-001, DIAG-006), DIAG-001 SwRS (DIAG-006), TRUST-074/075 (DIAG-006), TRUST-065 and 090 (DIAG-009), LIFE-026
  (TRUST-001), CORE-041 (TRUST-006), LIFE-062 (TRUST-004), BLOCK-238, FMEDIT-054 and GFM-027 (TRUST-009). StRS DIAG-006
  and DIAG-015 list DIAG-009 and DIAG-129 under `depends_on`; the refusal rows of CORE-013, DIAG-054 and DIAG-122
  cite the allowed-roots rule TRUST-025.
- Decisions: DIAG-061 keeps its own include depth rule (`MAX_INCLUDE_DEPTH`, `PLANTUML_INCLUDE_MAX_DEPTH`) instead of
  citing CORE-013. TRUST-086 (only parent StRS TRUST-009) and DIAG-050 (only parent StRS DIAG-009) keep their single
  parent, so the planned drop did not apply. StRS CORE-002 is reworded to what the code does: included content is
  shown in place and edited in its own file (the old text promised editing from the include location, which the code
  never allowed); the owner is asked in the pull request.
- Changed text: StRS DIAG-007 (at most 2 processes at once), DIAG-009, TRUST-009, TRUST-012, TRUST-014; CORE-070
  rewritten as an observable outcome; W002 cleared on CORE-071, 076, 078, 080 and 085 (placeholders written without
  angle brackets); a `### Use case diagram` on the 17 in-force StRS of the scope (CORE-003 is a state diagram, kept
  simple and not checked in Node).
- Approved StRS: the owner agreed in advance (garden-Q1) to the corrections of StRS CORE-001 (refusal option removed
  from Main path 1), DIAG-001 and DIAG-006 (rationale trimmed to the need, constraints and Main paths); their
  `approved_by` and `approved_at` are set again (2026-11-17, +01:00) and the Driver records the re-approval, one commit
  per StRS.
- Not in this change yet: the marker moves (spec section 5) and the new tests (sections 6 and 7).

### Use case diagram on each StRS page

- Added: SwRS-MDOKFSTUDIO-CORE-087 (proposed, derived from StRS-MDOKFSTUDIO-TRUST-014): the site requirements
  viewer draws the Mermaid fence of a `### Use case diagram` section as an inline SVG in the site's colours under
  the user need, and the site build stops with the StRS id and Mermaid's message when a fence cannot be drawn.
  `project.guidelines.md` gets the rule "Use case diagram of a StRS" (optional, before Main paths).
- Sources: `test/site/requirementsViewer/useCaseDiagram.ts`, `write.ts`, `pages.ts`; marker in
  `src/core/render/requirementsViewer.markers.ts`. Tests: `test/site/requirementsViewer/useCaseDiagram.test.ts`,
  `pages.test.ts`, `model.test.ts`.

### Requirement markers gated

- Changed: SwRS-MDOKFSTUDIO-DIAG-128 gets its implementation markers (`whenDiagramsSettled` and the export
  run in `src/page/modules/exportSnapshot.ts`, `embedImages` in `src/core/export/exportContent.ts`); the stale
  `@tests_req SwRS-MDOKFSTUDIO-LAYOUT-021` is removed from `test/session/diagReq.viewState.requirements.test.ts`;
  `just check-markers` now refuses an in-force SwRS with no `@implements_req`, a marker block of more than 3 IDs
  and a companion marker line that does not name its scenario or code point (baseline
  `scripts/marker-baseline.json`); the four `*.markers.ts` companions name their code points and
  `plantumlBundle.markers.ts` now marks `esbuild.mjs`. No normative change.
- Sources: `scripts/check-marker-companions.mjs`, `src/page/modules/exportSnapshot.ts`,
  `src/core/export/exportContent.ts`. Tests: `test/build/checkMarkers.test.ts`.

### A Main path may cite an SwRS the StRS depends on (CR 341)

- Changed: `requirements/guidelines/project.guidelines.md` ("Main paths of a StRS"): a cited SwRS derives from the StRS or is in its `depends_on`. No requirement changed.
- Sources: `scripts/check_main_paths.py`. Tests: `test/build/test_check_main_paths.py`.

## 2026-11-14

### The version commit carries no Signed-off-by trailer (CR 325)

- Changed: SwRS-MDOKFSTUDIO-CORE-075 (the version script creates one commit `chore: version X.Y.Z` with
  no `Signed-off-by` trailer; description, normative text and nominal scenario).
- Sources: `scripts/version.py`. Tests: `test/build/test_release.py`.

### The version push dispatches the release workflow (CR 324)

- Changed: SwRS-MDOKFSTUDIO-CORE-076 (nominal scenario "Version change on main with a green heavy run":
  `release` dispatches the Release VSIX workflow with the tag instead of calling it; no other change).
- Sources: `.github/workflows/ci.yml`, `.github/workflows/release.yml`. Tests: `test/build/test_workflows.py`.

## 2026-11-13

### A grid behind a tab list marker opens the editor on its own line (CR 321)

- Changed: SwRS-MDOKFSTUDIO-BLOCK-258 (boundary scenario "A grid card inside a list item" now covers a
  marker followed by a tab and cards indented with a tab; verification note extended; no normative change).
- Sources: `src/core/render/mystGridToctree.ts`. Tests: `test/core/render/gridCardTitleSourceLine.test.ts`.

### A grid card in a list item opens the editor on its own line (CR 319)

- Changed: SwRS-MDOKFSTUDIO-BLOCK-258 (new boundary scenario "A grid card inside a list item" and its
  verification note; no normative change).
- Sources: `src/core/render/mystGridToctree.ts`. Tests: `test/core/render/gridCardTitleSourceLine.test.ts`.

### A grid inside a GitHub alert stays inside it (CR 320)

- Changed: SwRS-MDOKFSTUDIO-GFM-009 (new row in "Alerts inside a colon container": the admonition's colon
  fence is longer than every colon fence of its body, so a `::::{grid}` of cards stays in the note and the
  text after the alert stays outside; criteria and method extended).
- Sources: `src/core/render/mystGithubAlerts.ts`. Tests: `test/core/render/alertInsideColonContainer.test.ts`.

### The floating toolbar becomes a 4 x 4 grid (CR 318)

- Changed: SwRS-MDOKFSTUDIO-TOOLBAR-001 (four rows of four buttons: main, navigation, view, review; the
  Tab order; the handle strip geometry y 12 to 146, confirmed by the heavy run log: toolbar 134x134 at 12),
  SwRS-MDOKFSTUDIO-TOOLBAR-005 (Fold on row 3), -007 (the collapsed Tab order is Refresh, Edit, Export to
  HTML and Show view controls, fixing a wrong scenario; the group holds three rows), -130 (rows 2 to 4),
  SwRS-MDOKFSTUDIO-TRUST-001, SwRS-MDOKFSTUDIO-LIFE-049 (pending notice 160 px from the top when
  expanded), -170, SwRS-MDOKFSTUDIO-REVIEW-008 (Side-by-side on row 4), SwRS-MDOKFSTUDIO-THEME-001 (Theme
  on row 2), the known issue of SwRS-MDOKFSTUDIO-LAYOUT-020 and StRS-MDOKFSTUDIO-TOOLBAR-001.
- Approved: StRS-MDOKFSTUDIO-LAYOUT-003 changed with the owner's agreement of 2026-11-13 (the Width button
  is on row 3; `approved_by` gaetan@xeberon.net, new `approved_at`).
- Sources: `src/core/preview/previewToolbar.ts`, `src/core/preview/styles/pageChromeStyles.ts`. Tests:
  `test/core/preview/previewStyles.test.ts`, `test/visual/capture_layout_checks.py`,
  `test/integration/tableMoves.ts`, `test/page/runtimePageControls.test.ts`.

### Cmd+S saves the document from the preview (CR 312)

- New, proposed, deriving from StRS-MDOKFSTUDIO-BLOCK-008: SwRS-MDOKFSTUDIO-LIFE-173 (the save key with
  the focus in the side preview writes the text typed in an open block or cell editor, keeps that editor
  open, writes and closes an open frontmatter field, then saves the document the preview shows). Its
  sources are `src/host-vscode/activation.ts`, `src/session/previewManager.ts`,
  `src/session/features/blockEdits.ts`, the two protocol messages and `src/page/features/blockEditor.ts`;
  its tests are `test/session/saveCommand.test.ts`, the page runtime tests, the protocol tests,
  `test/security/package-contract.test.ts` and `test/integration/saveKey.test.ts`.
- The custom editor is not claimed: its native save is checked in the real-window test (decision 5).

## 2026-11-12

### The e2e report names each failed visual check (CR 306)

- SwRS-MDOKFSTUDIO-CORE-076 gains a boundary row on the failure text of the `report` stage: each
  `{page, detail}` failure of a visual manifest prints as `<page>: <detail>`, never as
  `[object Object]`. Its code is `scripts/e2e-campaign.mjs` (`failureText`) and its test is
  `test/site/e2eCampaign.test.ts`.

### A grid inside a quote maps its cards to their own lines (CR 308)

- SwRS-MDOKFSTUDIO-BLOCK-258 (proposed, not approved): new boundary scenario "A grid card inside a
  quote" (a `{grid}` written in a `>` quote whose body starts with a blank quoted line opens the
  editor on the card's own line, not the line above); no normative change. Tests in
  `test/core/render/gridCardTitleSourceLine.test.ts`.

### A GitHub alert keeps its title when it starts with a heading or a bold line

- SwRS-MDOKFSTUDIO-GFM-009 (proposed, not approved): new boundary scenario "The first body line never
  becomes the title" (`> [!NOTE]` followed by a heading or a lone bold line keeps the title Note and
  the line in the body, as GitHub renders it); `src/core/directives/admonition.ts` is added to its
  sources and `test/core/render/alertTitle.test.ts` to its tests.
- SwRS-MDOKFSTUDIO-MYST-001 (proposed, not approved): a boundary line says that a GitHub alert is not
  an untitled admonition, so the title shortcut does not apply to it.

### Export to HTML keeps what is under an open editor (CR 310)

- SwRS-MDOKFSTUDIO-TOOLBAR-137 amended: the Known issue row ("A block editor is open") is replaced by
  the behaviour: a block, a table cell or a front matter key or value being edited is written as last
  rendered, the editor stays open and the export saves nothing. The Known issue was wrong for a block:
  it was already exported. The reproduction (`test/page/exportWhileEditing.test.ts`) showed the real
  losses were the table cell (its content stayed in a hidden wrapper) and the front matter key and
  value (their display kept `hidden`); `removeChrome` now unwraps and shows them. Verification adds
  that test and the visual scenario toolbar-navigation/v44.

### A long heading in the sticky band stays on one line (CR 311)

- SwRS-MDOKFSTUDIO-TOOLBAR-025 amended: each heading level of the band stays on one line, cut with an
  ellipsis, instead of wrapping onto more lines; the scenario "Long heading path wraps" is replaced
  by "Long heading cut with an ellipsis"; visual scenario v05 is reworded (new slug
  `v05-sticky-long-path-ellipsis-dark-460`) and a new visual scenario
  `toolbar-navigation/v45-sticky-long-title-zoom-160-cream-900` is added.
- StRS-MDOKFSTUDIO-TOOLBAR-004: the rationale line says the band keeps each level on one line, cut with
  an ellipsis, instead of wrapping in a narrow pane.

### One cream look for the whole published site (CR 303)

- New, proposed, deriving from StRS-MDOKFSTUDIO-TRUST-014: SwRS-MDOKFSTUDIO-CORE-086 (every page and
  social picture of the Pages site uses the cream palette of the extension, every page carries the one
  site header, and no page has a dark palette, a `prefers-color-scheme: dark` rule or a theme switch).
  Its source companion is `src/core/render/siteTheme.markers.ts`; its tests are in
  `test/site/siteTheme.test.ts`, `test/site/siteLinks.test.ts` and `test/site/requirementsViewer/`.
- SwRS-MDOKFSTUDIO-CORE-069 (proposed, not approved): its verification note no longer says that the
  published look in light and dark is not asserted; the look is cream only and CORE-086 asserts it.

### The site requirements viewer replaces the Requirements page (CR 302)

- SwRS-MDOKFSTUDIO-CORE-069 (proposed, stable, not approved) amended: the Requirements home is now
  written at `requirements/` and keeps the chain diagram, the worked example and the figures; the
  old `requirements.html` redirects to it, the site navigation links `requirements/`, and the
  lifecycle is read from `req_lifecycle` (falling back to `lifecycle`). Its source companion is now
  `src/core/render/requirementsViewer.markers.ts`, its tests are in `test/site/requirementsViewer/`.
- New, all proposed, all deriving from StRS-MDOKFSTUDIO-TRUST-014: CORE-080 (areas, area pages and use
  case lists), CORE-081 (the map of a use case from its Main paths), CORE-082 (a page for each
  behaviour), CORE-083 (retired requirements behind History), CORE-084 (the search index), CORE-085
  (a social card for each level).
- The `### Main paths` format is unchanged (documented in `project.guidelines.md`, checked by
  `scripts/check_main_paths.py`); the viewer reads it with its own parser, which does not check the
  cited ids.

### Main paths in the StRS

- 78 of the 80 active StRS got a `### Main paths` section (one or two paths each), drawn from the StRS
  and the active SwRS that derive from it. Each step and option cites an existing, active SwRS of that
  StRS and says only what that SwRS specifies. No SwRS, scenario or criterion was changed.
- StRS left without a section, because their SwRS are unrelated constraints and not a path:
  StRS-MDOKFSTUDIO-TRUST-012 (SwRS TRUST-070 and TRUST-074: no mention of Sphinx, an icon) and
  StRS-MDOKFSTUDIO-TRUST-014 (SwRS CORE-069, TRUST-074 and TRUST-075: requirements page, icon, Node and
  registry pins).
- The 16 approved StRS changed, with the owner's agreement of 2026-11-12 ("Yes, all 16"), were restamped:
  `approved_at` (2026-11-12T12:30:00+01:00, `approved_by` stays gaetan@xeberon.net): BLOCK-003, BLOCK-025,
  CORE-001, DIAG-001, DIAG-006, GFM-002, LAYOUT-001, LAYOUT-003, MYST-001, PALETTE-015, REVIEW-001,
  REVIEW-003, REVIEW-012, REVIEW-015, TABLE-001, TABLE-012.
- New check `scripts/check_main_paths.py`, run by `just requirements-lint`: every SwRS cited in a Main
  paths section must exist, be active (draft, proposed or approved) and derive from that StRS. The
  format is documented in `requirements/guidelines/project.guidelines.md`. The check is build tooling and
  has no SwRS.
- Verified: `just requirements-update` (no further change), `just requirements-lint` (main paths: 78 StRS
  checked, 536 SwRS citations, all valid), `just release-tests`.

## 2026-11-11

### The label rename field no longer covers the table below its icon (CR 290, QA271-09)

- SwRS-MDOKFSTUDIO-MYST-038 (proposed, stable, not approved) amended: the Rename label field of a label
  held by no paragraph or heading (a table, a code block, a figure, a directive) opens above its icon,
  anchored by its bottom edge, after scrolling the page up by the missing height when the room above is
  short; at the very top of the document it opens under the icon as before. A press on a table cell
  while the field is open closes it and opens the cell editor in the same click (the outside-press
  row, now tested). The field's padding and border no longer push it past a narrow pane. No approved
  requirement changed. Source: place in src/page/modules/labelRename.ts (and box-sizing in
  src/core/preview/styles/contentBlockStyles.ts); tests: test/page/modules/labelRename.test.ts,
  test/integration/realInput/labelRenameAboveTable.ts and test/visual/capture_label_rename.py.

### Find scrolls a sideways-scrolled table to its hit (CR 289, QA271-08)

- SwRS-MDOKFSTUDIO-TOOLBAR-010 (draft, not approved) amended: the current match is also brought into view
  inside any box that scrolls sideways (a wide table or its wrapper, a code block), innermost first, so the
  hit text lies inside the box with a 16 px margin (a hit wider than the box is aligned on its start; a hit
  already in view writes no scrollLeft; the page never scrolls sideways). New nominal scenario and two
  boundary rows. No approved requirement changed. Source: src/page/modules/revealInline.ts (called by
  scrollToCurrent in src/page/modules/findBar.ts); tests: test/page/modules/findBar.test.ts,
  test/visual/capture_find_wide_table.py (toolbar-navigation/v41) and
  test/integration/realInput/findWideTable.ts.

### A "Tab: new row" hint in the last cell, and Escape removes an empty row added by Tab (CR 293, QA271-13)

- SwRS-MDOKFSTUDIO-TABLE-035 (proposed, stable, not approved) amended: in the last cell of the last
  rendered row of a table the cell editor shows the hint Tab: new row in its actions row before Done
  and Cancel, and the text box names it with `aria-describedby`; no other cell shows it; the editor
  reopened in the row that Tab added remembers it (see TABLE-025). New scenario "The last cell shows the
  Tab hint". SwRS-MDOKFSTUDIO-TABLE-025 (proposed, stable, not approved) amended: Escape or Cancel in a
  row that Tab added in the session that opened in it, every cell of the row being empty once the open
  cell is back to its opening text, removes the row and saves the table in one edit; the mark lives for
  that session only and a row added with Row below is never marked. Five scenarios added (Escape, Cancel,
  typing in the first cell, a cell left holding text, Row below). No approved requirement changed.
  Source: src/page/modules/tableTabRow.ts, cancelTableCellEdit, tabThroughTableCells and
  renderTableCellEditor in src/page/features/tableCellEditor.ts, the `addedRow` flag of
  PendingBlockNavigation (src/page/features/pageRuntime.ts, blockEditor.ts) and
  resumePendingBlockNavigation in src/page/features/editMode.ts; tests:
  test/page/runtimeTableCellTabRow.test.ts, test/visual/capture_table_tab_hint.py (v30, v31) and
  test/integration/realInput/tableTabRow.ts (real window, CI only).

### A spreadsheet paste into a table cell fills the cells (CR 292, QA271-12)

- New SwRS-MDOKFSTUDIO-TABLE-120 (proposed, stable, not approved): a text with a tab pasted into a cell
  text box is a grid paste. Its values fill the cells from the open cell, rightwards and downwards, the
  missing columns are added at the right and the missing rows at the end, the table is saved in one edit
  (one undo step) and the editor reopens in the start cell. SwRS-MDOKFSTUDIO-TABLE-091 (proposed, stable,
  not approved) amended: its pasted line break scenario is a text without a tab, and it relates to
  TABLE-120. No approved requirement changed. Source: src/page/modules/tableGridPaste.ts and the paste
  listener of src/page/features/tableCellEditor.ts; tests: test/page/modules/tableGridPaste.test.ts,
  test/page/runtimeTableCellPaste.test.ts, test/integration/realInput/tableGridPaste.ts and the visual
  scenario table-editing/v32-grid-paste-light-900 (test/visual/capture_table_grid_paste.py).

### A table inside a quote, an alert or an admonition opens the cell editor (CR 291, QA271 C3-3)

- SwRS-MDOKFSTUDIO-TABLE-121 added (proposed, stable, not approved), deriving from StRS-MDOKFSTUDIO-TABLE-001:
  a click on a cell of a pipe table inside a blockquote, a GFM alert or a MyST admonition opens the cell
  editor and the table bar; every table line is written back with its container prefix, the other lines of
  the container stay byte for byte, a table that cannot be located safely opens the raw block editor, and
  Convert to list-table is disabled for it. The row and column handles move such a table with the prefix
  kept. Non-normative boundary rows added to TABLE-002 and TABLE-007 (the row and column handles of a
  contained table), TABLE-035 (the reopen after Tab finds the table by its rank) and TABLE-070 (Convert
  to list-table disabled with its reason). TABLE-001 gains a related-requirements line. No approved requirement changed. Source:
  src/page/modules/tableInContainer.ts, markdownTable.ts (serialize), features/blockSourceEditor.ts,
  blockEditor.ts, editMode.ts, tableCellEditor.ts, tableRowMove.ts; tests:
  test/page/modules/tableInContainer.test.ts, test/page/runtimeTableInContainer.test.ts,
  test/page/runtimeTableRowMove.test.ts, visual scenarios table-editing/v33 and v34 and
  test/integration/realInput/tableInContainer.ts.

### Export a page to one self-contained HTML file (CR 288)

- StRS-MDOKFSTUDIO-TOOLBAR-014 and SwRS-MDOKFSTUDIO-TOOLBAR-134, -135, -136, -137, SwRS-MDOKFSTUDIO-FMSCHEMA-091
  and SwRS-MDOKFSTUDIO-DIAG-128 added (proposed, not approved): the Export to HTML command and toolbar
  button, the removal of links to other files after a warning, the self-contained file without script,
  the content without comments and editing controls, the closed properties details and the exported
  diagrams. SwRS-MDOKFSTUDIO-TOOLBAR-001 (proposed, stable, not approved) amended on the owner's decision:
  the toolbar holds 16 buttons, the main row has four (Refresh, Edit, Export to HTML, collapse) and the
  other four rows keep three; the toolbar stays no wider than 134 px. SwRS-MDOKFSTUDIO-TRUST-001 counts
  16 buttons. No approved requirement changed. Source: src/core/export/, src/page/modules/exportSnapshot.ts,
  src/session/features/htmlExport.ts, src/core/preview/previewToolbar.ts and src/host-vscode/activation.ts;
  tests: test/core/export/htmlExport.test.ts, test/page/modules/exportSnapshot.test.ts,
  test/session/htmlExport.test.ts, test/core/preview/previewStyles.test.ts,
  test/visual/capture_export_html.py and test/integration/exportHtml.test.ts.
- CI fix at 460 px: SwRS-MDOKFSTUDIO-MYST-081 (proposed, not approved) now reserves 156 px at the right of the
  warning banner (the four-button toolbar row) instead of 124 px; StRS-MDOKFSTUDIO-TOOLBAR-001 lists Export to
  HTML in row 1. The inline-code control paragraph of test/visual/fixtures/22-inline-code.md is shorter so it
  stays on one line beside the wider floating toolbar; the check itself is unchanged.
- Round 2: TOOLBAR-134 states the too-large and refused snapshot (the page and the host answer, the
  button works again); TOOLBAR-137 states that an unavailable diagram does not hold the export and
  records the open block editor as a known issue (the block is missing from the file; backlog item).

## 2026-11-10

### Block ids and tokens at the end of a table row (CR 279, QA271-02 and QA271-10)

- SwRS-MDOKFSTUDIO-TABLE-001, -002, -007, -076, -094, -102, -111, -117 and -070 (proposed, stable, not approved)
  amended: a body row with text after the closing pipe of its last column (`| a | 1 | ^row-a`) is a row
  of the header's columns plus a tail kept verbatim, so the table stays editable (cell editor, row and
  column handles); a column move or insert that makes the source's last column no longer last lifts a
  `^id` ending that cell to the end of its row; a pipe table whose row has a tail is not converted
  to a list-table or an HTML table (refusal reason, no edit); aligning with the caret in a tail gives no
  edit. TABLE-102 no longer says a row with an extra cell is refused: the editor reads the same cells
  as the preview and keeps the rest as the tail. No approved requirement changed. Source:
  src/page/modules/markdownTable.ts (parse, serializePipe), tableConversion.ts (pipeGrid) and
  tableEditActions.ts (htmlTable, alignColumn); tests: test/page/modules/markdownTable.test.ts,
  tableColumnMove.test.ts, tableRowTailActions.test.ts, test/page/runtimeTableRowMove.test.ts,
  runtimeTableRowTail.test.ts and test/integration/realInput/tableRowTokens.ts.

### A table with a one or two dash delimiter row opens the cell editor (CR 278, QA271-04)

- SwRS-MDOKFSTUDIO-TABLE-001 (proposed, stable, not approved) amended: a delimiter cell is one dash or
  more with optional colons (/^:?-+:?$/), the delimiter line holding a pipe when a cell has fewer than
  three dashes, so a setext heading is still no table. The boundary table gains the ":--" / "--:" and
  "-" rows and the heading refusal row. TABLE-111 gains one boundary row: a short cell ":--" aligned
  right becomes "---:". No approved requirement changed. Source: parse in
  src/page/modules/markdownTable.ts; tests: test/page/modules/markdownTable.test.ts (also the TABLE-111 row),
  test/page/fmtableReqTable.requirements.test.ts and
  test/integration/realInput/tableShortDelimiter.ts.

### The preview table shows the buffer after an undo or a revert (CR 277, QA271-05 and QA271-06)

- SwRS-MDOKFSTUDIO-TABLE-119 (proposed, new, derives from StRS-MDOKFSTUDIO-TABLE-001, which is
  unchanged): an outside change (undo, redo, revert, another tool) over the source lines of the
  table whose cell editor the page has open lets the render of the buffer reach the page at once,
  releases the host edit without writing, and the content patch closes the cell editor without a
  save. A change elsewhere, text typed in the source and the preview's own saves still wait.
  SwRS-MDOKFSTUDIO-LIFE-069 (scenario added: a block the page rewrote is rebuilt by the next patch
  even when its host HTML is unchanged), SwRS-MDOKFSTUDIO-BLOCK-193 (the exception, with a
  depends_on link to TABLE-119) and SwRS-MDOKFSTUDIO-BLOCK-191 (a table cell editor releases the
  edit instead of keeping an error) amended, all proposed; TABLE-035 gains markers only. No approved
  requirement changed. Source: releaseCellEditorOnOutsideChange in src/session/features/blockEdits.ts
  (called by refreshPreview in src/session/hostEvents.ts), the recorded range in
  src/core/state/editLock.ts, the `cellEditor` flag of previewEditOpen (src/page/features/blockEditor.ts,
  src/core/protocol/pageToHost.ts) and ContentMorph.invalidate (src/page/modules/contentMorph.ts, called
  by switchTableCell in src/page/features/tableCellEditor.ts); tests: test/host/previewTiming.test.ts,
  test/core/state/editLock.test.ts, test/page/modules/contentMorph.test.ts,
  test/page/runtimeTableCellStale.test.ts, test/core/protocol/pageStateMessages.test.ts and
  test/integration/realInput/tableStaleRender.ts (real window, CI only).

### An undone row delete brings the comment mark back (CR 280, QA271-03)

- SwRS-MDOKFSTUDIO-REVIEW-119 (proposed, stable, not approved) amended: an undo or a redo whose
  change event reports unsaved changes shifts the lines followed in memory, then every thread is
  checked again starting from them (the dirty flag of a change event is the state before the change,
  so an undo back to the saved text still reports unsaved changes); a change flagged clean still
  drops them. SwRS-MDOKFSTUDIO-REVIEW-219 (proposed, new, derives from StRS-MDOKFSTUDIO-REVIEW-008
  and StRS-MDOKFSTUDIO-REVIEW-001): while a thread is orphaned and the document text changes, the
  orphan is checked again and, when its quote is found, is posted on the found lines with orphaned
  false; nothing is written. No approved requirement changed.
  Source: shiftForEdits and post in src/session/features/comments.ts; tests:
  test/session/reviewReqComments.requirements.test.ts, test/integration/commentAnchors.test.ts and
  test/integration/realInput/tableCommentUndo.ts.

### The cell editor is clamped to a narrow pane (CR 282, QA271-14)

- SwRS-MDOKFSTUDIO-TABLE-006 (proposed, stable, not approved) amended: the edited cell is at least 300 px wide,
  or as wide as the table's box allows in a narrower pane, never under 8em (a boundary scenario at 280 px with
  row handles, and a window resize measures the room again). SwRS-MDOKFSTUDIO-LAYOUT-023: wording only, the
  minimum width of the edited cell now points at TABLE-006. No approved requirement changed. Source:
  fitCellToRoom in src/page/modules/cellEditorRoom.ts and the selected-cell rule of
  src/core/preview/styles/editModeStyles.ts; tests: test/page/runtimeTableCellRoom.test.ts and the visual
  scenario table-editing/v29 (test/visual/capture_table_cell_room.py).

### A click on a field below an open, unchanged field editor is no longer lost (CR 281, QA271-07)

- SwRS-MDOKFSTUDIO-FMEDIT-019 (proposed, stable, not approved) amended: a new nominal scenario and a
  refusal table. Closing an unchanged value or key editor on the press moves the rows below it up, so
  the release lands on the common ancestor of the rows and the click was lost; the click now completes
  the press on the field cell (a primary press without modifier, remembered while an editor was open
  to another cell) and opens that field's editor in the same click. A changed value still saves and
  opens nothing in that click; a click without such a press opens nothing. No approved requirement
  changed. Source: installPageInput in src/page/features/pageInput.ts (a capture mousedown listener
  and the fallback of the properties click handler); tests: test/page/runtimeFrontmatterEditor.test.ts,
  test/integration/realInput/frontmatterFields.ts (RI-T44 part 3) and the replay
  271-c4-1-click-field-below-open-editor-is-lost.json and the visual scenario
  frontmatter-editing/v09 (test/visual/capture_frontmatter_click.py).

### Escape in a table cell cancels only that cell (CR 274, QA271-01)

- SwRS-MDOKFSTUDIO-TABLE-025 (proposed, stable, not approved) amended: Escape in a cell editor outside a
  composition drops the text typed in the open cell only; the cells left earlier in the session with Tab,
  an arrow key or a click keep their text, the table is saved with them (a final save, no
  previewEditCancel) and the preview shows what the buffer holds. With no such cell, Escape restores the
  table as before. TABLE-013 and TABLE-035 are unchanged in intent (related-requirement lines added).
  The Cancel button of the cell editor follows the same path as Escape. No approved requirement
  changed. Source: cancelTableCellEdit in src/page/features/tableCellEditor.ts (the edit flag
  keptCellChange); tests: test/page/runtimeTableCellEscape.test.ts,
  test/integration/realInput/tableEscape.ts and the visual check check_cell_escape_keeps_cells_left in
  test/visual/capture_table_escape.py (ArrowDown then Escape now saves the cell left).

### Front matter values in the text: inline code that holds = this.field shows the value (CR 273, GitHub #334)

- SwRS-MDOKFSTUDIO-CORE-079 (proposed, new, derives from StRS-MDOKFSTUDIO-CORE-001, which is
  unchanged): inline code that holds exactly = this.field or =this.field shows the value of that
  field of the document's own front matter as plain text (string and number as text, boolean as
  true or false, list joined with a comma and a space, object as one line of YAML, a nested field
  with this.a.b); a field without a value (absent, empty, null, through a scalar, no or invalid front
  matter) keeps the inline code as written with a dashed warning style and one warning diagnostic
  (at most 20 per render). Other inline code and fenced blocks are unchanged. No approved requirement
  changed. Source: src/core/render/frontmatterValues.ts (a tree pass of mystRenderer.ts),
  src/core/preview/styles/frontmatterValueStyles.ts; the value follows the front matter because each
  edit renders the document again.
  Round 2: the pass runs before the toc markers (an entry, the heading anchor and the entry link are
  built from the value); an empty object counts as without a value; an included file reads the front
  matter of the including document. Round 3: the form is shown as code by keeping a backtick inside
  the code (more backticks around it do not change its text); the writing skill and the CHANGELOG say so.

### SVG pictures: an svg fence and a raw svg block are drawn inline, themed (CR 272, GitHub #336)

- SwRS-MDOKFSTUDIO-DIAG-125, -126 and -127 (proposed, new, derive from StRS-MDOKFSTUDIO-DIAG-001, which
  is unchanged): an `svg` fence and a raw `<svg>` that fills a whole block are drawn inline after an
  allow-list sanitizer rebuilt them (no script, style, foreignObject, link, handler or external URL; ids
  and their references renamed per picture); the theme vocabulary (`--surface`, `--border`, `--text`,
  `--muted`, `--accent`, `--red`... from the `--studio-*` tokens) with an unknown variable in the text
  colour; a click in edit mode opens the source editor of the block. An `<svg>` inside a sentence is still
  dropped. Source: src/core/security/svgSanitizer.ts, src/core/render/svgPictures.ts,
  src/core/preview/styles/svgPictureStyles.ts; the final sanitizer now keeps the presentation attributes
  the picture sanitizer allows (html-sanitizer.ts); Auto width reads the declared width of the picture
  (widthMode.ts).
- Round 2 (inspector findings): DIAG-125 now also states that an svg inside a comment, a `$$` block, a code
  block or a raw HTML table is not a picture (SwRS-MDOKFSTUDIO-GFM-031 unchanged: a cell drops it), that a
  reference never leaves its picture, that a value is an allow-list (colours, `var()`, `url(#id)`,
  transforms; no scheme, no `image-set()`/`src()`), and that the placeholder holds a per-render random
  token. SwRS-MDOKFSTUDIO-TRUST-036 (existing, proposed) is now also implemented/tested by the value check
  the final sanitizer applies to the SVG presentation attributes it keeps (`isSafeSvgPresentationValue`).
- Round 3 (inspector findings): DIAG-125 gains two table rows: a comment or a `$$` block opens only at
  the start of a line (a `<!--` or `$$` in a sentence or a code span no longer hides a later code block's
  text or a later picture), and an author's aria-label is kept as text. The value check of TRUST-036 now
  applies only to the SVG attributes the final sanitizer did not already allow, and only on SVG elements:
  the aria-* attributes keep the rule of main everywhere (TRUST-036 text unchanged).
- SwRS-MDOKFSTUDIO-PALETTE-229 (unchanged, checked): the paste conversion still drops an `svg` element, so
  a pasted drawing never becomes a picture and nothing in the clipboard path changed.

### Harden the cell inline Markdown shown after Tab (CR 270)

- SwRS-MDOKFSTUDIO-TABLE-035 (proposed, verification notes only): new direct unit test
  test/page/cellInlineMarkdown.test.ts; the arrow-key scenario now loops over the four keys. Code
  (src/page/modules/cellInlineMarkdown.ts): a protocol-relative `//host` link target is dropped; `_` no
  longer opens or closes emphasis inside a word and a delimiter next to a space does not open or close
  (`snake_case_name`, `2 * 3 * 4` stay text); an unclosed delimiter stays literal.

### A wide table keeps its Auto breakout while a cell is edited (CR 269)

- StRS-MDOKFSTUDIO-LAYOUT-003 (approved, changed with the owner's agreement of 2026-11-10; approved_by and
  approved_at reset): an element whose source editor is open keeps the column width; a table whose cell
  is being edited keeps its Auto breakout.
- SwRS-MDOKFSTUDIO-LAYOUT-023 (proposed, updated): the "under edit" row splits into the source editor
  (column width) and the cell editor (keeps the breakout it had when the editor opened, the same in every
  cell the editor moves to; a table that fits the column stays in it; measured again only on a real resize).
  Before, the cell field, a textarea, made the table leave its breakout and shrink to the column while a
  cell was edited. Source widthMode.ts; new real-browser tests in test/page/tableBreakout.test.ts.
- SwRS-MDOKFSTUDIO-TABLE-035 (proposed, updated): the re-scroll after a layout pass that resizes the box
  under an open editor stays; it no longer says the table leaves its breakout.

### The cell left with Tab or an arrow key shows its new text (CR 268, GitHub #335)

- SwRS-MDOKFSTUDIO-TABLE-035 (proposed, updated): the cell the editor leaves with Tab, Shift+Tab or an
  arrow key shows the text just typed, rendered as inline Markdown, without a re-render; a new scenario
  covers a new row, a changed cell and an arrow key. Before, the cell showed the content captured when
  the editor opened in it (empty for a new row). New implementing file
  src/page/modules/cellInlineMarkdown.ts; tests in test/page/runtimeTableCellEditor.test.ts and the
  real-window scenario scenarioTableTab.

## 2026-11-06

### A document is editable whatever the trust (CR 264)

- StRS-MDOKFSTUDIO-TRUST-001 and SwRS-MDOKFSTUDIO-TRUST-001, -005 and -006 (proposed, updated): trust never
  makes a document read-only. In Restricted Mode and for a standalone file the Edit button, the palette,
  the checkboxes, the comments, the image paste and every write request work as in a trusted workspace;
  only the reads stay narrow (includes, resources, schema files, the citation list, PlantUML with Java).
  The read-only reasons "Editing requires a trusted workspace." and "Editing needs the file's folder ..."
  and the greyed Edit button are gone; "This file is read-only in VS Code." stays.
- Further SwRS (proposed, updated, except the ones named below): wording follows the two meanings, "restricted reads" for the narrowed
  reads and no refusal for trust; the standalone image pick and paste use the folder of the document as
  root. BLOCK-014, -017, -058, -124, -127, -156, -169, -174, -238, -240, -242, -243; CODE-017, -019, -025,
  -026; FMEDIT-051, -054; FMSCHEMA-019; GFM-021, -026, -027, -039; MYST-042, -045, -051, -078, -081;
  REVIEW-038, -044, -054, -069, -070, -071, -074, -081, -086, -171, -178, -186, -192; THEME-001, -038;
  TOOLBAR-058, -077, -079, -083, -113, -126; TRUST-002, -007, -011, -025, -065, -090.
  Also BLOCK-001, -205, FMEDIT-001, LIFE-026, -039, -127, -143, -169, -170, PALETTE-004, -010, -148, -183,
  -192, -196, TOOLBAR-013, -014, -094, -131.
  CODE-025, FMEDIT-051, GFM-026 and MYST-042 are superseded (their wording only follows the rename) and
  SwRS TOOLBAR-014 is a draft.
- Other StRS (proposed, updated): BLOCK-001, -006, -014, -016; CODE-004; FMEDIT-001, -008; GFM-003;
  MYST-009; PALETTE-002, -007, -013, -018; THEME-011; TOOLBAR-001, -009, -011; TRUST-004. StRS
  TOOLBAR-003 is a draft.
- Approved StRS-MDOKFSTUDIO-BLOCK-025, REVIEW-003, REVIEW-015 and TABLE-001 (changed with the owner's
  agreement of 2026-11-06): "read-only preview" becomes a file that VS Code itself holds read-only in
  BLOCK-025, REVIEW-015 and TABLE-001. REVIEW-003 deletes the reason "a read-only preview" from its list of
  reasons a change cannot be saved; it is not replaced. REVIEW-015 also adds "Every preview offers the thread
  controls, Restricted Mode and a file outside the workspace included". Their approval date is
  2026-11-06T01:44:30+01:00 and approved_by stays the owner. Approved StRS-MDOKFSTUDIO-REVIEW-001 changed
  only its generated link line to SwRS TRUST-001 (title), with no lifecycle or text change.
- Verification: test/session/blockReq.requirements.test.ts, checkboxRefusal.test.ts,
  reviewReqComments.requirements.test.ts, paletteReq.requirements.test.ts and test/host/fmtableReq.requirements.test.ts
  pass in `just check` (round 1); the visual scenarios trust-security/v01 to v03 and the real-window suites
  untrusted-suite.ts and standalone-suite.ts are compiled, run only by the real-window jobs.

### Round 2: the writer is told when VS Code keeps a file read-only (CR 264)

- SwRS-MDOKFSTUDIO-TRUST-001 (proposed, updated): every write path (label rename, thread reply and delete,
  find and replace, block save, move, cut, paste, drop, checkboxes, metadata save) checks that VS Code wrote
  the edit and answers "This file is read-only in VS Code." otherwise (helper applyWrittenEdits); a pasted
  image whose block save fails that way is deleted. The test titles of lifeReq.requirements.test.ts it
  quotes follow the rename; the PlantUML reference is DIAG-024 (DIAG-025 is superseded).
- SwRS-MDOKFSTUDIO-TRUST-005 (proposed, updated): same rule in its refusal table; a dropped Markdown file is
  not read for a title in a preview with restricted reads; a standalone document accepts any dropped file.
- SwRS-MDOKFSTUDIO-PALETTE-004 (proposed, updated): the drop rules above and the read-only refusal.
  PALETTE-192 (the picker no longer says "trusted") and PALETTE-213 (no "read-only" preview) follow the
  rename, as do REVIEW-038, -054, -081, TOOLBAR-001, TOOLBAR-012 (draft) and LIFE-143 (test title).
- StRS-MDOKFSTUDIO-BLOCK-001 and FMEDIT-008 (proposed, updated): the Edit button is not withheld for trust; a metadata edit is not refused for trust, only for a file that VS Code holds read-only.
- No approved requirement is changed in round 2: StRS BLOCK-025, REVIEW-003, REVIEW-015 and TABLE-001 already
  say that the writer is told.
- Kept names: the capture id `trust-security/r01-untrusted-read-only` and the stress scenario `untrusted-read-only` keep their names (stable ids that the registry, the site tests and the baselines use).
- Flush: promotion and demotion of a preview with an open page editor flush it first (TRUST-001, LIFE-143; tests "granting trust flushes the open page editor before the preview is replaced" and "removing the folder of a preview flushes its open page editor before the preview is replaced" in test/host/lifeReq.requirements.test.ts).
- Verification: ran locally: `just requirements-update` and `just requirements-lint` (exit 0), `tsc --noEmit`, and the unit tests pasteImageWrite, blockReq.requirements and inlineThread. Not run locally: `just check`, the render-based unit tests (host/lifeReq.requirements, including the two flush tests, and the other write-path suites: they time out on the first render in this worktree), integration, e2e and visual tests.

### Comments on a long document (CR 266)

- SwRS-MDOKFSTUDIO-REVIEW-216 (proposed, new): a quote over a line break of the source is highlighted.
  The page matches any run of whitespace of a text node with a space of the quote, so a paragraph, list
  item or cell wrapped over several lines of the source (as in the repository README) is highlighted
  instead of getting a badge. The length of the document was not the cause.
- Verification: test/page/modules/commentThreadsLongDocument.test.ts.

### Comment editor position, scroll and dismissal (CR 265)

- SwRS-MDOKFSTUDIO-REVIEW-217 (proposed, new): the new comment box and the thread popover with its
  reply box sit entirely inside the window (above their text near the bottom) and follow their text
  on scroll, even out of view.
- SwRS-MDOKFSTUDIO-REVIEW-218 (proposed, new): Escape, wherever the focus is, and a press outside
  close the editor, or ask Discard or Keep editing inside it when its text is not blank; no
  `window.confirm`.
- SwRS-MDOKFSTUDIO-REVIEW-044 and SwRS-MDOKFSTUDIO-REVIEW-021 (proposed, updated): the Escape and
  click rows point to the two new requirements; the vertical position of the popover is no longer
  unspecified.
- Decisions: Escape while the question shows means Keep editing; Cancel in the box closes without a
  question; a press on a highlight with a changed reply draft asks instead of switching.
- Verification: test/page/modules/commentEditorBehaviour.test.ts. No window test ran.

### The TOC follows the toolbar

- SwRS-MDOKFSTUDIO-TOOLBAR-037 (proposed, updated): the column is placed again when the animation of
  the toolbar rows ends. It kept the position of the previous state, above or far under the toolbar.
- SwRS-MDOKFSTUDIO-TOOLBAR-130 (proposed, updated): the layout is measured again when the animating
  mark goes, also after the load hint, instead of on a transition end event that never came.
- Verification: test/page/modules/toolbarCollapse.test.ts and test/visual/capture_toc_checks.py.

## 2026-11-05

### Reviewed release notes

- SwRS-MDOKFSTUDIO-CORE-078 (proposed, new): a version needs a valid notes file under
  `docs/releases-notes/`, checked by `just check`; the release publishes it and attaches its images.
  It replaces the notes generated by Copilot, so the text published is the text reviewed.
- SwRS-MDOKFSTUDIO-CORE-075 (proposed, updated): the version script keeps LF line endings on Windows.
- Verification: test/build/test_release.py and test/build/test_workflows.py.

## 2026-11-04

### Table row colours (CR 260)

- SwRS-MDOKFSTUDIO-CORE-077 (proposed, new): a table tints its heading, its even rows and the hovered
  row with translucent theme colours; the frontmatter properties table keeps no background.
- Verification: test/visual/capture_table_row_colours.py, with a real pointer in each page theme.

### A new preview keeps its focus (CR 259)

- SwRS-MDOKFSTUDIO-LIFE-151 (proposed, updated): new boundary scenario. The unlock of a closed preview
  only considers the groups open when it closed, so it never touches a new preview's group.
- Verification: test/host-vscode/groupFocus.test.ts, and the `stress` job in a real window.

### Real VS Code jobs on every push to main (CR 258)

- SwRS-MDOKFSTUDIO-CORE-076 (proposed, updated): the heavy jobs run on every push to main, not only
  on a version change, and never on a pull request. Without a version change `stress` stays advisory
  and `tag-release` creates no tag.

## 2026-11-03

### GitHub Copilot marketplace catalog (CR 255)

- SwRS-MDOKFSTUDIO-CORE-074 (proposed, updated): the packaging also provides the GitHub Copilot
  catalog `.github/plugin/marketplace.json`, named `markdown-okf-schema-studio` like the Claude Code
  marketplace, whose single entry points at the repository root (`./`, where the Agent Plugins
  `plugin.json` lives). New refusal row: the catalog must have the required fields and limits of the
  Copilot CLI `marketplace.json` reference and no `$schema` key.
- SwRS-MDOKFSTUDIO-CORE-075 (proposed, updated): `scripts/version.py` also writes the version to the
  plugin entry of the Copilot catalog, and the version commit contains five files instead of four;
  the drift check covers the catalog entry.
- Verification: test/build/test_plugin_manifests.py and test/build/test_release.py fail on the
  previous code (no catalog file; the version commit does not contain the catalog).

### An open cell editor stays in view when its table leaves the breakout

- SwRS-MDOKFSTUDIO-TABLE-035: the reveal of the open cell and its editor runs again after every
  Auto width layout pass. Opening a cell editor takes the table out of its Auto breakout, so the box
  narrows to the column after the first reveal and the editor could end past its right edge.
- Verification: test/page/runtimeTableCellEditor.test.ts "a layout pass that narrows the table box
  brings the open cell editor back inside it" fails without the call from the layout pass.

### Grid form card headers and footers

- SwRS-MDOKFSTUDIO-PALETTE-271: the Grid form writes each card's header and footer with the `^^^` and
  `+++` separators of a grid card, the syntax the renderer draws (it wrote `:header:` and `:footer:`
  options, which only a standalone card reads, so they were dropped).

### Every rendered syntax has a slash entry (CR 248)

- SwRS-MDOKFSTUDIO-PALETTE-273 (new, proposed): the Content tabs action (MyST and Full) inserts a `{tab-set}` of
  two tabs. SwRS-MDOKFSTUDIO-PALETTE-274 (new, proposed): the PlantUML diagram action (Full) inserts a
  `plantuml` fence. SwRS-MDOKFSTUDIO-PALETTE-275 (new, proposed): every syntax of the writing skill
  table has a slash entry or a documented exception.
- Verification: test/page/modules/slashSyntaxCoverage.test.ts fails on the previous code (no
  `tabs` entry and no `plantuml` entry).

### Restricted Mode images: test gaps (CR 251)

- SwRS-MDOKFSTUDIO-TRUST-002 (proposed, updated): Verification notes reworded (each clause says what it
  covers) and test/session/baselineDiff.test.ts added to `tested_in_files` (image of the workspace
  folder in the HEAD text of the side-by-side diff). No behaviour change.
- Verification: the new test fails when `pagePolicyRoot(preview)` is reverted to
  `preview.workspaceRoot` in src/session/features/baselineDiff.ts.

### A +++ line inside a container renders as text

- SwRS-MDOKFSTUDIO-MYST-101 (proposed): a `+++` line inside a MyST directive, a quote, a list item or an
  alert renders as text instead of throwing and failing the whole render; only a root-level `+++`
  stays a block break. The card footer separator (SwRS-MDOKFSTUDIO-MYST-100) is unchanged.
- Verification: test/core/render/blockBreakInContainer.test.ts.

### A document opens in preview mode, E switches to edit mode

- SwRS-MDOKFSTUDIO-LIFE-172 (proposed): a document always opens in preview mode (only the saved
  state of the same document, on a reload, keeps edit mode; the stored workspace edit mode is no
  longer applied at start), and E alone in the preview switches to edit mode. Changed
  SwRS-MDOKFSTUDIO-LIFE-170 (edit mode row and scenarios) and SwRS-MDOKFSTUDIO-TRUST-001 (edit mode at start). Markers in
  `src/page/runtime.ts`, `src/page/features/editMode.ts` and `test/page/runtimeOpenInPreview.test.ts`.

### The TOC rail keeps the text, the tooltips and other Escape handlers clear

- SwRS-MDOKFSTUDIO-TOOLBAR-133 (new, proposed, CR 250): under 760 px with the TOC on, the content
  keeps 16 px free for the rail, the overlay is placed 40 px lower than the column top so it stays
  clear of the toolbar tooltips, and Escape closes the overlay only when it comes from the overlay,
  the rail or no focused element and no other handler consumed it.
- SwRS-MDOKFSTUDIO-TOOLBAR-037 (changed): the narrow-pane scenario now narrows the content by the
  rail only; the Escape rule points to TOOLBAR-133.
- Verification: test/page/modules/tocColumn.test.ts, test/core/preview/previewStyles.test.ts,
  test/visual/capture_toc_rail.py and capture_toc_checks.py (scenarios toolbar-navigation/v28 and
  v29, renamed from "hidden-narrow" to "rail").

### A table row drag is checked end to end

- SwRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-007 (no change of behaviour): a simulated
  scenario drags the first body row of a table that breaks out of the margin below the last one,
  checks the saved table, renders the page again as the host does and checks the rows, the
  breakout and every handle on the real edges of the table.
- Verification: test/visual/capture_table_move.py, scenario
  table-editing/v27-row-move-breakout-table-auto-light-900.

### The MyST slash menu lists the version admonitions and icons

- SwRS-MDOKFSTUDIO-PALETTE-268 (new, proposed, CR 243): the MyST slash menu lists the version
  admonitions (versionadded, versionchanged, deprecated) and gives every admonition kind the icon
  of its preview callout; a version admonition writes `:::{versionadded} 1.0` with the version
  selected. The type popover is unchanged.
- SwRS-MDOKFSTUDIO-PALETTE-238 (changed): the admonition variants row names the version admonitions.
- Verification: test/page/modules/slashMenu.test.ts; visual scenarios palette-slash/v34-slash-myst-admonitions-light-900 and
  palette-slash/v35-slash-myst-admonitions-dark-900 (test/visual/slashAdmonitionScenarios.ts).

### Type picker on an alert or admonition type

- SwRS-MDOKFSTUDIO-PALETTE-269 (new, proposed, CR 244): with the caret on the type of a GitHub
  alert head or of a MyST admonition directive, a list of the types of that syntax with their
  icons opens above it (arrows move, Enter chooses, Escape closes); a choice replaces the type
  text only.
- Verification: test/page/modules/editPalette.test.ts and the simulated visual scenarios
  palette-slash/v36 to v39 (test/visual/admonitionTypePickerScenarios.ts).

### Card and grid forms in the MyST palette and the slash menu

- SwRS-MDOKFSTUDIO-PALETTE-270 and SwRS-MDOKFSTUDIO-PALETTE-271 (new, proposed): the Card and Grid
  buttons of the MyST palette, and the matching `/` menu entries, open a form (card title, header,
  footer, link; grid columns, gutter, number of cards) whose Insert writes a `{card}` or a `{grid}`
  of `{grid-item-card}` directives.
- The Grid form also edits each card's header, footer and link (Headers, Footers and Links fields,
  one entry per card separated by `|`), as the Card form does; more entries than cards keeps the
  form open.
- Verification: test/page/modules/cardGridDirectives.test.ts, test/page/runtimePaletteActions.test.ts.

### Code-block form for MyST code-block options

- SwRS-MDOKFSTUDIO-PALETTE-272 (new, proposed, CR 246): the Code-block (MyST) button of the MyST
  palette opens a form for the language, line numbers, emphasized lines, caption and name of the
  `{code-block}` directive at the caret, or of a new one; Apply writes it as one undo step and
  leaves the other options and the code unchanged; invalid values and YAML option blocks are
  refused.
- Verification: test/page/modules/codeBlockDirective.test.ts, test/page/runtimeCodeBlockPanel.test.ts,
  test/page/modules/editActions.test.ts, test/page/modules/editPalette.test.ts.

### Auto keeps a table in the column when its minimum widths fit

- SwRS-MDOKFSTUDIO-LAYOUT-044 (new, proposed): in Auto a table stays in the column when the sum of its
  column minimums fits (token column: widest cell, never wraps; prose column: about 24 characters;
  code block in a cell: natural width) and breaks out to its natural width otherwise.
- SwRS-MDOKFSTUDIO-LAYOUT-023 (changed): a table whose minimums fit is not widened.
- Verification: test/page/tableBreakout.test.ts.

### The TOC shows as a rail on a narrow pane

- SwRS-MDOKFSTUDIO-TOOLBAR-037 (changed): on a pane under 760 px with the TOC on, the column is no
  longer hidden. A rail on the right shows one tick per heading (current section highlighted);
  hover or focus on the rail opens the column as an overlay, closed 300 ms after the pointer and
  the focus left or on Escape; a click on a tick goes to the heading.
- Verification: test/page/modules/tocColumn.test.ts, test/core/preview/previewStyles.test.ts,
  test/visual/capture_toc_checks.py (scenarios toolbar-navigation/v28 and v29).

### Table handles follow the real edges of a table that breaks out of the margin

- SwRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-007 (proposed): the row and column handles are
  placed again each time the width mode measures the page, so a table that breaks out of the
  margin (or returns to the column) after the handles were placed, as after a row or column move
  rendered the page again, keeps them on its real left edge and top.
- Verification: test/page/runtimeTableRowMove.test.ts, scenario
  table-editing/v26-handles-breakout-table-auto-light-900.

### Option toggle button and option list continuation

- SwRS-MDOKFSTUDIO-PALETTE-267 (new, proposed, CR 241): the Option button of the GFM and MyST
  palettes (next to Checkbox) adds `( )` after the list marker of the touched lines, or `- ( ) `
  to lines without one, removes it from every line when all have one, replaces a task box, and is
  one undo step.
- SwRS-MDOKFSTUDIO-BLOCK-061 (proposed, updated): Enter at the end of an option item starts the
  next line with `- ( ) ` (a numbered item counts up), and Enter on an empty option item ends the
  list; the caret inside the marker leaves Enter native.
- Verification: test/page/modules/optionAction.test.ts, test/page/modules/textEditing.test.ts,
  test/page/runtimeBlockEditor.test.ts, test/page/runtimeEditPalette.test.ts, visual scenarios
  palette-slash/v30 to v33.

### Find and replace fields keep their native editing shortcuts

- SwRS-MDOKFSTUDIO-TOOLBAR-132 (new, proposed, CR 236): the native editing keys typed in the find or
  replace field (select all, copy, cut, paste, undo, redo, caret and word moves, Home, End, Shift
  with the arrows, delete a word) stop at the bar and keep their default action, so no page
  listener and no VS Code key forwarding acts on them. The bar's own keys are unchanged.
- Verification: test/page/modules/findBar.test.ts.

### Frontmatter properties table: collapse and expand

- SwRS-MDOKFSTUDIO-FMSCHEMA-090 (proposed): a toggle next to the Frontmatter properties title hides
  the table under its header and shows it again; the state holds across content patches and edits
  of the open document and is never stored, so a page load or a newly opened document shows the
  table.
- Verification: test/core/frontmatter/propertiesTable.test.ts, test/page/runtimeFrontmatterFields.test.ts,
  test/visual/frontmatterCollapseScenarios.ts.
- Owner decision after review: the toggle uses a down-pointing triangle when expanded and a
  right-pointing one when collapsed, not the Description column's left-pointing icon (SwRS-MDOKFSTUDIO-FMSCHEMA-090 verification notes).
### Restricted Mode shows images

- SwRS-MDOKFSTUDIO-TRUST-002 (proposed, changed): a read-only preview (Restricted Mode, or a file
  outside the workspace) shows images (png, jpg, jpeg, gif, webp, svg) from the folder of the
  document, even when that folder is the home folder or above, and from the workspace folder unless
  it is broad; the webview gets those folders as local resource roots. Includes and other
  resources stay in the folder of the document, dot-segment paths stay refused, a broad workspace
  folder serves nothing. Before, an image outside the folder of the document, or next to a
  document in the home folder, was refused.
- SwRS-MDOKFSTUDIO-TRUST-007 (proposed, changed): the webview roots of a read-only preview of a
  workspace document include the workspace folder for images. StRS-MDOKFSTUDIO-TRUST-004: rationale
  line updated to match.
- Round 2: the image rule is worded by file extension (any element), is checked again on the real
  path after symbolic links, and also applies in the side-by-side diff; TRUST-007 description says
  "unless that folder is broad".
- Verification: test/session/readOnlyImages.test.ts, test/session/readOnlyImagesSession.test.ts, test/session/readOnlyLocalRoots.test.ts,
  visual scenario trust-security/v04-read-only-images-light-900.

### Schema folder listing: a file added in the same clock step is found

- SwRS-MDOKFSTUDIO-FMSCHEMA-019 (proposed): the listing of a schema folder is no longer kept when
  the folder's modification time is less than 2 seconds old at the listing. File times advance in
  clock steps (about 15 ms on Windows, 2 s on FAT), so a schema file added in the same step left
  the folder's times unchanged and stayed invisible until the next change. Found by the Windows CI
  job (the test wrote two files in one step).
- Verification: test/node-services/schemaFiles.test.ts (new test: fails on the previous code,
  passes now; the caching test ages its folder so it no longer depends on the clock).

### PlantUML: a Windows drive path is refused as absolute

- SwRS-MDOKFSTUDIO-DIAG-054 (proposed): an include named by a Windows drive or UNC path (such as
  C:\diagrams\a.puml) is refused with the absolute-path reason (must be a relative path to a local
  file) instead of the URL reason; the known issue that described the old refusal is removed.
- SwRS-MDOKFSTUDIO-DIAG-068 (proposed): the absolute-path row of the {uml} file refusals names the
  Windows drive path, which now gets that message instead of could not be read.
- Verification: test/core/render/plantUmlIncludes.test.ts and test/core/render/plantUmlFile.test.ts
  pass on Windows (they build the absolute path natively) and on Linux; `just check` passes on both.

## 2026-11-01

### Side-by-side diff: a paragraph removed next to an edited one

- SwRS-MDOKFSTUDIO-REVIEW-010 (proposed): a hunk of lines only added or only removed is merged
  with the hunk next to it when only blank lines separate them on both sides (never across a
  heading or another non-blank line), so Myers no longer pairs a removed paragraph with the edited
  one through the blank line between them.
- SwRS-MDOKFSTUDIO-REVIEW-009 (proposed): a block inside one hunk keeps on its left only the block
  at the last commit that shares the most words with it (each kept by one block at most); the other
  blocks at the last commit of that hunk come back as removed cards in their source order.
- Verification: test/core/mapping/lineHunks.test.ts, test/page/sideBySideCards.test.ts,
  test/core/mapping/wordDiff.test.ts.

## 2026-10-31

### Side-by-side diff of changed blocks

- SwRS-MDOKFSTUDIO-REVIEW-010, -005, -006, -007, -008 and -009 (new, CR 147): the side-by-side diff of
  changed blocks. A Side-by-side button in toolbar row 4 (reading mode only, disabled in edit mode)
  turns each block changed since the last commit into a card: the block at HEAD on the left, the
  current block on the right, both rendered, removed and added words marked; an added block has an
  empty left side and a removed block comes back with an empty right side. REVIEW-010 line hunks with
  both sides, REVIEW-005 word diff, REVIEW-006 the host posts the HEAD rendering and the hunks,
  REVIEW-007 the two new messages and their validation, REVIEW-008 the button, REVIEW-009 the cards.
  The default (green bars) is unchanged. Verification: test/core/mapping/lineHunks.test.ts,
  test/core/mapping/wordDiff.test.ts, test/session/reviewReqIncoming.requirements.test.ts,
  test/session/baselineDiff.test.ts, test/core/protocol/hostToPage.test.ts,
  test/core/protocol/pageToHost.test.ts, test/page/runtimePageControls.test.ts,
  test/core/preview/previewStyles.test.ts, `just requirements-lint`; real-window scenario
  incoming-changes (review-annotations/r07-side-by-side-diff) written, not run (screen locked).
- SwRS-MDOKFSTUDIO-TOOLBAR-001 and SwRS-MDOKFSTUDIO-TRUST-001 (CR 147): the toolbar holds 15 buttons
  (row 4 has three) with the new Side-by-side button. Verification: test/core/preview/previewStyles.test.ts.

### Link list suggestions and warning in large workspaces

- SwRS-MDOKFSTUDIO-FMEDIT-010 (proposed): the list editor of a filename-stem link list warns only
  for a value outside every known stem (the index the table resolves links with, sent uncapped as
  a second row attribute); the dropdown suggestions start with the document's folder, then by
  folder distance, then alphabetically, deduplicated and still capped at 500.
- Verification: test/core/frontmatter/linkSuggestions.test.ts,
  test/core/frontmatter/propertiesTable.test.ts, test/page/runtimeFrontmatterFields.test.ts and
  the screenshot scenarios frontmatter-editing/v07-link-hint-known-stem-cream-900 and
  frontmatter-editing/v08-link-hint-known-stem-dark-900.

### Enter in a card's one-line editors

- SwRS-MDOKFSTUDIO-BLOCK-258 (proposed): in the editor opened on a card title, `:header:` or
  `:footer:` line, plain Enter saves and closes the editor as Done does, Shift+Enter and Alt+Enter
  insert nothing and Tab and Shift+Tab do nothing, so no blank line ends the card's options;
  new scenarios for Enter and for one-line paragraphs and headings that keep Enter as a new line.
  The renderer marks these parts `data-single-line` (a linked title is marked too);
  detection never uses the line range.
- SwRS-MDOKFSTUDIO-BLOCK-033 (proposed): the status hint of these editors reads
  "Enter: done · Esc: cancel" before the done key.
- Verification: test/page/runtimeCardOptionEnter.test.ts, test/core/render/gridCardTitleSourceLine.test.ts,
  test/security/html-policy.test.ts, and the visual scenario
  block-editing/v35-card-header-enter-commits-line-cream-900 (real key input), all passing;
  they failed on the previous code. Multi-line paste in these editors is unchanged.

### Radio choice lists: keyboard focus and the write guards

- SwRS-MDOKFSTUDIO-GFM-039 (proposed): the list, items and option paragraphs of a group are out of
  the Tab order (tabindex -1), so one Tab from the label lands on the selected option; after a
  choice the option of the same line and column gets the focus back once the content patch is
  applied; the open-editor guard runs on the press of an option, before the editor's blur, and the
  editor stays open; new refusal row for a file VS Code keeps read-only ('This file is read-only in
  VS Code.'), checked by comparing the text before and after the apply; the workspace.applyEdit
  path (no editor shows the document) is noted as untested.
- SwRS-MDOKFSTUDIO-GFM-021 (proposed): read-only file row for checkbox toggles, with the same
  untested note.
- SwRS-MDOKFSTUDIO-BLOCK-041 (proposed): new radio option row, the guard runs on the press; the
  checkbox row is unchanged (task checkboxes keep only the click guard).
- SwRS-MDOKFSTUDIO-LIFE-119 (proposed): a mapped block that already carries a tabindex keeps it.
- Verification: unit tests in test/core/render/radioGroups.test.ts, test/security/html-policy.test.ts,
  test/page/runtimeRadioGroups.test.ts and test/session/radioChoice.test.ts; screenshot scenarios
  gfm/v12 and gfm/v13; the real-window cases of test/integration/radioChoice.test.ts run in the
  heavy integration job (not run locally).

### Alert lazy continuation lines

- SwRS-MDOKFSTUDIO-GFM-009 (proposed): an alert now ends where its block quote ends under
  CommonMark 0.31.2 section 5.1, lazy paragraph continuation lines included, as GitHub renders it
  (checked through the GitHub Markdown API in gfm mode); it used to end at the first unquoted line.
  The boundary scenario and the line-mapping rows were rewritten: a lazy line is inside the
  admonition, which ends on the alert's last line, quoted or lazy; a blank line, a block start or a
  line after a quoted heading, code block, blank quote line or thematic break stays outside.
  SwRS-MDOKFSTUDIO-GFM-037 (superseded) is left as it was.
- SwRS-MDOKFSTUDIO-PALETTE-115 (proposed): a caret on a lazy line of an alert is in that alert (no
  edit without an argument, a type replaces that alert's head); a new alert inserted under a quoted
  or lazy line starts after a blank line. The render pass and the palette share one rule
  (`src/core/syntax/blockQuoteRange.ts`).
- Both follow GitHub (gh api markdown, gfm mode) on the edge cases: any list marker on a lazy line
  ends the alert, a lazy `===`, `--` or delimiter row stays paragraph text, a quoted table closes
  the paragraph, HTML blocks of kinds 1 to 5 end on their end marker and a lone tag (kind 7) cannot
  interrupt a paragraph. A lazy MyST block break `+++` stays paragraph text too (it used to reach
  the block-break path inside the admonition and stop the render). Other MyST-only block syntax on
  a lazy line (comment, target, footnote definition, math block) keeps its MyST meaning inside the
  admonition, where GitHub shows text; GFM-009 says so. The palette finds no alert head inside
  fenced code.
- Verification: unit tests in test/core/render/alertLazyContinuation.test.ts,
  test/core/render/alertSourceLines.test.ts and test/page/modules/alertLazyEditAction.test.ts.

### Hiding comments hides every review mark

- SwRS-MDOKFSTUDIO-REVIEW-152 (proposed) widened from the chips to every review mark: while the
  Comments button is off or `preview.showComments` is false, the highlight colour and the dotted
  underline go (the quoted text stays as plain text), badges and the Orphaned comments box are not
  displayed, a click or Enter on a former highlight opens no popover and acts as on plain text
  (reveal the source line, edit the block in edit mode), highlights leave the Tab order and come
  back on Show, and an open popover closes. Title, description, scenarios and verification notes
  follow. The owner agreed on 2026-10-31.
- SwRS-MDOKFSTUDIO-REVIEW-021 (proposed): the popover opens only while comments are shown.
- Verification: unit tests in test/core/preview/previewStyles.test.ts,
  test/page/modules/commentThreads.test.ts and test/page/runtimeCommentsHidden.test.ts; visual
  scenarios review-annotations/v29 and v30 (light, dark); the real-input scenario
  `scenarioHiddenReviewMarks` runs in the heavy integration job (not run locally).

### Replace all and a link target that repeats the query

- SwRS-MDOKFSTUDIO-TOOLBAR-012 (draft): the source text the reader cannot see (link and image
  targets and titles, a whole inline image with its alt text, reference definition lines) is left
  out of the source occurrences. A match in a link label whose target repeats the text is now
  replaced and the target kept; before, the whole block was skipped. Autolinks, links in code
  spans and links or definitions in fenced code blocks (or a definition indented as code) stay
  counted; no link inside a link. New boundary rows and verification notes; the real-window
  scenario test/integration/findInPreview.test.ts now expects the link label replaced.
- Added SwRS-MDOKFSTUDIO-TOOLBAR-131 (toolbar-navigation, `proposed`, derives from
  StRS-MDOKFSTUDIO-TOOLBAR-003): with the replace row open, the page asks the host for a dry run
  of Replace all (`previewFindReplace` with `dryRun: true`) 150 ms after each search, row opening
  or content refresh, and the note counts the matches that cannot be replaced before any click.
  Stale and refused answers keep the page's count; no request while the row is closed. The
  request holds no replacement text, so its length never stops it.
- Verification: unit tests in test/core/edits/findReplace.test.ts,
  test/page/modules/findBar.test.ts, test/core/protocol/pageToHost.test.ts and
  test/session/reviewReqThreads.requirements.test.ts; `just check` and
  `okfreq validate --check-links` pass.

### Body text keeps clear of the floating toolbar

- Added SwRS-MDOKFSTUDIO-LAYOUT-043 (layout-width, `proposed`, derives from
  StRS-MDOKFSTUDIO-LAYOUT-004): when the floating toolbar overlaps the text column at the top of a
  document whose first block is running text, the runtime publishes the toolbar's rectangle inside
  the column (`--sphinx-preview-toolbar-float-width` / `-height`), an invisible right float of that
  size makes the text of the first blocks wrap around the toolbar, and every other top-level block
  (tables, figures, code, notes, block editor frames) within its reach starts below it; 0 beside the
  column, under an interactive first element, under a first block that is a box and in a document
  with an aligned image, figure or table. Top-level headings clear left or right aligned images,
  figures and tables (MyST `:align:` or HTML `align`) before them, never the toolbar float.
- SwRS-MDOKFSTUDIO-LAYOUT-011 (proposed): the known issue on non-interactive first elements points
  to the new requirement.
- Verification: unit tests "CR 226" in test/page/modules/firstClearance.test.ts and the headless
  visual scenarios layout-width/v88, v89 and v90 (test/visual/toolbarFloatScenarios.ts).

### Radio choice lists

- Added SwRS-MDOKFSTUDIO-GFM-039 (gfm, `proposed`, derives from StRS-MDOKFSTUDIO-GFM-003): a run
  of at least two list items that start with `( )`, `(x)` or `(X)` renders as a radio group
  (role="radiogroup", role="radio", aria-checked, roving tabindex, labelled by the paragraph above
  the list), and a click or Space / Enter on an unselected option writes `(x)` on it and `( )` on
  the old selection in one undo step, through the checkbox toggle path and its guards.
- SwRS-MDOKFSTUDIO-GFM-027 (proposed): the toggle message may carry the options of a radio group;
  new refusal rows for a malformed group and for a group on another message type.
- Verification: unit tests in test/core/render/radioGroups.test.ts,
  test/core/edits/radioSelect.test.ts, test/page/runtimeRadioGroups.test.ts and
  test/session/radioChoice.test.ts; the real-window test test/integration/radioChoice.test.ts runs
  in the heavy integration job (not run locally).
- SwRS-MDOKFSTUDIO-GFM-039: the host refuses a choice whose positions are not one run of
  consecutive radio items of one list; a numbered radio list keeps its numbers; the screenshot
  scenarios gfm/v10-radio-plan-cream-900 and gfm/v11-radio-plan-dark-900 verify the rendering.
- SwRS-MDOKFSTUDIO-GFM-027: the criteria line names radioGroup.
- SwRS-MDOKFSTUDIO-CORE-073 (proposed): the writing skill's families include radio choices in a
  plan.

### A block editor in a grid card

- Added SwRS-MDOKFSTUDIO-BLOCK-257 (block-editing, `proposed`, derives from StRS-MDOKFSTUDIO-BLOCK-001):
  while a block editor is open in a card, the card widens and pushes the other cards of its row
  aside, the edition palette stays in the flow above the text box (wider than the card if needed,
  with a maximum height and a vertical scroll) and the text box keeps a readable minimum width.
  Verification: `okfreq validate --check-links`, `lint --check` and `update-coverage --check`
  pass; the headless visual scenarios `block-editing/v23` to `v26` measure the layout.

### The host does not post an empty list from a failed read (hardening)

- SwRS-MDOKFSTUDIO-REVIEW-012 (proposed): new refusal scenario and statement clause. A read of
  an existing comments file that fails (busy, denied, interrupted) posts nothing, so the page keeps
  its threads and an open popover; only a missing file posts the empty list. Before, any read error
  counted as "no comments file", so a failed read could close an open popover. This hardens that
  path; it is not the proven cause of the review-threads stress flake, which most likely came from
  the delete-then-move gap of the file rename, fixed separately (test/host-vscode/fileRename.test.ts).
- Verification: test/session/reviewReqComments.requirements.test.ts (two new tests); `just check`.

## 2026-10-30

### The bundle is readable by any OKF v0.2 consumer

- All requirements: the okfreq lifecycle field is renamed `req_lifecycle` (`lifecycle.field` in
  `config.yml`), so it no longer competes with the OKF lifecycle. Each requirement gains the
  generated OKF `status` (section 5.4), an approved one the generated OKF `verified` event of its
  owner approval in ISO 8601 (section 5.2), and a generated `### Links` section with Markdown links
  for its relations (section 6.1). The approval date `approved_on` becomes the ISO 8601 datetime
  `approved_at`. The schemas declare the projection: the `x-okf-status-projection` mapping of
  `req_lifecycle` and a `link-projection` label in the `x-okf-link` of each relation field;
  `status` and `verified` are `generated_fields`. okfreq (okf-schema 0.17) applies it natively on
  `update-coverage` and `lint`; the rules are in `requirements/guidelines/project.guidelines.md`.
  No requirement content changed.
- This log: every heading is now an ISO 8601 `## YYYY-MM-DD` date, newest first, one per date; the
  former parenthesized topics are `###` sub-headings.
- Verification: `just requirements-lint` passes; `okf-schema validate --path requirements/tiers`
  passes; the OKF Studio validator reports 0 errors, 0 warnings, 0 broken links and 1 orphan
  (StRS-MDOKFSTUDIO-LIFE-019, which no SwRS derives from).

## 2026-10-29

### Studio in the VS Code Agents window

- SwRS-MDOKFSTUDIO-LIFE-171 (new, proposed): the manifest declares `capabilities.agentsWindow.supported`
  true, so VS Code enables the installed extension in its Agents window without a user setting.
  The declaration lives in package.json, which carries no marker: `annotation_exemption` with that
  reason. Verification: test/security/trustReq.requirements.test.ts.
- SwRS-MDOKFSTUDIO-TRUST-001: new rows under "Trust granted or a folder added while a preview is
  open": a read-only preview becomes writable on the same panel, with its reading state, when a
  workspace folder that holds its file is added; a preview of another file stays read-only; the
  active preview stays active. Before, only a trust grant promoted a preview, so a preview opened
  before the Agents window mounted the session folder stayed read-only.
  Verification: test/host/lifeReq.requirements.test.ts.
- SwRS-MDOKFSTUDIO-LIFE-143: removing a workspace folder no longer closes the previews of its files.
  The old session and its render queue, watchers and Problems entries are still disposed; the same
  panel shows the file in a read-only session (or in a session of another folder that holds it),
  and becomes writable again when a folder that holds the file is added. Decided for the Agents
  window, where each agent session switch removes the folder; it applies to the main window too.
  Verification: test/host/lifeReq.requirements.test.ts, test/integration/workspaceDisposal.test.ts
  (its assertion changed from "the preview is disposed" to "the tab stays, read-only").

### A click in the body of a GitHub alert opens the whole alert

- SwRS-MDOKFSTUDIO-GFM-009: new nominal scenario "A click in the body of an alert opens the whole
  alert". The admonition of a rewritten alert carries `data-okf-github-alert`; the page edits a
  block inside it (a paragraph, a list) as the whole alert, from the marker line to the last quoted
  line, before any list around it. Before, only the clicked paragraph opened.
  Verification: test/session/alertBlockEditOpen.test.ts, visual scenario
  gfm/v09-alert-body-opens-whole-alert-dark-900.
- SwRS-MDOKFSTUDIO-BLOCK-014: the nominal scenario and the table name the GitHub alert. The claim
  that a click on the body of a MyST admonition opens the complete directive did not hold (only the
  paragraph opens; a click on the title opens the directive): it is now a "Known issue".

### Cmd/Ctrl+F from an editor field opens the find bar at once, CR 196

- SwRS-MDOKFSTUDIO-TOOLBAR-009: the page now takes Cmd/Ctrl+F in a field of an open block, table
  cell or frontmatter editor too, and opens the find bar at once with its field focused (the query
  starts with the text selected in that field). Before, the page left the key to VS Code, whose key
  binding opened the bar one host round trip later; the keys typed in that gap went into the field
  and, through the blur commit, into the Markdown. The host's find command while the focus is in
  the bar changes nothing (no new focus, the query is not selected again); Cmd/Ctrl+F in the bar
  selects the query again. Any other field of the page (a comment box, a palette or panel control)
  behaves the same. Escape after the blur committed a block or table cell editor whose final save is
  on its way does not give the focus back to that editor's field. The boundary row "the key is left
  to the field; the bar does not open" is replaced. Verification: test/page/modules/findBar.test.ts,
  test/page/runtimeFindFromBlockEditor.test.ts, test/integration/findInPreview.test.ts.
- SwRS-MDOKFSTUDIO-BLOCK-047: new row "Cmd/Ctrl+F in the text box" under "Leaving the text box"; the
  blur on an unchanged existing block is now tested.

### Find in preview in the stress plan, CR 190

- SwRS-MDOKFSTUDIO-TOOLBAR-009, SwRS-MDOKFSTUDIO-TOOLBAR-012: verification notes only. The
  real-window find scenario (cream and dark, with replace all) is now repeated by the `stress` CI
  job as `find-in-preview`, so a timing race such as a late block editor focus shows up as a stress
  failure. No behaviour, assertion or timeout changed.

### Re-run recovery used the artifacts of the first attempt

- SwRS-MDOKFSTUDIO-CORE-076: extended (still proposed). After "Re-run failed jobs", a download by a
  fixed artifact name returned the attempt-1 artifact, so the merged report and the Pages site could
  use stale reports. Every artifact name of `ci.yml` now ends with `-attempt-<n>`; `visual`,
  `integration` and `report` output their artifact name and every consumer downloads that output
  (Pages through `reports_artifact`); `scripts/select_e2e_run.py` and `just site-from-run` pick the
  newest attempt of `studio-reports`. `scripts/e2e-campaign.mjs report` no longer applies the two-hour
  stage gap when both stages carry the same run id pinned by the CI workflow.
  Verification: test/build/test_workflows.py, test/build/test_select_e2e_run.py,
  test/site/e2eCampaign.test.ts.

### A version change is tagged only after a green heavy run

- SwRS-MDOKFSTUDIO-CORE-076: retitled and extended (still proposed). Nothing required a green heavy
  run of the release commit before `tag-release` tagged it, so the Pages deploy of the tag fell back
  to running the whole suite. A push to main that changes the version now runs `integration` and
  `stress` in its own run (`release-check`, `scripts/version.py --bump-since`); `tag-release` needs
  `checks` and both heavy jobs and tags only when all three succeeded; otherwise, on a version
  change, it writes why (each result and the re-run command) to the job summary and fails, also when
  an integration failure has failed `checks`.
  Pages reuses the reports of that run, and `scripts/select_e2e_run.py` also accepts that push run.
  Verification: test/build/test_workflows.py, test/build/test_release.py,
  test/build/test_select_e2e_run.py.

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
- SwRS-MDOKFSTUDIO-CORE-074, SwRS-MDOKFSTUDIO-CORE-075 (CR 160, new, proposed): the writing skill is
  packaged as an agent plugin (Claude Code, Agent Plugins 1.0.0 for Copilot, VS Code and Codex, Codex
  marketplace) over the single `skills/` folder, kept out of the VSIX, and `scripts/version.py` writes
  the package version to every plugin manifest. Verification: test/build/test_plugin_manifests.py,
  test/build/test_release.py, `claude plugin validate . --strict`.

### CI skipped tagging and release on main, CR 172

- SwRS-MDOKFSTUDIO-CORE-076: new, proposed. On a push to main the manual heavy jobs are skipped, so
  `tag-release`, `release` and `pages` inherited a false success() and never ran. They now use
  `!cancelled()` with an explicit `needs.<job>.result` check.
  Verification: test/build/test_workflows.py.

### Paragraph of a GitHub alert opens the editor on the wrong lines, CR 171

- SwRS-MDOKFSTUDIO-GFM-009: new boundary scenario "Every block keeps the lines of the document".
  The alert pass rewrites `> [!NOTE]` into a longer MyST admonition before parsing and nothing
  mapped the lines back, so the body of an alert was one line late and every block after an alert
  one line later per alert (README: the paragraph of the second alert, lines 40-41, rendered as
  42-43; a click opened, and Done would have overwritten, the blank line and the next heading). The
  pass now returns the source line of every rewritten line and a tree pass maps the positions (and
  the `data-line` attributes the grid pass already set) back to the document; an admonition ends on
  its last quoted line. The existing claim "later source line numbers are unchanged" now holds.
  Verification: test/core/render/alertSourceLines.test.ts, test/session/alertBlockEditOpen.test.ts.
- SwRS-MDOKFSTUDIO-CORE-003, SwRS-MDOKFSTUDIO-MYST-096: verification notes name the new tests (an
  unclosed fence after an alert now reports and shows its own line).

### A late block editor leaves the focus in the find field, CR 169

- SwRS-MDOKFSTUDIO-BLOCK-255 (new, proposed): a block editor whose source reaches the page after
  another text field outside it took the focus (the find field, opened with Cmd/Ctrl+F right after
  the click that opened the editor) is built without taking the focus, so the search text no longer
  lands in the Markdown source (heavy CI on eca17c42, find-in-preview: "Timed out waiting for the
  match count" and "Save or cancel the open edit before replacing."). Verification:
  test/page/runtimeBlockEditor.test.ts.
- SwRS-MDOKFSTUDIO-TOOLBAR-012: the real-window find check runs in edit mode (the suite leaves it
  on), where its click on the title opens the title's block editor. It now waits for that editor
  to hold the focus, closes it with Escape and waits for no editor before Cmd/Ctrl+F; its waits
  report the page and host state on failure. Verification: test/integration/findInPreview.test.ts.

### Table bar above the row handles, CR 168

- SwRS-MDOKFSTUDIO-TABLE-064: the table bar is positioned in the flow with a z-index above the row
  and column handle layer, so a handle that lands on a button of the bar (heavy CI real-input
  scenarioTableStructure: "Delete selected column" was intercepted by the row 1 handle) no longer
  takes the press. Verification: test/core/preview/previewStyles.test.ts,
  test/visual/capture_table_menu.py.

### Table bar inset after the reveal, CR 167

- SwRS-MDOKFSTUDIO-TABLE-064: the inset of a table bar that opens under the five-row preview
  controls is decided before the reveal, so a bar that wraps left of the controls no longer also
  scrolls the page (the selected cell moved 105 px in the heavy CI real-input scenarioTableToolbar).
  Verification: test/page/runtimeTableCellEditor.test.ts.

### Edit figure button clear of the preview controls, CR 161

- SwRS-MDOKFSTUDIO-PALETTE-153: in a narrow pane (about 420 px) a figure shorter than the five-row
  preview controls left no room below them, so the Edit figure button stayed under the "Fold all
  sections" button and could not be pressed (heavy CI integration, editToolbarCover). The button now
  sits left of the controls in that case. Verification: test/page/figureEditButtonClearance.test.ts,
  visual scenario palette-slash/v29-edit-figure-button-narrow-cream-420.

### Ctrl+/ toggles a plain comment

- SwRS-MDOKFSTUDIO-PALETTE-266 (new), SwRS-MDOKFSTUDIO-REVIEW-160,
  SwRS-MDOKFSTUDIO-PALETTE-083: Ctrl+/ (Cmd+/) toggles a plain `<!-- … -->` comment on the touched
  lines instead of a TODO comment; the shortcut belongs to a new shortcut-only `comment` action,
  and the TODO action and its tooltip have no shortcut. A TODO or THREAD comment line is left alone
  by the shortcut. Verification: `just requirements-update`, `just check`.

### Toolbar motion

- SwRS-MDOKFSTUDIO-TOOLBAR-129 (new, proposed, CR 162): the tooltip bubbles of the floating toolbar,
  the edit bar and the table menu share one slide-in (6 px from the left, 120 ms fade); the edit
  bar's own 3 px drop is replaced. Verification: test/core/preview/previewStyles.test.ts.
- SwRS-MDOKFSTUDIO-TOOLBAR-130 (new, proposed, CR 162): rows 2 to 5 of the toolbar unroll and roll
  up as one block (160 ms), and a panel that opens its preview with the toolbar saved as collapsed
  shows a load hint once (rows open for 700 ms, cancelled by a press, saved choice unchanged, not
  replayed on refresh, reload, patch or when the panel follows another document; a click on the
  chevron during the hint keeps the open rows); reduced motion turns all of it off.
  SwRS-MDOKFSTUDIO-CORE-050 and TOOLBAR-007 are unchanged. Verification:
  test/page/modules/toolbarCollapse.test.ts, test/page/runtimeToolbarHint.test.ts (state snapshots
  keep the "hint shown" mark), test/core/preview/previewStyles.test.ts.

### Find in preview: replace-all check waits for the host

- SwRS-MDOKFSTUDIO-TOOLBAR-012: the real-window replace-all check now waits for the host's answer
  before reading the status note (it could read the transient "Replacing..."). Test only, no
  behaviour change. Verification: test/integration/findInPreview.test.ts.

### Structural keyboard navigation

- SwRS-MDOKFSTUDIO-BLOCK-254 (new, CR 157): with edit mode on and no editor open, ArrowRight moves
  the keyboard selection one level down (a table to its first cell, an admonition, card or tab to its
  first inner block, the whole page to its first block), ArrowLeft and Escape one level up, the four
  arrows walk the cells of a selected table without wrapping, Escape returns to the table block and
  Enter opens the cell editor; the selected cell is outlined and announced. Verification:
  test/page/modules/structuralCursor.test.ts, test/page/runtimeStructuralNavigation.test.ts, visual
  scenarios block-editing/v20 and v21, test/integration/realInput/blockKeys.ts.

### Empty document started from the keyboard

- SwRS-MDOKFSTUDIO-BLOCK-253 (new, proposed, CR 156): in edit mode on an empty document the Start
  writing button is the keyboard selection (selection marker and ring), Enter and Arrow Down open
  the new-block editor as a click does (also when the focus is on the body, the preview, the
  edit-mode toggle or the button itself), and the hint "Enter to create a new block" sits under it
  in the editor hint typography. The Enter shortcut row of SwRS-MDOKFSTUDIO-BLOCK-041 is unchanged.
  Verification: test/page/runtimeEmptyDocumentStart.test.ts, test/visual/capture_start_hint.py
  (scenarios layout-width/v86 and v87, 700 px).

### A click in a MyST tab panel edits the whole tab item

- SwRS-MDOKFSTUDIO-MYST-098 (text unchanged, implementation fixed): the blocks inside a tab
  panel carry no source line of their own, so a click on the shown panel in edit mode opens the
  whole `{tab-item}` in the Markdown editor instead of the inner paragraph alone. A table (so no
  row or column handles), a code block, a card, a grid and a nested tab set in an item are no
  blocks of their own either: a click in a nested set edits the outer item. A comment, a TODO
  comment and a THREAD in a panel keep their own source line range, so replying to or deleting
  a thread and anchoring a comment still work. Verification: test/core/render/cardsTabs.test.ts,
  test/visual/cardsTabsScenarios.ts, test/integration/mystBlocksWindow.ts.

### Front matter change bars

- SwRS-MDOKFSTUDIO-REVIEW-215 (new, CR 155, `proposed`, derives from StRS-MDOKFSTUDIO-REVIEW-017,
  relates to SwRS-MDOKFSTUDIO-REVIEW-195 and SwRS-MDOKFSTUDIO-REVIEW-207): a front matter field
  changed or added since HEAD gets its own change bar on its properties table row; a removed
  field adds a range on line 1 so that the table as a whole gets one bar when no row has one.
  Before, the table was the block of line 1 only, so a change in a field showed no bar. The
  approved requirements were not touched. Verification: test/core/frontmatter/frontmatterChanges.test.ts,
  test/core/frontmatter/propertiesTable.test.ts, test/page/modules/incomingChanges.test.ts and the
  visual scenarios review-annotations/v27 and v28.

### Five-row floating toolbar

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

### Lifecycle meanings, owners and approval locks

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

### Vega-Lite and Vega charts, the Full palette mode

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

### The writing skill for Studio

- SwRS-MDOKFSTUDIO-CORE-073 (new, CR 150): the writing skill `skills/writing-for-markdown-okf-schema-studio/`
  holds only examples that the preview pipeline renders without a diagnostic or an unresolved
  directive, covers every syntax family it lists, and stays a short self-contained folder.
  `requirements/config.yml`: `skills` added to the `source_dirs` of the rendering-core scope, since
  the skill is the implementation (marker in `SKILL.md`). Verification:
  test/core/render/writingSkill.test.ts (4 tests, failing while the skill folder is absent),
  `just requirements-update`.

### Real-window scenarios leave edit mode off

- SwRS-MDOKFSTUDIO-BLOCK-004, SwRS-MDOKFSTUDIO-PALETTE-264 (CR 152): the paste-URL real-window
  scenario left the workspace in edit mode, so the next scenario (windowSwitchKeys) opened its
  preview in edit mode, never clicked the toggle and its arrow keys reached no page. The scenario
  now turns edit mode off again; test/build/integrationEditModeRestore.test.ts checks every
  top-level scenario that turns it on. No product behaviour changed; a known issue is recorded in
  BLOCK-004 (a preview that has just opened holds no keyboard focus in the test window).
  Verification: test/build/integrationEditModeRestore.test.ts, test/integration/windowSwitchKeys.test.ts.

### Files dropped from the Explorer become links

- SwRS-MDOKFSTUDIO-PALETTE-004 (new, CR 146): files dropped from the Explorer onto the preview in
  edit mode (no block editor open) mark the nearest insertion bar and are written as a new block with
  one relative reference each, `![name](path)` for an image and `[title](path)` otherwise (first
  heading of a Markdown file), in one undo step; files outside the workspace folders are skipped.
  Verification: test/core/mapping/dropReferences.test.ts, test/page/modules/dropFiles.test.ts,
  test/page/runtimeFileDrop.test.ts, test/session/dropFiles.requirements.test.ts,
  test/integration/dropFiles.test.ts, `just requirements-update`.

### MyST cards, tabs and version titles

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

### MyST patches applied in memory, no postinstall

- SwRS-MDOKFSTUDIO-CORE-070 (CR 135): the three MyST source patches (including the single line
  split per parse) are applied in memory by an esbuild plugin and a Node load hook; the postinstall
  script is gone and nothing is written into node_modules. A package version or content other than
  the reviewed one fails loudly. Verification: test/build/mystSourcePatches.test.ts.

### Find and replace in the preview

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

### Fold and unfold sections in the preview

- StRS-MDOKFSTUDIO-TOOLBAR-002 and SwRS-MDOKFSTUDIO-TOOLBAR-003 to -006 and -008 (CR 143): new. The
  preview folds the sections under its headings: a chevron per heading, the section shortcut, the
  Fold button and the Fold All / Unfold All palette commands, the folds kept per document in the
  webview state (never in the file), unfolding by the browser find and by navigation, and no
  selection or edit of a block in a folded section. SwRS-MDOKFSTUDIO-TOOLBAR-001 and
  StRS-MDOKFSTUDIO-TOOLBAR-001 now list the Fold button (14 buttons, 6 in row 3). Verification:
  unit tests under test/core/state, test/page/modules, test/session and test/security, the Chromium
  check check_heading_fold in test/visual/capture_layout_checks.py, `just requirements-lint`, real-window
  screenshots under the CR 143 reports.

### Worker-thread render, abort and adaptive debounce

- SwRS-MDOKFSTUDIO-LIFE-004 (new, CR 135): in the VS Code host the MyST render runs in a worker
  thread; an aborted render terminates its worker at once, and a worker that cannot start leaves
  renders in-process. SwRS-MDOKFSTUDIO-LIFE-039: the wait after the last edit is 40 ms or twice the
  last render time (at most 1 s), and a running render that has run more than 1 s and twice the
  wall-clock time of the last render is aborted when a newer render is due. Verification: test/node-services/renderWorker.test.ts,
  test/node-services/build/buildQueue.test.ts, test/core/render/renderPipeline.test.ts,
  `just requirements-lint`.

### Lifecycle and typing nits

- SwRS-MDOKFSTUDIO-REVIEW-012: the watch of the comments file disposes its three subscriptions with
  the watcher when the preview shows another document or closes. SwRS-MDOKFSTUDIO-TOOLBAR-079: a
  rescan unobserves the links the replaced content detached. SwRS-MDOKFSTUDIO-MYST-081: the memory
  of closed warning banners keeps at most 200 documents. SwRS-MDOKFSTUDIO-LIFE-156: a boot element
  that is not a JSON object reads as an empty boot context (CR 135). Clipboard events of the paste
  modules are typed. Verification: unit tests named in the four requirements, `just requirements-lint`.

### One line split per parse of directives

- SwRS-MDOKFSTUDIO-CORE-070 (new, CR 135): the postinstall patch of markdown-it-myst splits the
  source into lines once per parse instead of once per directive fence; the tightness of each
  directive is unchanged and the parse of a 55k-line document is about 5 times faster.
  Verification: test/build/mystSourcePatches.test.ts, `just requirements-lint`.

### The Edit button is greyed with the reason in a read-only preview

- SwRS-MDOKFSTUDIO-TRUST-001: a read-only preview (untrusted workspace, or a file outside every
  workspace folder) keeps the Edit button, greyed (`aria-disabled`), with the reason as tooltip,
  instead of hiding it; the toolbar always holds 13 buttons. CR 126. StRS-MDOKFSTUDIO-TOOLBAR-001,
  SwRS-MDOKFSTUDIO-BLOCK-001 and SwRS-MDOKFSTUDIO-LIFE-170 reworded. Unit, integration and visual
  checks changed with it.

### Table handle drop zone

- SwRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-007: while a row or column handle is held, the
  whole table and the strip of the handles are a drop zone; the marker shows on the nearest gap, follows
  the pointer and goes when it leaves the zone (CR 128). Unit tests and the real-window suite
  `test/integration/tableMoves.ts` cover it. Verification: `just requirements-lint`.

### Block actions follow the keyboard selection

- SwRS-MDOKFSTUDIO-BLOCK-109: the plus and the up and down arrows show on one block, the one that
  moved last (the keyboard selection or the hovered block); a pointer move takes them back and
  removes the selection outline. A page unit test, a style test and a real-window test (cream and
  dark) cover it, CR 130.

### Code blocks: Dark+ highlighting, dark background, line numbers

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

### Preview next to an editor no longer stuck at the top

- SwRS-MDOKFSTUDIO-LIFE-119: new row in "Layout changes re-apply the stored anchor". A layout
  pass handles a pending user scroll before it re-applies the anchor. A webview placed next to a
  text editor reports a visual viewport resize ahead of each scroll; the layout pass then ran
  first and scrolled back to the old anchor, so the preview could not leave the top.

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

### Unclosed directives render as raw text

- SwRS-MDOKFSTUDIO-MYST-096 (new): a directive or fence the parser cannot build (an unclosed or
  empty `{list-table}` or `:::{table}`) shows its own lines as a code block and the rest of the
  document renders, instead of the render failing. Unit tests and the cream and dark visual
  scenarios cover it.

### Edit bar tooltips and rule hit area

- Added `SwRS-MDOKFSTUDIO-PALETTE-002` (every edit bar button carries the slide-in tooltip; the rule button
  is drawn as three dashes) and `SwRS-MDOKFSTUDIO-BLOCK-002` (a horizontal rule has a 25 px hit area), CR 112.

### Table cells keep a usable width in edit mode

- SwRS-MDOKFSTUDIO-TABLE-006: in edit mode every table cell is at least 8em wide (an empty new
  column stays clickable) and the cell being edited at least 300 px wide; the reading view is
  unchanged. A style unit test and the visual cell-editor check cover it. Round 2: a real-window
  test (cream preview on a dark VS Code theme) adds a column with the toolbar, saves it, opens its
  empty header and measures the empty column (8em) and the edited cell (300 px, editor inside).

### Table bar inserts before and after, and works on a list-table

- SwRS-MDOKFSTUDIO-TABLE-003, -004 and -005 (new): Row above, Col left, and the row and column
  buttons on a plain `{list-table}`. SwRS-MDOKFSTUDIO-TABLE-055: a row or column button now saves
  the table and has the page render it again before the editor reopens in the new position; it no
  longer leaves the editor over a cell that shows another cell's text (Col + wiped the title of the
  selected column). SwRS-MDOKFSTUDIO-TABLE-048 lists seven buttons; SwRS-MDOKFSTUDIO-TABLE-001
  keeps the raw editor for a list-table that is not plain.

### Table column handles, row moves with a cell editor open

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

### Enter in the image alt text validates it

- SwRS-MDOKFSTUDIO-BLOCK-069: Enter in the alt text of a Markdown image (selected after a paste or
  a pick, or typed in) keeps the alt text and moves the caret just after the image instead of
  replacing the selection by a line break. Runtime and unit tests, and the visual scenarios
  palette-slash/v22 to v24 (cream and dark), fail on the previous code.

### Edit mode follows VS Code undo, redo, select-all and delete-line keys

- SwRS-MDOKFSTUDIO-BLOCK-003 (new): in a block or table-cell text box, undo, redo, select all and
  delete line are contributed VS Code key bindings on the `markdownOkfSchemaStudio.previewEditing`
  context, so a rebinding applies. SwRS-MDOKFSTUDIO-BLOCK-069: its undo, redo and select-all rows now
  distinguish the block and cell text boxes from the frontmatter fields.

### Keyboard-only block editing

- SwRS-MDOKFSTUDIO-BLOCK-004 (new): in edit mode, plain Up and Down select and move a one-block
  selection, Enter opens the selected block, and Escape or Cmd/Ctrl+Enter leave the edited block
  selected. Unit tests and the cream and dark visual scenarios cover it.

### Bold dollar prices preserve emphasis

- SwRS-MDOKFSTUDIO-MYST-024: permissive MyST dollarmath no longer consumes the `**` markers
  around dollar prices; the exact four bold prices remain text inside strong spans, while valid
  `$x^2$` and `$a + b$` spans still typeset. Unit and light/dark visual contracts cover the fix.

### Save pins precede status layout changes

- SwRS-MDOKFSTUDIO-BLOCK-228: final block and table saves capture the viewport pin before
  changing the saving status. The strengthened runtime regression fails with the old ordering
  and passes with the new ordering. Save-position and alert-dropdown scenarios are registered
  for real-window stress validation without changing their assertions or timeouts.

### Shared requirements guidance

- Replaced the project-specific requirements guide with the generic guide shipped by
  okf-schema, and synchronized the retained baseline copy. Project paths, scopes, commands
  and coverage policy are resolved from configuration and governing project instructions.
  Repeated IDs are allowed beside distinct tests in one file; restored the LIFE-119 marker
  beside the pending layout-induced scroll regression test. The installed-guide regression
  test and byte-for-byte comparison with both Studio copies pass.

### Layout-induced scrolling preserves the reading anchor

- SwRS-MDOKFSTUDIO-LIFE-119: a pending scroll updates the reading anchor only when block
  geometry is unchanged. Closing a comment above the reader no longer treats the browser's
  layout-induced scroll as a new reading position. Both scroll-order unit tests and all six
  comment reading-position visual scenarios pass.

### Palette selector and toolbar tooltips

- SwRS-MDOKFSTUDIO-THEME-025: forced palettes now override dropdown colours, including the
  edition palette's mode selector on a dark host.
- SwRS-MDOKFSTUDIO-TOOLBAR-001: disabled controls dim only their icons, keeping tooltips opaque;
  hover and keyboard focus keep long labels aligned with their button. Focused style tests pass.

### Auto width no longer pulls the scroll back on tables with row handles

- SwRS-MDOKFSTUDIO-LAYOUT-023: new scenario "Table with row handles in edit mode". A wide table
  with row handles is capped at the pane minus two 34 px handle gutters, and the measurement lifts
  the !important row-handle cap. Before, the table flipped between broken out and shifted at every
  frame for some pane widths, and each re-measure pulled the scroll back to the anchor.

### Real-window typing scenario follows the block-open behaviour

- SwRS-MDOKFSTUDIO-BLOCK-041: the verification note names the real-window scenario
  scenarioTypingUndoGrouping, which now expects the clicked heading's editor to open after the
  paragraph save and closes it with Escape before the undo. No behaviour change.

### Test and marker quality

- No requirement text changes. SwRS-MDOKFSTUDIO-DIAG-009 gains page tests of the Mermaid entry point
  (element ids never repeat, passes run one at a time, a late drawing never replaces the current
  one, a failed drawing shows one error); SwRS-MDOKFSTUDIO-DIAG-024 gains a visual scenario for a
  bundled theme and an OpenIconic sprite. The superseded SwRS DIAG-012, 013, 014, 031 and 116 keep
  no marker (their behaviour is these two requirements).
- Markers narrowed from the whole style module to the CSS section that implements them:
  SwRS-MDOKFSTUDIO-LAYOUT-007 and SwRS-MDOKFSTUDIO-THEME-025.
- Companion marker files (`*.markers.ts`) name their host file and are checked by
  `just check-markers`.

### Toolbar and sticky band fixes

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

### Link navigation and history fixes

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

### Small preview lifecycle fixes

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

### Table editor polish

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

### One colour grammar for tables and colour spans

- SwRS-MDOKFSTUDIO-GFM-034: colour spans and raw HTML table styles share one grammar (a closed list
  of colour names, the keywords currentcolor, inherit, initial and unset, hex, rgb/rgba and hsl/hsla in
  comma or space form); a colour span inside a raw table keeps its colour; a
  removed span style records removed-unsafe-style. The behaviour of GFM-031 and TRUST-036 is aligned.
  Gradient stops in table styles narrow from any lowercase word ([a-z]{1,32}) to the closed list plus
  the keywords. No Known issue line described this difference.

### Small block editing and palette fixes

- SwRS-MDOKFSTUDIO-BLOCK-130: AltGr with an up or down arrow in the text box is no move chord; a
  boundary row states it and the Known issue line is removed.
- SwRS-MDOKFSTUDIO-BLOCK-127: the host also refuses a paste after the closing fence line of an
  include directive (a new refusal scenario), so the refusal no longer depends on the page; the Known
  issue line is removed.
- SwRS-MDOKFSTUDIO-PALETTE-183: exactly 20 bibliography files are a complete list and are not marked
  truncated; a boundary row states it and the Known issue line is removed.

### A refused field value no longer stays open next to a block editor

- SwRS-MDOKFSTUDIO-BLOCK-041: a click on a block or a plus insert point while a field editor holds a
  value now waits for the answer to the field's save; a saved value opens the block editor, a refused one
  is cancelled (the field shows its saved value) and the block editor opens. A new table row and a
  boundary scenario state it; the second Known issue line is removed here and from the superseded
  FMEDIT-002 and FMEDIT-073, and the first one is narrowed to clicks on another field or the background.

### One read-only reason names the real cause

- SwRS-MDOKFSTUDIO-TRUST-005: every refusal of a read-only preview (edits, comments, threads, block
  moves and clipboard, rename, palette requests) and the tooltip of a disabled checkbox now give the
  one read-only reason: the trust text for an untrusted workspace, the missing-folder text for a file
  outside every workspace folder. The three Known issue lines are removed; the boot context carries the
  reason for the tooltip. Aligned in TRUST-006, -065, -090, FMEDIT-051, MYST-042, PALETTE-148, -183,
  -192, -196, GFM-021 and -026. StRS TRUST-001: the Known issue line about the trust sentence is removed.
- SwRS-MDOKFSTUDIO-TRUST-001: the first load of a read-only page builds its properties table without
  edit cells; the Known issue line is removed and the verification note names the test.

### A refused checkbox toggle is visible and always answered

- SwRS-MDOKFSTUDIO-GFM-021: the reason of a refused toggle now also shows in a short status note next to
  the box; a toggle in a preview of a file outside every workspace folder names the missing folder. The
  Known issue line is removed here and from the superseded GFM-024 and GFM-026.
- SwRS-MDOKFSTUDIO-GFM-027: a toggle message the validator rejects is answered with a refusal, so the box
  no longer stays busy; the Known issue line is removed.
- SwRS-MDOKFSTUDIO-TRUST-005: the checkbox row of the table gives the two read-only reasons; the Known
  issue narrows to the other request types and the tooltip of a disabled checkbox.

### A failed preference write warns the reader

- SwRS-MDOKFSTUDIO-LIFE-169: when the workspace storage rejects the write of the theme mode or a view
  preference, the reader now gets one short warning (the choice still holds for the session); the Known
  issue line is removed here, in StRS TOOLBAR-001 and in the superseded LAYOUT-021, and the deprecated THEME-055 scenario and note are aligned, and the verification
  note names the new test.

## 2026-10-25

### Comments button hides the thread chips too

- SwRS-MDOKFSTUDIO-REVIEW-152: the toolbar Comments button now hides the inline thread chips together
  with the gray chips (TODO chips stay), like the preview.showComments setting. The scenario states
  it and the Known issue line is removed.

### Empty YAML schema reported as empty

- SwRS-MDOKFSTUDIO-FMSCHEMA-023: an empty or comment-only YAML schema file no longer makes the
  analysis throw; the type stays without schema and one informational row reads "schema file '{name}' is empty" (okf-schema wording). The Known issue
  line is removed (also from the superseded FMSCHEMA-025 and from StRS FMSCHEMA-006 and -008) and
  a boundary scenario states the behaviour.

### Doc and download roles without a label show their target

- SwRS-MDOKFSTUDIO-MYST-017: a `{doc}` or `{download}` role written without a label now shows the
  written target as link text (the file name for a download) instead of an empty link; the Known
  issue line about the empty link is removed and the boundary scenario states the new behaviour.

### Dollar amounts stay text, as in Sphinx

- SwRS-MDOKFSTUDIO-MYST-024: the dollar-amounts scenario now states Sphinx's dollarmath rule (an
  opening `$` is not followed by whitespace, a closing `$` neither follows whitespace nor precedes
  a digit): `$5 and $6` stays text and only a real `$x$` span is typeset. The Known issue is
  replaced by two Known issue lines (a price followed by a real span in the
  same paragraph loses the maths; `*a $5 and* $6` shows literal asterisks); the two visual scenarios `myst/v35` and `myst/v36` assert the new behaviour.

### Message sender check accepts the webview host frames

- SwRS-MDOKFSTUDIO-TRUST-059: in a real VS Code webview the host message comes from a frame that is
  neither the parent nor the page's window but has the page's own origin; the page now also accepts a
  same-origin sender other than its opener. Confirmed with a real-window run.

### Table row handle reorders the body rows of a table

- StRS-MDOKFSTUDIO-TABLE-002 and SwRS-MDOKFSTUDIO-TABLE-002 (new): in edit mode each body row of a
  pipe table or `{list-table}` shows the list editor's handle just left of the table, centred on its row;
  dragging it, or Alt+Up and Alt+Down on it, moves the row as one edit of the table text. A
  list-table row moves as a whole item and `:header-rows:` stay fixed. Out of scope and stated as
  refusals: captioned and HTML tables, included tables, the header rows, and any move while an
  editor is open. Verified by unit tests (table model, list-table source, page runtime) and fifteen
  visual scenarios (table-editing v06 to v20); no real VS Code window drag was run.

### Page security hardening: sanitizer allow-list, message sender check, no stylesheet link

- SwRS-MDOKFSTUDIO-TRUST-036: the sanitizer keeps only the elements and attributes of the supported
  rendering (allow-list); others are removed with the diagnostics blocked-element and
  blocked-attribute. Scenario replaced, Known issue line removed.
- SwRS-MDOKFSTUDIO-TRUST-042: a linked stylesheet is removed from the page (the diagnostic that it is
  ignored stays); Known issue line removed.
- SwRS-MDOKFSTUDIO-TRUST-059: the page hands a window message to the host message filter only from
  its parent frame, its own window or an event without a sender; Known issue line removed. The
  sender check cannot be proven without a real webview: covered by a unit test; it still needs one real-window run.

### Trust granted: an open Restricted Mode preview becomes writable

- SwRS-MDOKFSTUDIO-TRUST-001: on a trust grant, an open preview that was read-only only because of
  Restricted Mode moves to a trusted session on the same panel (editing, checkboxes, palette,
  workspace resource and navigation roots), renders once and keeps its reading state. Scenario and
  verification note changed; removed the Known issue line about the preview staying read-only
  (it also covers the former SwRS-MDOKFSTUDIO-LIFE-155). Host-level test only; no real-window run.

### Returning to a document restores its reading state

- SwRS-MDOKFSTUDIO-LIFE-125: switching A, B, back to A restores the focused block, selection, open
  sections and Description state of A (scenario changed, verification notes updated). Removed the two
  Known issue lines and the one of StRS-MDOKFSTUDIO-LIFE-014. SwRS-MDOKFSTUDIO-LIFE-026: its Known
  issue now states only the remaining case (a replaced session starts with an empty map).

### A refused block open keeps its reason and a way out; a refused key move says why

- SwRS-MDOKFSTUDIO-BLOCK-216: the status line is in the editor frame from the start ("Loading
  Markdown source..."), then holds the refusal reason; the frame of a refused open has a Close
  button and closes on Escape, Close, Refresh or a click on another block. Added a scenario,
  removed the Known issue line. The stale-open reason (out of date render) is now shown.
- SwRS-MDOKFSTUDIO-BLOCK-033, TABLE-034, TRUST-065: removed the Known issue lines about the hidden
  loading text and the stuck cell editor; the table cell region has the same exits.
- SwRS-MDOKFSTUDIO-BLOCK-130, BLOCK-156: a move refused after a key press shows its reason next to
  the bar under the moved block or selection. Removed the Known issue lines.
- StRS-MDOKFSTUDIO-BLOCK-025: removed the Known issue line about the empty frame.

### A link inside a paragraph is followed and opens no editor

- SwRS-MDOKFSTUDIO-BLOCK-014: in edit mode a click, Enter or Space on a link inside a paragraph
  follows the link only; the text outside the link still opens the editor. Added a row, removed
  the two Known issue lines.
- SwRS-MDOKFSTUDIO-BLOCK-017: hovering such a link no longer outlines the paragraph. Added a row,
  removed the Known issue line.

### A click on another block opens it once the save lands; no second final save

- SwRS-MDOKFSTUDIO-BLOCK-041: a click on another block while the open editor holds changed text saves
  the first editor and opens the clicked block when that render arrives, without a second click.
  Removed the Known issue line.
- SwRS-MDOKFSTUDIO-BLOCK-047: Done, Ctrl+Enter and the blur post no second final save while the first
  is in flight. Added a scenario, removed the Known issue line.

### A request of an older render is answered, not dropped

- SwRS-MDOKFSTUDIO-TRUST-065, TRUST-090, BLOCK-216: the render gate answers a request that names an older
  render with the out-of-date reason (block move, block copy, cut and paste, thread, list, picker and
  paste requests, block open, checkbox toggle), so the page clears its pending state and shows it.
  Removed the Known issue lines of TRUST-065 and TRUST-090 and the one of BLOCK-216 about the unanswered open; the open answer clears the pending state, its reason stays hidden (Known issue kept). History, view preference and palette mode messages are no
  requests and stay unanswered.

### Every label with an anchor icon can be renamed

- SwRS-MDOKFSTUDIO-MYST-038: one label name pattern for the icon, the field and the host, so a
  label starting with `_`, `.` or `-` opens the rename field; the invalid-name message no longer
  asks for a leading letter or digit. Added two scenarios (symbol labels, stale render), removed the
  Known issue line.
- SwRS-MDOKFSTUDIO-PALETTE-178: a label starting with a symbol is now listed as a target.
- SwRS-MDOKFSTUDIO-MYST-041, MYST-051: message text and name rule follow; a stale rename is answered.
- SwRS-MDOKFSTUDIO-TRUST-065: a rename from a stale render is answered with the stale-line refusal.
- SwRS-MDOKFSTUDIO-MYST-094 (superseded): removed its Known issue line.

### Block edits and insertions keep CRLF and lone-CR line endings

- SwRS-MDOKFSTUDIO-BLOCK-234: the line breaks inside an edited multi-line block are written with
  the one line ending the block already uses (the text box returns LF). Added a scenario (a block of one
  line takes the document's ending), removed the Known issue line.
- SwRS-MDOKFSTUDIO-BLOCK-094: the insertion planner counts lines by LF, CR LF and CR and inserts
  with CR in a lone-CR document. Added a scenario, removed the Known issue line.

### A soft shadow under the sticky heading band

- SwRS-MDOKFSTUDIO-TOOLBAR-002 (new): the sticky heading band casts a soft theme-coloured shadow
  while text scrolls under it, none at the top. Added three visual scenarios (light, dark, cream).

### The copy button says Copied only when the text was copied

- SwRS-MDOKFSTUDIO-CODE-019, CODE-026: the host now answers every copy request (`previewCopyTextResult`,
  ok or a reason); the button shows Copied only on success and the reason otherwise. The size
  limit is answered ("Too large to copy.") instead of dropped. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-TRUST-065: a copy request moves from the render gate to the document gate, so
  typing since the render no longer drops it. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-CODE-020: Copied is shown when the host confirms, not at the click.
- SwRS-MDOKFSTUDIO-CODE-027 (superseded): removed its Known issue line.

### The code-block copy button is reachable with the keyboard

- SwRS-MDOKFSTUDIO-CODE-017: each copyable code block is now a tab stop; focusing it shows the
  Copy code button, Tab moves to the button, Enter or Space copies. Removed the Known issue line,
  added keyboard and not-a-tab-stop scenarios and a light and a dark focus scenario.
- StRS-MDOKFSTUDIO-CODE-004: said the button also appears on keyboard focus.

### A table inserted with the caret in a table goes after it

- SwRS-MDOKFSTUDIO-TABLE-106, TABLE-115, TABLE-117: Table, Table with caption and HTML table now
  insert the new table after the table that holds the caret (pipe, `{list-table}` or HTML) instead
  of splitting it. Removed the three Known issue lines and added scenarios.
- StRS-MDOKFSTUDIO-TABLE-012: stated that an inserted table never splits the table at the caret.

### A line break pasted into a table cell becomes a space

- SwRS-MDOKFSTUDIO-TABLE-091: a line break pasted into the cell text box is now replaced by a
  space, so the source row stays one line. Removed the Known issue line.
- SwRS-MDOKFSTUDIO-TABLE-070: removed the refusal and nothing-recognised scenarios (both
  unreachable now; the dead refusal branch is gone from the button) and the two Known issue lines;
  added a scenario for a pasted line break.
- StRS-MDOKFSTUDIO-TABLE-012: removed the Known issue about a pasted line break and said that
  pasted text cannot split the row.

### Dollar amounts in the preview are specified as they render

- SwRS-MDOKFSTUDIO-MYST-024: added a boundary scenario and a Known issue line: the preview typesets
  the text between two dollar amounts (`$5 and $6`) as inline maths, unlike Sphinx. Added a visual
  scenario pair (light and dark) with a real `$x$` span as control.

### A pasted image removes the leftovers of an interrupted save

- SwRS-MDOKFSTUDIO-PALETTE-196: the next paste into a folder now deletes hidden `.partial` files of
  the extension's exact naming that are older than 10 minutes (left by a save cut off before its
  rename); newer files and every file of another form are kept. Added a scenario.

### A pasted image that loses a file-name race takes the next name

- SwRS-MDOKFSTUDIO-PALETTE-196: when another program creates a file under the chosen name
  between the name choice and the rename, the paste now keeps that file and saves the image under
  the next free name (up to 5 attempts) instead of refusing with the raw "file exists" error.

### An include with no path keeps the document rendering

- SwRS-MDOKFSTUDIO-CORE-012: an `{include}` with an empty argument now leaves the include
  placeholder with a warning on its line, and the rest of the document renders, like the other
  incomplete forms. Changed the refusal table row and removed the Known issue line (also from the
  superseded SwRS-MDOKFSTUDIO-CORE-014).

### Watcher ignore list read below the root

- SwRS-MDOKFSTUDIO-LIFE-044: the ignored build and tool folders (tmp, out, dist...) are now matched
  against the path below the preview's root, so a workspace stored under such a folder refreshes on
  included-file, image, sibling-file and conf.py changes. Changed the refusal table and removed the
  Known issue line.

### Palette requests keep working while the block editor is open

- SwRS-MDOKFSTUDIO-TRUST-065: Reference, Citation, Document link, Image and the Browse of the
  figure form are now answered while the block editor is open on the shown render, although its
  own saves moved the document revision; without an open editor the out-of-date answer stays.
  Added a row to the "older revision accepted" table and removed the Known issue line. Removed
  the matching Known issue lines from SwRS-MDOKFSTUDIO-PALETTE-109, -140, -148 and -150.

### Restricted Mode support declared

- SwRS-MDOKFSTUDIO-TRUST-001: the manifest now declares `capabilities.untrustedWorkspaces`
  (limited, with the PlantUML engine settings as restricted configurations); the boundary scenario
  and the unit test changed from "no capabilities entry" to that declaration. Removed the
  Known issue lines about a packaged VSIX being disabled in Restricted Mode from
  StRS-MDOKFSTUDIO-TRUST-001, SwRS-MDOKFSTUDIO-TRUST-001, -007 and -011.

### Site Requirements page

- Added SwRS-MDOKFSTUDIO-CORE-069: the Pages site build writes a Requirements page with the
  chain diagram from use case to test and the figures of the okfreq report (active requirements
  only), and degrades to a "not generated" text when the report is missing. Filed in
  `rendering-core`, the closest scope, deriving from StRS-MDOKFSTUDIO-TRUST-014 (maintainer
  builds), because the lowest free `trust-security` number is a retired id.
- Marked at `test/site/requirementsPage.test.ts` (`@tests_req`) and, because the code lives in
  `test/site/`, outside the configured `source_dirs`, at the companion
  `src/core/render/requirementsPage.markers.ts` (`@implements_req`).

### Complete baseline

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

### Batch 1

- Added the first requirements: 27 StRS and 237 SwRS for rendering-core (5 / 68), code-blocks
  (4 / 38), gfm (4 / 38) and myst (14 / 93). Each SwRS derives from a StRS and has a nominal
  and a boundary scenario. No traceability markers yet. Verification: `okfreq validate
  --prose --check-links`, `lint --check` and `update-coverage --check` pass (264 requirements).

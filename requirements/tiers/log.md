# Update Log

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

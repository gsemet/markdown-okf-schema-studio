# Requirements guidelines

This file specializes the [okfreq baseline](okfreq-baseline.guidelines.md) for the Markdown
OKF-Schema Studio VS Code extension. Read and follow the baseline first; the rules below supply
our paths, scopes, marker syntax and checks.

## Anchored to the code

The requirements describe what the code does today, checked against the source and the tests.
They are not a wish list and not the desired state.

- Write each SwRS from the current behaviour, including a behaviour that looks wrong. Do not
  specify the intended fix.
- A suspected bug is still specified as it behaves. Say so in the body ("Known issue: …"), and
  file the fix as a backlog item.
- The requirement text never names a backlog item: the link goes from the backlog item to the
  SwRS, so the requirement stays true when the item moves or is archived.
- The fix changes the code, the test and the SwRS in the same change (edit the SwRS, or
  `okfreq supersede` it when the contract changes).
- A behaviour with no requirement yet is a coverage gap, not a reason to describe a future state.
- The markers are the anchor: `@implements_req` at the code that produces the behaviour,
  `@tests_req` at a test that checks it (see
  [Traceability markers](#traceability-markers-typescript-javascript-python)). Write the SwRS from
  that code and that test. When the code or the test moves, its markers move in the same commit.

## Running okfreq

okfreq is a project dependency (dependency group `requirements`). Run it through uv, never through
a global install: `uv run --no-sync --group requirements okfreq <command>` (`just dev` installs
it). In the commands below, `okfreq` stands for that full command. The `just requirements-*`
targets use it already.

## Before editing

- The bundle is `requirements/`, documents under `requirements/tiers/`.
- Read `requirements/config.yml` and every schema under `requirements/tiers/_schema/`.
- Scopes are the 16 e2e groups of `test/shared/e2eGroups.ts` (frozen ids): rendering-core,
  code-blocks, gfm, myst, diagrams, frontmatter-schema, frontmatter-editing, layout-width,
  theme-zoom, toolbar-navigation, block-editing, palette-slash, table-editing,
  review-annotations, lifecycle-sync, trust-security. A new e2e group needs a new scope in the
  same change.
- Preserve requirement IDs, UUIDs, authored fields, unknown metadata and Markdown bodies.
- Use the shared vocabulary of `.agents/glossary/common.md` (palette, insert point, block editor,
  anchor icon, slash menu…) in titles and statements.

## Levels

- **StRS** (`StRS-MDOKFSTUDIO-<TOKEN>-NNN`): a user use case observable in VS Code (what a writer,
  reviewer or maintainer can do and see), with `--user-need`. No implementation detail, no
  message names, no pixel values. A use case is broad enough to have about 3 to 8 SwRS; a scope
  has about 2 to 8 StRS.
- **SwRS** (`SwRS-MDOKFSTUDIO-<TOKEN>-NNN`): one observable behaviour of the extension (host,
  page or renderer), meaning one trigger family and one outcome rule, with `--derives-from` one or
  more StRS (any scope). The body holds all the scenarios of that behaviour, named by kind:
  `### Scenario (nominal): …`, `### Scenario (refusal): …` and `### Scenario (boundary): …`. It
  has at least one nominal and one refusal or boundary scenario and about eight at most; above
  that, it holds two behaviours and is split. Equivalent cases go in one scenario with a table
  (input, outcome), not in several scenarios or several SwRS.
- One SwRS per palette action, and one per page↔host message type of `src/core/protocol/`. A
  message SwRS states the accepted shape and what happens to a malformed or unexpected message.
  The feature SwRS that handles a message is its message SwRS when it states that shape. One
  message SwRS may cover two types that share one shape.
- Settings, commands, slash entries and toolbar buttons are named scenarios of the feature SwRS
  they belong to (accepted values, default, refusal of invalid or stale input), not SwRS of
  their own.
- A rule that every message, request, button or handler applies (a gate, the read-only refusal,
  answer correlation, one edit at a time, where a view choice is stored) is written once, as a
  cross-cutting SwRS with one table row per case. A SwRS that relies on it lists it in
  `depends_on` and cites it ("see SwRS-…") instead of repeating its scenarios.
- Known issues are notes in a `### Known issues` section (`- Known issue: …`), written as the
  code behaves. Only behaviour defects go there; documentation and test gaps go to the backlog.
- Page-wide properties checked on every visual scenario (no horizontal overflow, toolbar row
  layout per zoom, tooltip contrast, white/cream palette) are ONE SwRS each, in the scope of their
  subject (layout-width, toolbar-navigation, theme-zoom), not one per scenario.
- Families of equivalent assertions (code-blocks v05–v12, admonition galleries) map to one SwRS;
  a long scenario lock line is split into scenarios of that SwRS.

## Creating

```console
okfreq new strs "<title>" --path . --project markdown-okf-schema-studio --scope <scope> \
  --description "When <trigger>, the Studio SHALL <observable outcome>." --user-need "<need>"
okfreq new swrs "<title>" --path . --project markdown-okf-schema-studio --scope <scope> \
  --description "When <trigger>, the extension SHALL <one bounded response>." \
  --derives-from StRS-MDOKFSTUDIO-<TOKEN>-NNN
```

Never write requirement frontmatter by hand and never reuse an ID; retire with
`okfreq archive <ID> --path . --yes` or `okfreq supersede <OLD> <NEW> --path . --yes`.
Use the frontmatter `title` verbatim as the first `##` heading (replace the generated
`## EARS Expression`). Replace every `<placeholder>`.

`okfreq new` takes the lowest free number. Never create a requirement in a change that also
deletes requirement files, and never create one whose number is listed as retired in
`requirements/tiers/log.md`.

## Traceability markers (TypeScript, JavaScript, Python)

okfreq recognises a marker only at the **start of a line**, after optional indentation and one
comment opener (`//`, `#`, `/*`, `*`, `<!--`), followed by the ID:

```ts
// @implements_req SwRS-MDOKFSTUDIO-GFM-003
export function toggleCheckbox(...) { ... }

test("toggles the clicked box only", () => {
  // @tests_req SwRS-MDOKFSTUDIO-GFM-003
  ...
});
```

```python
# @tests_req SwRS-MDOKFSTUDIO-LAYOUT-001
def check_no_horizontal_overflow(page): ...
```

- Not recognised: a marker after code on the same line (`foo(); // @implements_req …`) and
  `/** @tests_req …` on the opening line of a JSDoc block (use `/*` or put it on a ` * ` line).
- Inside code that is stringified into the webview (`.toString()` factories in `src/page/`),
  comments are kept in the page script: that is acceptable (no runtime effect) but keep markers
  out of template literals that produce HTML/CSS.
- One marker per ID per file (a second one is reported as a duplicate); put it next to the main
  implementation point or the first test of the behaviour.
- `@implements_req` only in configured `source_dirs`, `@tests_req` only in `test_dirs` (other
  occurrences are ignored). Only SwRS get `@implements_req`.
- StRS test markers only on real stakeholder validation tests: integration suites under
  `test/integration/`, the real-input harness, and visual scenarios (`test/visual/scenarios.ts`),
  as required by `strs_test_coverage_mode: linked-swrs-and-validation-test`.
- `package.json` contributes (JSON, no comments): mark the TypeScript that reads the setting or
  registers the command (`src/core/configuration/*.ts`, `src/extension.ts`), and list `package.json` in
  the SwRS `documentation_files` only when it documents the setting text.
- A visual scenario's `@tests_req` goes on its own line directly above the scenario entry in
  `test/visual/scenarios.ts`; page-wide checks get theirs above the check function in
  `test/visual/capture.py` or `test/shared/geometry-checks.js`.
- Companion marker files: a file at its size limit (`scripts/check-file-sizes.mjs`) cannot take
  marker lines. Its markers live in a sibling `<name>.markers.ts` that holds only comment lines
  and `export {};`, with a `// Companion of: <path>` header naming the host file. Move them back
  into the host file when it is split and delete the companion. `just check-markers` (part of
  `just check`) fails when the host file is gone or a marker names no requirement. Current
  companions: `test/integration/realInput.markers.ts`; `src/page/modules/plantumlBundle.markers.ts`
  and `src/core/render/requirementsPage.markers.ts` are different: the behaviour they mark is in
  `esbuild.mjs` or in site tooling, outside the marker source folders.
- A declarative behaviour (a `package.json` key, the lock file, an absence of code) cannot carry a
  marker: set `annotation_exemption: true` with the reason in `exemption_reason`.

## After editing

```console
okfreq update-coverage requirements
okfreq validate requirements --prose --check-links --project-root .
okfreq lint requirements --prose --check-links --project-root .
okfreq trace requirements --json
just requirements-report
just check
```

`just preflight` remains the completion gate. Do not claim traceability when a non-exempt SwRS
lacks source or test markers, a marker names an unknown ID, or tests fail. An SwRS that cannot be
tested in this repository (for example a manual check on a locked screen) sets
`annotation_exemption: true` with an `exemption_reason`.

## Navigation and history

- `requirements/index.md` is authored; `okfreq lint requirements` regenerates the marked blocks of
  `requirements/tiers/**/index.md` (never hand-edit between the `okfreq:index` markers).
- Append substantive changes (IDs, why, verification results) to `requirements/tiers/log.md`,
  newest date first; never invent approvals or results.
- Every behaviour change (feature or fix) updates its SwRS (or adds one), the markers, README /
  CHANGELOG and tests in the same change.

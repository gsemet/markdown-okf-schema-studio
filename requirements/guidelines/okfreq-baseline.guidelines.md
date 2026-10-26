---
name: okfreq-requirements
description: 'Shared, project-independent guidance for maintaining okfreq requirement bundles.'
---

# Requirements guidelines

Use this guide for an okfreq requirements bundle. Resolve project-specific paths,
scopes, identifiers, commands and constraints from the project's governing
instructions, configuration and schemas, not from another project's examples.

## Bundle layout

The bundle root owns `config.yml`, this `guidelines/` folder and an optional
human-authored `index.md` overview. `tiers/` owns `_schema/`, `index.md`,
`log.md` and the configured level folders, such as `strs/` and `swrs/`.
Requirement documents live only under `tiers/`.

## Before editing

- Read the nearest `AGENTS.md`, constitution and registered requirements rules.
  Follow the project's authority order; this shared guide does not override it.
- Read the bundle's `config.yml` and every schema under `tiers/_schema/`.
- Derive levels, folders, ID prefixes, scopes, lifecycle values, marker syntax,
  evidence directories and coverage policy from that configuration. Do not
  hard-code another project's names, paths, counts or commands.
- Use `okfreq` for creation, validation, indexing, traceability, and lifecycle changes.
- Use the project's configured environment and task runner; `okfreq` in this
  guide stands for the prescribed invocation, including its environment wrapper.
- Read `okfreq --help` for the authoritative command options.
- When backfilling an existing feature, inspect agreed documentation, source and
  tests first. Propose intended behavior with evidence and open questions;
  do not assume every implemented detail is a desired requirement.
- Follow the governing project's policy for known defects. Describe verified
  behavior accurately, record discrepancies explicitly, and use a `Known issues`
  section when required. Never present a planned fix as already implemented.
- Missing evidence is a coverage gap. Do not repair it by inventing markers,
  approvals, external ownership, exemptions or successful test results.

## While editing

- Use the frontmatter `title` verbatim as the first Markdown heading (`## Title`).
  Keep the heading synchronized when renaming a requirement; EARS describes
  the statement format, not the document title.

- Store stakeholder requirements under `tiers/strs/<scope>/` and software
  requirements under `tiers/swrs/<scope>/`.
- Use the filename and ID convention established by the bundle.
- Create requirements through `okfreq new`, never by allocating IDs or writing
  frontmatter manually. Preserve IDs, UUIDs, authored fields, unknown metadata,
  comments and bodies. Never reuse a retired ID; use the configured `archive`
  or `supersede` operations for lifecycle changes.
- Author parent relationships with `derives_from`; never hand-edit generated
  `derived_by`, `implemented_in_files`, or `tested_in_files` fields.
- For leaf software requirements, add `@implements_req <ID>` markers near the
  implementation and `@tests_req <ID>` markers near corresponding tests. Do not
  use source markers on stakeholder or other non-leaf levels. A real direct
  stakeholder validation test may carry an StRS test marker when the configured
  coverage mode requires it.
- A behavior fix changes the code, tests and SwRS together. Preserve the identity
  when refining the same contract; use lifecycle operations when replacing it.
- Define a cross-cutting rule once. Requirements that rely on it reference its
  ID through configured dependency fields instead of copying its scenarios.
- Use the project's shared vocabulary. Keep issue/backlog references outside
  normative statements so an issue's lifecycle cannot change their meaning.

## Traceability markers

- Use the configured marker prefixes near actual evidence. With the defaults,
  put `@implements_req <ID>` near the implementation and `@tests_req <ID>` near
  each test that checks the behavior.
- The same requirement ID may appear more than once in a file, for example
  when several tests verify different scenarios of the same requirement.
  Keep a marker beside each relevant test or implementation point. Do not
  remove these links or consolidate them at the first test merely to make
  the ID unique per file. Repeating an identical marker at the same evidence
  point adds no useful information.
- A scanner's repeated-marker diagnostic is not by itself evidence of an
  invalid link. Review the marked code or tests; distinct evidence points are
  legitimate. A generated file-level coverage list neither enumerates tests
  nor proves that each marked test ran successfully.
- Markers must start a line after optional indentation and a supported comment
  opener (`//`, `#`, `/*`, `*` or `<!--`). A marker after executable code on
  the same line is not recognized. In JSDoc, use a separate ` * ` line rather
  than the `/**` opening line.
- Implementation markers belong to configured `source_dirs`; test markers
  belong to configured `test_dirs`. When code or tests move, move their markers
  with them. Keep markers outside generated HTML/CSS strings.
- For declarative behavior that cannot carry a marker, use configured exemption
  fields only with an explicit, justified decision. Companion marker files,
  when permitted by project policy, identify their owning file and remain
  synchronized with its existence and behavior.

## Generated navigation metadata

`okfreq init` adds `x-okf-link` annotations to the generated schemas. They
declare requirement filename-stem links and project-relative source/test links,
including advisory `id_marker`, marker prefixes, tooltip/preview field hints,
and source/test line-number hints. These annotations guide editors and other
consumers; they do not execute tests or prove coverage. Existing schemas are
preserved and are not migrated by `okfreq init`.

## Tier-specific authoring formats

- For an StRS, pass a stakeholder-observable `SHALL` statement as
  `--description` and the underlying outcome as `--user-need`. Complete the
  generated normative behavior, user need, and rationale/constraints sections.
  Do not add SwRS scenarios or verification notes.
- For an SwRS, pass one observable, bounded `SHALL` response as `--description`
  and at least one valid StRS ID with `--derives-from`. Complete both generated
  GIVEN-WHEN-THEN scenarios and the objective verification notes. Do not add an
  StRS user-need or stakeholder-constraints section.
- Cover nominal behavior and relevant refusal, failure or boundary cases.
  Group equivalent inputs and outcomes in a scenario table. Split unrelated
  behaviors rather than growing an unbounded scenario list in one SwRS.
- Settings, commands, buttons and protocol shapes belong to the bounded
  behavior they implement. State accepted values, defaults, malformed input
  and stale-request handling where applicable; avoid duplicate requirements
  for equivalent entry points.
- Replace every angle-bracket placeholder before review. A remaining placeholder
  is an explicit gap, not content to delete or silently reinterpret.

## After editing

- Run `okfreq validate --prose`, then `okfreq lint --prose` so unfinished
  scaffold placeholders remain visible as advisory findings.
- Refresh owned fields with `okfreq update-coverage <bundle>`. When the project
  root is known, add `--check-links --project-root <project>` to validation and
  lint. Inspect trace, graph, status and reports as appropriate.
- Preview generated updates with the command's `--check` or `--diff` options
  before applying them.
- Write generated reports to the project's designated output directory with
  `--output-json` and `--output-summary-md`, never into `tiers/`. Use a
  project-relative `dist/` directory when no output policy is defined.
- Missing or malformed requirement frontmatter and missing IDs fail explicitly;
  repair the document instead of dropping it from the reported inventory.
- Treat `draft`, `proposed`, and `approved` as distinct lifecycle states.
- Run the project's own test suite; a marker is a link, not proof that a test passes.
- Run the complete project quality gate. Do not claim complete traceability
  when non-exempt leaf requirements lack source or test links, markers reference
  unknown IDs, or validation/tests fail. Report unexecuted checks and failures.
- A behavior change updates affected requirements, tests, human documentation,
  release notes, standalone agent guidance and examples in the same change.
  Preserve unrelated working-tree edits and review generated diffs.
- Synchronize explicitly maintained copies when this shared guide changes.
  Initialization preserves existing project files; it must not silently replace
  project policies with new defaults.

## Navigation and change history

- Run `okfreq lint <bundle>` after adding, moving, removing or changing a
  requirement. It generates `tiers/index.md`, configured tier indexes and
  indexes in every directory containing requirements or their descendants,
  including scope folders such as `tiers/swrs/core/index.md`.
- Only content between `<!-- okfreq:index:start -->` and
  `<!-- okfreq:index:end -->` is generated. Do not hand-edit that block.
  Frontmatter, introductions and authored text outside it are preserved.
  The optional `<bundle>/index.md` overview is authored and is not generated.
- Preview with `okfreq lint <bundle> --diff`; use `--check` for read-only CI
  verification. Check mode fails when navigation is absent or stale. Structural
  validation must pass before lint writes any indexes.
- Agents append a dated entry to `<bundle>/tiers/log.md` after substantive
  requirement changes: record affected IDs or relative links, what changed,
  why it changed, decisions or open questions and actual verification results.
  Put newest dates first and append to an existing date section when appropriate.
- The canonical filename is `log.md`, not `logs.md`. It is authored history:
  lint must never regenerate or overwrite it. Do not add a history entry solely
  because identical generated artifacts were refreshed, or invent approvals or
  test results. Preserve previous entries.

# Project requirements guidelines

This file specializes the shared okfreq guidelines of this folder for this project.

## The bundle stays a native OKF v0.2 bundle

`requirements/tiers/` is read by plain OKF consumers, not only by okfreq. okfreq (okf-schema 0.17
or later) projects its vocabulary onto OKF fields on `okfreq update-coverage` and `okfreq lint`,
run by `just requirements-update` and checked by `just requirements-lint`. The schemas of
`tiers/_schema/` declare the projection:

- The okfreq lifecycle field is `req_lifecycle` (`lifecycle.field` in `config.yml`). Its
  `x-okf-status-projection` mapping generates the OKF `status`: `draft` is `draft`, `proposed`
  and `approved` are `stable`, `deprecated` and `superseded` are `deprecated`.
- An owner approval (`approved_by`, `approved_at`, an ISO 8601 datetime with a UTC offset) is
  also generated as an OKF `verified` event `{by: human:<approved_by>, at: <approved_at>}`.
- Each field whose `x-okf-link` carries a `link-projection` label (`derives_from`, `derived_by`,
  `depends_on`, `superseded_by`, `supersedes`, `relates_to`) is generated as a group of Markdown
  links in a `### Links` section at the end of the body, between `<!-- okf:links:start -->` and
  `<!-- okf:links:end -->`. Only resolutions inside the bundle (`filename-stem`,
  `bundle-relative`) can be projected.

Never hand-edit `status`, `verified` or the Links block; change `req_lifecycle`, the approval,
the relations or the schema annotations and run `just requirements-update`.

## Log headings

A heading of `tiers/log.md` is exactly `## YYYY-MM-DD`, newest first, one per date. The topic of
an entry goes in a `### Topic` sub-heading under its date, never in the date heading.

## Main paths of a StRS

A StRS describes a whole use case: A, then B, then C gives D. Testing every way through it end to
end is too combinatorial; its SwRS are the options at each state, each tested on its own. A StRS
may therefore carry a `### Main paths` section that names one to three paths through the use case,
step by step, each step backed by the SwRS that moves the user to the next state.

```markdown
### Main paths

#### Path S1: <short name of the path>

1. <state, in the reader's words>
   - SwRS-<ID>: <what moves the reader to the next state>
   - Option SwRS-<ID> (<nominal|boundary|refusal>): <another thing that can happen here>
2. <next state>
   ...
3. <final state: the result the user wanted>

#### Path S2: <name>

1. <a state already named in path 1, same words: the paths join there>
   - SwRS-<ID>: ...
2. <final state>
```

- A path heading is `#### Path S<n>: <name>`, numbered S1, S2, S3 in order: the id is how a test
  names the path (`@accepts_req StRS-<ID>#S<n>`, see "Scenario and path markers").
- A state is the same state in every path when its text is the same.
- The first bullet without `Option` is the step to the next state; it is drawn on the path.
- `Option` bullets are the other outcomes at that state; the scenario kind in brackets, when
  given, picks the scenarios of the SwRS that this option covers.
- The last state of a path has no bullet.
- A SwRS that derives from the StRS and appears in no path is read as "also serves this need"; it
  is not written in the StRS.
- One to three paths per StRS. A StRS whose SwRS do not form a path has no section.
- Every cited SwRS exists, is active (`req_lifecycle` is `draft`, `proposed` or `approved`, not
  `deprecated` nor `superseded`; a `draft` SwRS may be cited) and has that StRS in its
  `derives_from`, or is listed in that StRS's `depends_on` (a shared rule the use case relies on).
- A shared rule that many StRS rely on is cited with `depends_on` rather than derived by every StRS
  that relies on it.
- Paths state what the extension does today, like the rest of the requirement; a step never
  describes behaviour that no cited SwRS specifies.
- The section is authored text: it sits after the last authored section of the StRS (usually
  `### Rationale and constraints`) and before the generated `<!-- okf:links:start -->` block. When
  the StRS also carries a `### Use case diagram` (next section), the diagram comes just before
  Main paths, so Main paths is the last authored section.
- `just requirements-lint` runs `scripts/check_main_paths.py`, which verifies the cited SwRS only
  (not the wording of states, the kind in brackets or the shape of the list). Its last line is
  `main paths: <n> StRS checked, <m> SwRS citations, all valid`, where `<n>` counts the StRS that
  have a section.

## Use case diagram of a StRS

A StRS may carry a small diagram that a reader sees at once: who takes part and what happens. The
same Mermaid text is drawn by GitHub on the Markdown file and, at site build time, on the use case
page of the requirements site.

- The section is an authored `### Use case diagram` heading holding exactly one
  ```` ```mermaid ```` fence and nothing else but an optional one-line caption sentence.
- It sits after the last authored section (usually `### Rationale and constraints`) and before
  `### Main paths`; never inside nor after Main paths, because `test/site/requirementsViewer/mainPaths.ts`
  and `scripts/check_main_paths.py` end that section at the next `### ` heading.
- The kind is chosen per StRS by what explains it best: `sequenceDiagram` by default (the writer,
  the preview, VS Code, the file); `flowchart` with one node per role when several roles take part
  (an actors diagram); `stateDiagram-v2` for a mode (edit on or off).
- The section is optional in this release of the rule; a later change makes it mandatory for every
  in-force StRS, with a check.
- The diagram speaks of actors (the writer, the preview, VS Code, the file), never of SwRS: no
  SwRS ID in a diagram, so it does not compete with the Main paths map.
- PlantUML is not allowed: GitHub does not render it.
- `okfreq` validates the section with no error. GitHub rendering of the fence: checked on a GitHub
  branch preview, GitHub draws a sequence, a flowchart and a state diagram fence natively. It uses
  its own theme (not the site's cream colours) and a newer Mermaid than the site's `mermaid
  ^12.2.0`, and shows the figure in an iframe with pan, zoom and copy buttons. The layout and the
  text match the site and no label was cut. The two renderers can still differ, so a diagram can
  look different, or fail, on one side only.
- `just requirements-lint` runs `scripts/check-use-case-diagrams.mjs`, which parses every use case
  diagram with the project's Mermaid (the same extraction as the site) and fails on any parse error
  with `<path>:<line>: <StRS id>: ...` followed by Mermaid's message. Its last line is
  `use case diagrams: <n> StRS checked, all parse (Mermaid <version>)`. It parses and does not
  draw: a diagram that parses but cannot be drawn still fails only the site build.
- Ids Mermaid reserves (a participant used in a message, a node or a state with one of these names
  does not parse; the check catches others too):
  - `sequenceDiagram` (any case): `box`, `end`, `alt`, `opt`, `loop`, `par`, `and`, `else`, `rect`, `critical`, `break`, `option`, `note`, `activate`, `deactivate`, `participant`, `actor`, `create`, `destroy`, `title`, `autonumber`, `over`
  - `flowchart` (lower case): `end`, `subgraph`, `graph`, `style`, `class`, `click`
  - `stateDiagram-v2`: `state`, `note`
- On the site the diagram is drawn once, in the cream colours of the site (the site has no dark
  mode); a fence that Mermaid cannot draw fails the site build with the StRS id and Mermaid's
  message.

## During a change

These rules hold for every change, whoever makes or checks it.

### Requirements traceability

Every change, no exception. A change is incomplete when a behaviour change has no SwRS update, or
a touched requirement lacks its `@implements_req` or a `@tests_req` at each test, or
`just requirements-update` was not run. The agent that makes the change updates the SwRS and the
markers in the same change: `@implements_req <ID>` next to the implementation **and**
`@tests_req <ID>` next to **each** test that checks it, for every touched leaf requirement;
`just requirements-update` run and its generated files committed; a dated entry in the bundle's
`tiers/log.md`; a refactor moves the markers with the code. Never leave a touched requirement
without a source or a test link.

Before the PR is opened, the agent that opens it (for a stack, per branch) runs the check as CI
runs it (`okfreq validate --check-links --project-root .` and coverage with CI's okfreq version);
a gap is fixed before the PR opens. The PR body's Tests section lists the requirement IDs added or
changed with their source and test files.

### Marker placement

A marker links a requirement to the code or test that carries it, so it sits at that code point,
never in a list on a file header or a constant. `just check-markers` (part of `just check`) holds
the rules below; the definition comes first.

> **Marker block**: the requirement markers that sit together with no line of code between them.
> Several one-ID marker comments above one declaration or one test form one block, even when blank
> lines or prose comment lines (a JSDoc, an explanation) separate them; only a code line ends a
> block. A block names at most 3 distinct requirement IDs. To mark more, put each marker at the
> code or test it names: on another declaration, or inside the test body that checks it.

- **A source marker on every SwRS.** An in-force SwRS (`draft`, `proposed`, `approved`) that is not
  exempt (`annotation_exemption` is not `true`) has an `@implements_req` in a source directory
  of `requirements/config.yml`. No baseline.
- **At most 3 IDs per marker block**, in every file under the source and test directories.
- **A companion names its target.** A companion marker file is a tracked file under `src/` or
  `test/` named `*.markers.ts` or holding a `// Companion of: <path>` line: it holds markers that
  cannot live in the file they belong to (the host), only comment lines and `export {};`. Each of
  its marker lines is `// @tests_req <ID> — <scenario>` or `// @implements_req <ID> — <code point>`
  (an em dash between spaces, then a name): the scenario that checks the ID, or the function,
  constant, module or build entry that implements it. The name occurs as text in the host file or
  in a file directly in the host's folder. A companion whose lines are all named is not held to the
  cap of 3.
- **The baseline** `scripts/marker-baseline.json` freezes the offenders that existed when the gate
  started (`blocks`: files with an over-limit block; `unnamedCompanionLines`: companions with
  unnamed lines). An entry may only shrink: when a file improves, lower the entry with
  `node scripts/check-marker-companions.mjs --update` (the check says so), which also removes the
  entries that reached 0. A new marker list over 3 IDs or a new unnamed companion line is never
  added to the baseline: put the markers at their code or tests.

### Scenario and path markers

okfreq 0.18 declares the scenarios of a SwRS and the paths of a StRS, and a marker names the one it
checks. `just check-markers` holds these rules (`fragment-undeclared`, `fragment-required`,
`fragment-unexpected`, `implements-fragment`, `accepts-placement`, `accepts-on-swrs`,
`strs-tests-in-integration`):

- A SwRS lists its scenarios in the `scenarios:` of its frontmatter, and each has a heading
  `### Scenario S<n> (<nominal|boundary|refusal>): <title>` with the same id. A StRS lists its paths
  in `scenarios:` and writes `#### Path S<n>: <name>`.
- A test names the scenario it checks with `@tests_req <SwRS-ID>#S<n>`, one marker line per
  scenario (a test that checks two scenarios has two lines). A test that exercises no declared
  scenario has no marker for that SwRS: never pick a fragment by guess, the scenario stays
  uncovered and is reported as such.
- A StRS path walked end to end in real VS Code, under `test/integration/`, is
  `@accepts_req <StRS-ID>#S<n>`. Only CORE-007, CORE-008 and TRUST-014 may sit under `test/build`,
  `test/security`, `test/site` or `test/core`. `@accepts_req` never targets a SwRS, and no
  `@tests_req StRS-...` sits under `test/integration/`.
- `@implements_req <SwRS-ID>` has no fragment: the code implements the requirement as a whole.
- A marker on a requirement that declares no `scenarios:` has no fragment either.
- The 3-ID cap of a marker block counts requirement IDs: the fragments of one ID count once.

### Approved requirements

Before the change starts, the requirements the change would alter are listed: every `approved`
requirement it would change (normative statement, scenarios, criteria, deprecation, supersession)
with its owner (`owner_email`, else `default_owner_email`). The owner is asked explicitly whether
they agree, and the answer is recorded in the change's specification. No agreement: the change does
not touch those requirements. With agreement, the author sets `approved_by` to the owner's email and
`approved_at` to the current date and time with its UTC offset (ISO 8601, for example
`2026-10-28T09:00:00+01:00`), the PR body lists those requirements under "Approved requirements
changed", and the agent that opens the PR requests the owner's review on the PR. Nobody approves a
requirement, nor changes an approved one, without that recorded agreement; `okfreq validate` fails
on an approved requirement without `approved_by` and `approved_at`. New requirements delivered with
their code are created `proposed` (`okfreq new … --lifecycle proposed`), never `draft`.

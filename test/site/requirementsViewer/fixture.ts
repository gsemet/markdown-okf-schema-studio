import { EXAMPLE_SWRS_ID } from "./model";

/** A small okfreq report for the viewer tests: two areas, a use case with Main paths, a retired SwRS. */

export const DIAGRAM_SOURCE = "sequenceDiagram\n  participant W as Writer\n  participant P as Preview\n  W->>P: types\n  P-->>W: shows";

/** A `### Use case diagram` section, as an authored StRS carries it just before Main paths. */
export const DIAGRAM_SECTION = `### Use case diagram

\`\`\`mermaid
${DIAGRAM_SOURCE}
\`\`\`

`;

export const MAIN_PATHS =`### Main paths

#### Path 1: Do it

1. State A
   - SwRS-X-010: the writer starts
2. State B
   - SwRS-X-011: the writer goes on
   - Option SwRS-X-012 (refusal): the writer is refused
3. State C
`;

const SCENARIO = (kind: string, name: string, id = ""): string =>
  `### Scenario${id ? ` ${id}` : ""} (${kind}): ${name}\n\n- GIVEN a box\n- WHEN it is <clicked>\n- THEN it flips\n  and stays\n\n`;

/** SwRS-X-014: a table scenario, and a scenario mixing steps, a note, a bullet and a table. */
const TABLE_SCENARIOS_TEXT = [
  "### Scenario (nominal): Table only",
  "",
  "| Input | Outcome |",
  "| --- | --- |",
  "| `a \\| b` | kept |",
  "| &lt;b&gt; &amp;lt; | decoded once |",
  "",
  "### Scenario (boundary): Steps, note and table",
  "",
  "- GIVEN a box",
  "- WHEN it is &quot;x&quot;",
  "- THEN it flips",
  "",
  "A note line &quot;x&quot; under the steps.",
  "- A bullet note",
  "",
  "| Given | When | Then |",
  "| :--- | :---: | ---: |",
  "| a | b | c |",
  "",
].join("\n");

export interface FixtureOptions {
  readonly lifecycleKey?: "req_lifecycle" | "lifecycle";
  readonly lifecycle?: string;
  readonly exempt?: boolean;
  readonly target?: boolean;
  readonly implemented?: boolean;
  readonly tested?: boolean;
  readonly text?: string;
  readonly derivesFrom?: string[];
  readonly supersededBy?: string[];
  readonly supersedes?: string[];
  readonly implementedIn?: string[];
  readonly testedIn?: string[];
  readonly userNeed?: string;
  /** The frontmatter description (the rule of a behaviour). */
  readonly description?: string;
  /** The `scenarios:` frontmatter: the paths of a StRS or the scenarios of a SwRS. */
  readonly scenarios?: { id: string; title: string }[];
  /** The StRS status of the report (`covered` by default). */
  readonly covered?: boolean;
  readonly acceptanceExemption?: string;
}

export function requirement(id: string, tier: "StRS" | "SwRS", scope: string, options: FixtureOptions = {}): unknown {
  const target = options.target ?? tier === "SwRS";
  return {
    id,
    tier,
    scope,
    path: `requirements/tiers/${tier.toLowerCase()}s/${scope}/${id}.md`,
    text: options.text ?? "",
    derives_from: options.derivesFrom ?? (tier === "SwRS" ? ["StRS-X-001"] : []),
    superseded_by: options.supersededBy ?? [],
    supersedes: options.supersedes ?? [],
    frontmatter: {
      id,
      tier,
      scope,
      title: `Title of ${id}`,
      description: options.description ?? `When x, the extension SHALL do ${id}.`,
      user_need: tier === "StRS" ? (options.userNeed ?? "As a writer, I do a thing.") : undefined,
      [options.lifecycleKey ?? "req_lifecycle"]: options.lifecycle ?? "proposed",
      annotation_exemption: options.exempt ?? false,
      exemption_reason: options.exempt ? "Documentation only" : "",
      implemented_in_files: options.implementedIn ?? ["src/a.ts"],
      tested_in_files: options.testedIn ?? ["test/a.test.ts", "test/integration/a.test.ts"],
      scenarios: options.scenarios,
      acceptance_exemption: options.acceptanceExemption === undefined ? undefined : true,
      acceptance_exemption_reason: options.acceptanceExemption,
    },
    coverage_target: target,
    implementation: { status: options.implemented === false ? "missing" : "covered" },
    tests: { status: options.tested === false ? "missing" : "covered" },
    stakeholder_test_coverage: tier === "StRS" ? { status: options.covered === false ? "missing" : "covered" } : undefined,
  };
}

export const KNOWN_ISSUES_TEXT = "### Known issues\n\n- Known issue: first\n- Known issue: second\n";

/**
 * Active: use cases 001 (gfm, with paths) and 003 (gfm, none); behaviours 010, 011, 012, 013 (myst, two parents),
 * 014 and the example. Retired: use case 002 and behaviours 015 (superseded by 014) and 016 (archived).
 */
export function fixtureReport(overrides: { generatedAt?: string } = {}): string {
  return JSON.stringify({
    generated_at: overrides.generatedAt ?? "2026-10-25T10:00:00+00:00",
    totals: { combined_coverage_percent: 75 },
    scopes: { gfm: { combined_coverage_percent: 80 } },
    requirements: [
      requirement("StRS-X-001", "StRS", "gfm", {
        text: `## T\n\n${DIAGRAM_SECTION}${MAIN_PATHS}\n<!-- okf:links:start -->\n`, userNeed: "As a writer, I do <b>a</b> thing.",
        scenarios: [{ id: "S1", title: "Do it" }, { id: "S2", title: "Do it <twice>" }],
      }),
      requirement("StRS-X-002", "StRS", "myst", { lifecycle: "superseded", supersededBy: ["StRS-X-001"] }),
      requirement("StRS-X-003", "StRS", "gfm", { covered: false, scenarios: [{ id: "S1", title: "Only path" }] }),
      requirement("SwRS-X-010", "SwRS", "gfm", { text: SCENARIO("nominal", "Start", "S1"), scenarios: [{ id: "S1", title: "Start" }] }),
      requirement("SwRS-X-011", "SwRS", "gfm", {
        implemented: false, text: SCENARIO("nominal", "Go on", "S1") + SCENARIO("boundary", "Go on twice", "S2") + KNOWN_ISSUES_TEXT,
        scenarios: [{ id: "S1", title: "Go on" }, { id: "S2", title: "Go on twice" }],
      }),
      requirement("SwRS-X-012", "SwRS", "gfm", {
        text: SCENARIO("refusal", "Refused", "S1") + SCENARIO("nominal", "Not refused", "S2"),
        scenarios: [{ id: "S1", title: "Refused" }, { id: "S2", title: "Not refused" }],
      }),
      requirement("SwRS-X-013", "SwRS", "myst", { exempt: true, target: false, derivesFrom: ["StRS-X-001", "StRS-X-003"], implementedIn: [], testedIn: [] }),
      requirement("SwRS-X-014", "SwRS", "gfm", { derivesFrom: ["StRS-X-003"], lifecycleKey: "lifecycle", text: TABLE_SCENARIOS_TEXT }),
      requirement("SwRS-X-015", "SwRS", "gfm", { lifecycle: "superseded", supersededBy: ["SwRS-X-014"], derivesFrom: ["StRS-X-003"], text: KNOWN_ISSUES_TEXT }),
      requirement("SwRS-X-016", "SwRS", "gfm", { lifecycle: "archived", derivesFrom: ["StRS-X-003"] }),
      requirement(EXAMPLE_SWRS_ID, "SwRS", "gfm", { derivesFrom: ["StRS-X-003"], text: SCENARIO("nominal", "Toggle <b>") }),
    ],
  });
}

/** The id of the use case and of the behaviours of `fullIdReport`, with the `MDOKFSTUDIO` token of the real ids. */
export const FULL_USE_CASE = "StRS-MDOKFSTUDIO-GFM-001";
export const FULL_BEHAVIOUR = (number: number): string => `SwRS-MDOKFSTUDIO-GFM-${number}`;

/** Two paths that share their last two states and one step (102), with one other outcome (103) at the shared state. */
export const FULL_MAIN_PATHS = `### Main paths

#### Path 1: Open the page, then save
1. Home
   - ${FULL_BEHAVIOUR(101)}: the writer opens the page
2. Middle
   - ${FULL_BEHAVIOUR(102)}: the writer saves
   - Option ${FULL_BEHAVIOUR(103)} (refusal): the save is refused
3. Done

#### Path 2: Jump to the middle, then save
1. Shortcut
   - ${FULL_BEHAVIOUR(104)}: the writer jumps
2. Middle
   - ${FULL_BEHAVIOUR(102)}: the writer saves
3. Done
`;

/**
 * `fixtureReport` plus a use case with real-looking ids (`MDOKFSTUDIO`): `fixtureReport` ids carry no token, so
 * they cannot show a full id from a short one. Active: use case GFM-001 (two paths) and behaviours 101 to 104;
 * retired: use case GFM-002 and behaviour 109, both superseded by an active requirement.
 */
export function fullIdReport(): string {
  const report = JSON.parse(fixtureReport()) as { requirements: unknown[] };
  const own = { derivesFrom: [FULL_USE_CASE] };
  report.requirements.push(
    requirement(FULL_USE_CASE, "StRS", "gfm", { text: `## T\n\n${FULL_MAIN_PATHS}\n<!-- okf:links:start -->\n` }),
    requirement("StRS-MDOKFSTUDIO-GFM-002", "StRS", "gfm", { lifecycle: "superseded", supersededBy: [FULL_USE_CASE] }),
    requirement(FULL_BEHAVIOUR(101), "SwRS", "gfm", { ...own, text: SCENARIO("nominal", "Open") }),
    requirement(FULL_BEHAVIOUR(102), "SwRS", "gfm", { ...own, text: SCENARIO("nominal", "Save") + SCENARIO("boundary", "Save twice") }),
    requirement(FULL_BEHAVIOUR(103), "SwRS", "gfm", { ...own, text: SCENARIO("refusal", "Refused") }),
    requirement(FULL_BEHAVIOUR(104), "SwRS", "gfm", { ...own, text: SCENARIO("nominal", "Jump") }),
    requirement(FULL_BEHAVIOUR(109), "SwRS", "gfm", { ...own, lifecycle: "superseded", supersededBy: [FULL_BEHAVIOUR(101)] }),
  );
  return JSON.stringify(report);
}

/**
 * The `okfreq trace requirements --json` output for `fixtureReport`: StRS-X-001 has path S1 tested and accepted and
 * path S2 tested only, StRS-X-003 has its path untested; SwRS-X-010, SwRS-X-011 S1 and SwRS-X-012 S1 and S2 are
 * tested, SwRS-X-011 S2 is not. `tests` and `accepts` markers of one file and one fragment appear once per file.
 */
export function fixtureTrace(): string {
  const marker = (kind: "tests" | "accepts", id: string, fragment: string, file: string, line = 1) => ({ marker: kind, id, fragment, file, line });
  return JSON.stringify({
    scenario_markers: [
      marker("tests", "StRS-X-001", "S1", "test/a.test.ts"),
      marker("tests", "StRS-X-001", "S1", "test/a.test.ts", 9),
      marker("accepts", "StRS-X-001", "S1", "test/integration/a.test.ts"),
      marker("tests", "StRS-X-001", "S2", "test/b.test.ts"),
      marker("tests", "SwRS-X-010", "S1", "test/a.test.ts"),
      marker("tests", "SwRS-X-011", "S1", "test/a.test.ts"),
      marker("tests", "SwRS-X-012", "S1", "test/integration/a.test.ts"),
      marker("tests", "SwRS-X-012", "S2", "test/a.test.ts"),
      marker("tests", "SwRS-X-012", "", "test/c.test.ts"),
    ],
  });
}

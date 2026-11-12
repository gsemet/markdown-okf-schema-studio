import { EXAMPLE_SWRS_ID } from "./model";

/** A small okfreq report for the viewer tests: two areas, a use case with Main paths, a retired SwRS. */

export const MAIN_PATHS = `### Main paths

#### Path 1: Do it

1. State A
   - SwRS-X-010: the writer starts
2. State B
   - SwRS-X-011: the writer goes on
   - Option SwRS-X-012 (refusal): the writer is refused
3. State C
`;

const SCENARIO = (kind: string, name: string): string =>
  `### Scenario (${kind}): ${name}\n\n- GIVEN a box\n- WHEN it is <clicked>\n- THEN it flips\n  and stays\n\n`;

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
      description: `When x, the extension SHALL do ${id}.`,
      user_need: tier === "StRS" ? (options.userNeed ?? "As a writer, I do a thing.") : undefined,
      [options.lifecycleKey ?? "req_lifecycle"]: options.lifecycle ?? "proposed",
      annotation_exemption: options.exempt ?? false,
      exemption_reason: options.exempt ? "Documentation only" : "",
      implemented_in_files: options.implementedIn ?? ["src/a.ts"],
      tested_in_files: options.testedIn ?? ["test/a.test.ts", "test/integration/a.test.ts"],
    },
    coverage_target: target,
    implementation: { status: options.implemented === false ? "missing" : "covered" },
    tests: { status: options.tested === false ? "missing" : "covered" },
    stakeholder_test_coverage: tier === "StRS" ? { status: "covered" } : undefined,
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
      requirement("StRS-X-001", "StRS", "gfm", { text: `## T\n\n${MAIN_PATHS}\n<!-- okf:links:start -->\n`, userNeed: "As a writer, I do <b>a</b> thing." }),
      requirement("StRS-X-002", "StRS", "myst", { lifecycle: "superseded", supersededBy: ["StRS-X-001"] }),
      requirement("StRS-X-003", "StRS", "gfm"),
      requirement("SwRS-X-010", "SwRS", "gfm", { text: SCENARIO("nominal", "Start") }),
      requirement("SwRS-X-011", "SwRS", "gfm", { implemented: false, text: SCENARIO("nominal", "Go on") + SCENARIO("boundary", "Go on twice") + KNOWN_ISSUES_TEXT }),
      requirement("SwRS-X-012", "SwRS", "gfm", { text: SCENARIO("refusal", "Refused") + SCENARIO("nominal", "Not refused") }),
      requirement("SwRS-X-013", "SwRS", "myst", { exempt: true, target: false, derivesFrom: ["StRS-X-001", "StRS-X-003"], implementedIn: [], testedIn: [] }),
      requirement("SwRS-X-014", "SwRS", "gfm", { derivesFrom: ["StRS-X-003"], lifecycleKey: "lifecycle" }),
      requirement("SwRS-X-015", "SwRS", "gfm", { lifecycle: "superseded", supersededBy: ["SwRS-X-014"], derivesFrom: ["StRS-X-003"], text: KNOWN_ISSUES_TEXT }),
      requirement("SwRS-X-016", "SwRS", "gfm", { lifecycle: "archived", derivesFrom: ["StRS-X-003"] }),
      requirement(EXAMPLE_SWRS_ID, "SwRS", "gfm", { derivesFrom: ["StRS-X-003"], text: SCENARIO("nominal", "Toggle <b>") }),
    ],
  });
}

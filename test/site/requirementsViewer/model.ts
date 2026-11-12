import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { GROUPS } from "../../shared/e2eGroups";
import { parseMainPaths, type MainPath } from "./mainPaths";

/** Lifecycles that leave a requirement out of the active count; they are counted separately. */
const RETIRED_LIFECYCLES: ReadonlySet<string> = new Set(["superseded", "deprecated", "archived"]);

/** The SwRS shown as a worked example when the report holds it. */
export const EXAMPLE_SWRS_ID = "SwRS-MDOKFSTUDIO-GFM-021";

/** Colour of each area, in the order of the areas; the only colour that means something besides the paths. */
const AREA_COLOURS = ["#c2410c", "#be185d", "#7c3aed", "#4338ca", "#1d4ed8", "#0369a1", "#0f766e", "#047857",
  "#4d7c0f", "#a16207", "#b45309", "#b91c1c", "#9333ea", "#0e7490", "#475569", "#9d174d"];

export interface Scenario {
  readonly kind: string;
  readonly name: string;
  /** The GIVEN, WHEN, THEN and AND lines, in order. */
  readonly steps: readonly string[];
}

export interface Requirement {
  readonly id: string;
  readonly tier: "StRS" | "SwRS";
  readonly scope: string;
  /** Repository path of the requirement file. */
  readonly file: string;
  readonly title: string;
  /** The normative statement of a SwRS, or the description of a StRS. */
  readonly description: string;
  readonly userNeed: string;
  readonly lifecycle: string;
  readonly active: boolean;
  readonly derivesFrom: readonly string[];
  readonly supersededBy: readonly string[];
  readonly supersedes: readonly string[];
  readonly coverageTarget: boolean;
  readonly exempt: boolean;
  readonly exemptionReason: string;
  readonly implementedIn: readonly string[];
  readonly testedIn: readonly string[];
  readonly scenarios: readonly Scenario[];
  readonly knownIssues: readonly string[];
  readonly stakeholderValidated: boolean;
}

export interface Area {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly colour: string;
  readonly useCases: number;
  readonly behaviours: number;
  /** Percentage of the behaviours of the area linked to code and tests, from the report. */
  readonly linkedPercent: number | undefined;
}

export interface ScopeStats {
  readonly scope: string;
  readonly strs: number;
  readonly swrs: number;
  readonly targets: number;
  readonly implemented: number;
  readonly tested: number;
}

export interface RetiredStats {
  readonly lifecycle: string;
  readonly strs: number;
  readonly swrs: number;
}

export interface ExampleSwrs {
  readonly id: string;
  readonly title: string;
  readonly statement: string;
  readonly derivesFrom: readonly string[];
  readonly dependsOn: readonly string[];
  readonly scenario: readonly string[];
  readonly scenarioName: string;
  readonly implementedIn: readonly string[];
  readonly testedIn: readonly string[];
}

export interface RequirementsStats {
  readonly generatedAt: string;
  readonly activeStrs: number;
  readonly activeSwrs: number;
  /** Active requirements per lifecycle value (draft, proposed, approved...). */
  readonly activeLifecycles: ReadonlyMap<string, number>;
  readonly retired: readonly RetiredStats[];
  /** Active SwRS that need markers (not exempt). */
  readonly targets: number;
  readonly implemented: number;
  readonly tested: number;
  readonly fullyTraceable: number;
  /** Active SwRS with an annotation exemption. */
  readonly exemptions: number;
  readonly knownIssues: number;
  readonly swrsWithKnownIssue: number;
  readonly strsValidated: number;
  readonly scopes: readonly ScopeStats[];
}

export interface ViewerModel {
  readonly generatedAt: string;
  /** Percentage of the requirements linked to code and tests, over the whole report. */
  readonly linkedPercent: number | undefined;
  readonly areas: readonly Area[];
  readonly stats: RequirementsStats;
  readonly example: ExampleSwrs | undefined;
  /** Every requirement of the report, active or retired, by id. */
  readonly byId: ReadonlyMap<string, Requirement>;
  readonly active: readonly Requirement[];
  readonly retired: readonly Requirement[];
  /** The main paths of each active StRS that has the section. */
  readonly paths: ReadonlyMap<string, readonly MainPath[]>;
  /** The commit of the build, for the links to the repository. */
  readonly sha: string;
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function statusOf(value: unknown): string {
  return isRecord(value) ? text(value.status) : "";
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

/** The text of a requirement file below its front matter, cut at the generated links block. */
function bodyOf(raw: string): string {
  return raw.split("<!-- okf:links:start -->")[0] ?? "";
}

/** The `### Scenario (kind): name` sections of a requirement file with their GIVEN / WHEN / THEN / AND lines. */
export function parseScenarios(raw: string): Scenario[] {
  const scenarios: { kind: string; name: string; steps: string[] }[] = [];
  let current: { kind: string; name: string; steps: string[] } | undefined;
  for (const line of bodyOf(raw).split("\n")) {
    const heading = /^###\s+Scenario(?:\s*\(([^)]*)\))?\s*:\s*(.*?)\s*$/u.exec(line);
    if (heading) {
      current = { kind: (heading[1] ?? "").trim() || "nominal", name: heading[2] ?? "", steps: [] };
      scenarios.push(current);
      continue;
    }
    if (/^#{1,3}\s/u.test(line)) {
      current = undefined;
      continue;
    }
    if (!current) continue;
    const step = /^\s*-\s+((?:GIVEN|WHEN|THEN|AND)\b.*?)\s*$/u.exec(line);
    if (step) current.steps.push(step[1] ?? "");
    else if (/^\s{2,}\S/u.test(line) && current.steps.length > 0) current.steps[current.steps.length - 1] += ` ${line.trim()}`;
  }
  return scenarios;
}

/** The `- Known issue:` lines of a requirement file. */
export function parseKnownIssues(raw: string): string[] {
  return (raw.match(/^\s*-\s+Known issue:.*$/gmu) ?? []).map((line) => line.replace(/^\s*-\s+/u, "").trim());
}

function exampleFrom(requirement: Requirement, dependsOn: readonly string[]): ExampleSwrs {
  const first = requirement.scenarios[0];
  return {
    id: requirement.id,
    title: requirement.title,
    statement: requirement.description,
    derivesFrom: requirement.derivesFrom,
    dependsOn,
    scenarioName: first?.name ?? "",
    scenario: first?.steps ?? [],
    implementedIn: requirement.implementedIn,
    testedIn: requirement.testedIn,
  };
}

function compareIds(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true });
}

function buildAreas(
  requirements: readonly Requirement[],
  scopeReport: Json,
): Area[] {
  const known = new Set<string>(GROUPS.map((group) => group.id));
  const seen = new Set(requirements.map((requirement) => requirement.scope));
  const entries: { id: string; title: string; description: string }[] = [
    ...GROUPS.filter((group) => seen.has(group.id)).map((group) => ({ id: group.id, title: group.title, description: group.scope })),
    ...[...seen].filter((scope) => !known.has(scope)).sort(compareIds).map((scope) => ({ id: scope, title: scope, description: "" })),
  ];
  return entries.map((entry, index) => {
    const scopeEntry = scopeReport[entry.id];
    const percent = isRecord(scopeEntry) && typeof scopeEntry.combined_coverage_percent === "number" ? scopeEntry.combined_coverage_percent : undefined;
    return {
      ...entry,
      colour: AREA_COLOURS[index % AREA_COLOURS.length] ?? "#1d4ed8",
      useCases: requirements.filter((requirement) => requirement.active && requirement.tier === "StRS" && requirement.scope === entry.id).length,
      behaviours: requirements.filter((requirement) => requirement.active && requirement.tier === "SwRS" && requirement.scope === entry.id).length,
      linkedPercent: percent,
    };
  });
}

/** The commit of the repository at `root`; `main` when git cannot say. */
export function currentCommit(root: string): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "main";
  } catch {
    return "main";
  }
}

/** Build the model from the okfreq report JSON; undefined when it is not a usable report. */
export function parseRequirementsReport(raw: string, sha = "main"): ViewerModel | undefined {
  let report: unknown;
  try {
    report = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(report) || !Array.isArray(report.requirements)) return undefined;

  const scopes = new Map<string, { strs: number; swrs: number; targets: number; implemented: number; tested: number }>();
  const scopeOf = (name: string) => {
    let entry = scopes.get(name);
    if (!entry) scopes.set(name, entry = { strs: 0, swrs: 0, targets: 0, implemented: 0, tested: 0 });
    return entry;
  };
  const activeLifecycles = new Map<string, number>();
  const retiredCount = new Map<string, { strs: number; swrs: number }>();
  let activeStrs = 0, activeSwrs = 0, targets = 0, implemented = 0, tested = 0, fullyTraceable = 0;
  let exemptions = 0, knownIssues = 0, swrsWithKnownIssue = 0, strsValidated = 0;
  const requirements: Requirement[] = [];
  const dependsOn = new Map<string, string[]>();

  for (const entry of report.requirements) {
    if (!isRecord(entry)) continue;
    const frontmatter = isRecord(entry.frontmatter) ? entry.frontmatter : {};
    const tier = text(entry.tier) || text(frontmatter.tier);
    if (tier !== "StRS" && tier !== "SwRS") continue;
    // The requirement files and the report carry `req_lifecycle`; `lifecycle` is the older name.
    const lifecycle = text(frontmatter.req_lifecycle) || text(frontmatter.lifecycle) || "unknown";
    const active = !RETIRED_LIFECYCLES.has(lifecycle);
    const body = text(entry.text);
    const notes = parseKnownIssues(body);
    const validated = statusOf(entry.stakeholder_test_coverage) === "covered";
    const requirement: Requirement = {
      id: text(entry.id),
      tier,
      scope: text(entry.scope) || text(frontmatter.scope) || "unknown",
      file: text(entry.path),
      title: text(frontmatter.title),
      description: text(frontmatter.description),
      userNeed: text(frontmatter.user_need),
      lifecycle,
      active,
      derivesFrom: textList(entry.derives_from).length > 0 ? textList(entry.derives_from) : textList(frontmatter.derives_from),
      supersededBy: textList(entry.superseded_by),
      supersedes: textList(entry.supersedes),
      coverageTarget: entry.coverage_target === true,
      exempt: frontmatter.annotation_exemption === true,
      exemptionReason: text(frontmatter.exemption_reason),
      implementedIn: textList(frontmatter.implemented_in_files),
      testedIn: textList(frontmatter.tested_in_files),
      scenarios: parseScenarios(body),
      knownIssues: notes,
      stakeholderValidated: validated,
    };
    requirements.push(requirement);
    dependsOn.set(requirement.id, textList(frontmatter.depends_on));
    if (!active) {
      const row = retiredCount.get(lifecycle) ?? { strs: 0, swrs: 0 };
      if (tier === "StRS") row.strs += 1; else row.swrs += 1;
      retiredCount.set(lifecycle, row);
      continue;
    }
    increment(activeLifecycles, lifecycle);
    const scope = scopeOf(requirement.scope);
    if (tier === "StRS") {
      activeStrs += 1;
      scope.strs += 1;
      if (validated) strsValidated += 1;
      continue;
    }
    activeSwrs += 1;
    scope.swrs += 1;
    if (requirement.exempt) exemptions += 1;
    knownIssues += notes.length;
    if (notes.length > 0) swrsWithKnownIssue += 1;
    if (requirement.coverageTarget) {
      const hasSource = statusOf(entry.implementation) === "covered";
      const hasTest = statusOf(entry.tests) === "covered";
      targets += 1;
      scope.targets += 1;
      if (hasSource) { implemented += 1; scope.implemented += 1; }
      if (hasTest) { tested += 1; scope.tested += 1; }
      if (hasSource && hasTest) fullyTraceable += 1;
    }
  }

  requirements.sort((left, right) => compareIds(left.id, right.id));
  const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const exampleSource = byId.get(EXAMPLE_SWRS_ID);
  const totals = isRecord(report.totals) ? report.totals : {};
  const scopeReport = isRecord(report.scopes) ? report.scopes : {};
  const areas = buildAreas(requirements, scopeReport);
  const areaOrder = new Map(areas.map((area, index) => [area.id, index]));
  const active = requirements.filter((requirement) => requirement.active);
  const paths = new Map<string, readonly MainPath[]>();
  for (const entry of report.requirements) {
    if (!isRecord(entry)) continue;
    const requirement = byId.get(text(entry.id));
    if (!requirement?.active || requirement.tier !== "StRS") continue;
    const parsed = parseMainPaths(text(entry.text));
    if (parsed.length > 0) paths.set(requirement.id, parsed);
  }

  return {
    generatedAt: text(report.generated_at),
    linkedPercent: typeof totals.combined_coverage_percent === "number" ? totals.combined_coverage_percent : undefined,
    areas,
    stats: {
      generatedAt: text(report.generated_at),
      activeStrs,
      activeSwrs,
      activeLifecycles,
      retired: [...retiredCount.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([lifecycle, row]) => ({ lifecycle, ...row })),
      targets,
      implemented,
      tested,
      fullyTraceable,
      exemptions,
      knownIssues,
      swrsWithKnownIssue,
      strsValidated,
      scopes: [...scopes.entries()]
        .sort(([a], [b]) => (areaOrder.get(a) ?? 99) - (areaOrder.get(b) ?? 99) || a.localeCompare(b))
        .map(([scope, row]) => ({ scope, ...row })),
    },
    example: exampleSource?.active ? exampleFrom(exampleSource, dependsOn.get(exampleSource.id) ?? []) : undefined,
    byId,
    active,
    retired: requirements.filter((requirement) => !requirement.active),
    paths,
    sha,
  };
}

/** Read the report file; a missing or unreadable file gives undefined and never throws. */
export function loadRequirementsModel(reportPath: string, sha = "main"): ViewerModel | undefined {
  try {
    return parseRequirementsReport(fs.readFileSync(reportPath, "utf8"), sha);
  } catch {
    return undefined;
  }
}

export const REQUIREMENTS_REPORT_PATH = (extensionRoot: string): string =>
  path.join(extensionRoot, "out", "reports", "requirements", "requirements-report.json");

/** Active SwRS that derive from the StRS `id`, in id order. */
export function behavioursOf(model: ViewerModel, id: string): Requirement[] {
  return model.active.filter((requirement) => requirement.tier === "SwRS" && requirement.derivesFrom.includes(id));
}

/** Retired requirements of one tier that derive from `id` (SwRS) or sit in the scope `id` (StRS). */
export function retiredBehavioursOf(model: ViewerModel, id: string): Requirement[] {
  return model.retired.filter((requirement) => requirement.tier === "SwRS" && requirement.derivesFrom.includes(id));
}

/** The requirements that replace a retired one: its `superseded_by`, and those that list it in `supersedes`. */
export function replacementsOf(model: ViewerModel, requirement: Requirement): Requirement[] {
  const ids = new Set(requirement.supersededBy);
  for (const other of model.byId.values()) if (other.supersedes.includes(requirement.id)) ids.add(other.id);
  return [...ids].sort(compareIds).flatMap((id) => model.byId.get(id) ?? []);
}

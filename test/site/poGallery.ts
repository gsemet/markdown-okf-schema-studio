/**
 * The product-owner (PO) gallery: `out/reports/e2e/GALLERY.md` and one page per feature group
 * (`gallery/<group>.md`), built from the scenario metadata and the visual run manifest.
 *
 * Pure: no file system and no clock. `poGalleryCli.ts` reads the inputs and writes the output.
 * Not to be confused with `npm run gallery:generate`, which curates the tracked README images.
 *
 * Links are relative to the page, so the pages work in VS Code's Markdown preview:
 * the pages sit in `out/reports/e2e/` and `out/reports/e2e/gallery/`, the images in
 * `out/reports/e2e/screenshots/` (manifest capture paths are relative to that folder).
 */

export interface GalleryGroup {
  readonly id: string;
  readonly title: string;
  readonly scope: string;
  readonly srcAnchors?: string;
}

/** The scenario fields the gallery shows (a structural subset of `Scenario`). */
export interface GalleryScenario {
  readonly id: string;
  readonly group: string;
  readonly locks: string;
  readonly fixture: string;
  readonly theme: string;
  readonly width: number;
  readonly height: number;
  readonly scroll: { readonly kind: string };
  /** `false`: assertion-only (no picture). */
  readonly capture?: false;
  readonly steps?: readonly string[];
  readonly readme?: { readonly file: string };
  readonly screenshotOf?: string;
  readonly knownIssue?: string;
  readonly gallery?: "key";
  readonly previewThemeMode?: string;
  readonly editMode?: boolean;
  readonly toolbarState?: string;
  readonly fullPage?: boolean;
}

export interface IntegrationRow {
  readonly file: string;
  readonly group: string;
  readonly locks: string;
}

export interface ManifestCapture {
  readonly file: string;
  readonly step: string | null;
}

export interface ManifestResult {
  readonly id: string;
  readonly status?: string;
  readonly captures?: readonly ManifestCapture[];
}

/** The part of `screenshots/run-manifest.json` the gallery reads. */
export interface VisualManifest {
  readonly status?: string;
  readonly partial?: boolean;
  readonly revision?: string;
  /** `git status --short` when the run was made (empty: clean tree). */
  readonly worktreeStatus?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly scenarioCount?: number;
  readonly results?: readonly ManifestResult[];
}

export interface RealWindowLink {
  readonly label: string;
  /** Link relative to `out/reports/e2e/`. */
  readonly href: string;
  readonly note?: string;
}

export interface GalleryInput {
  readonly groups: readonly GalleryGroup[];
  readonly scenarios: readonly GalleryScenario[];
  readonly integrationTests: readonly IntegrationRow[];
  readonly manifest?: VisualManifest;
  /** Current git revision; a manifest from another revision is reported as stale. */
  readonly headRevision?: string;
  /** Current `git status --short` (tracked and untracked files, ignored ones excluded), when known. */
  readonly worktreeStatus?: string;
  /** Does a capture path (relative to `screenshots/`) exist on disk? Omitted: assume it does. */
  readonly imageExists?: (capture: string) => boolean;
  readonly realWindow?: readonly RealWindowLink[];
  readonly generatedAt: string;
}

export interface Freshness {
  readonly stale: boolean;
  readonly reasons: readonly string[];
}

export interface GroupCounts {
  readonly scenarios: number;
  readonly withImage: number;
  readonly assertionOnly: number;
  readonly stepImages: number;
  readonly readme: number;
  readonly integration: number;
}

export interface GalleryOutput {
  /** Pages by path relative to `out/reports/e2e/`: `GALLERY.md` and `gallery/<group>.md`. */
  readonly files: Readonly<Record<string, string>>;
  readonly freshness: Freshness;
  readonly counts: Readonly<Record<string, GroupCounts>>;
  readonly totals: GroupCounts;
}

const THUMBNAIL_WIDTH = 360;
const STEP_WIDTH = 180;
const KEY_WIDTH = 220;
const KEY_PER_GROUP = 3;

export function isCaptured(scenario: GalleryScenario): boolean {
  return scenario.capture !== false;
}

/** Number after the `v` of `<group>/vNN-slug`; ids without one sort last, by id. */
function scenarioNumber(id: string): number {
  const match = /\/v(\d+)-/u.exec(id);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function byNumber(first: GalleryScenario, second: GalleryScenario): number {
  return scenarioNumber(first.id) - scenarioNumber(second.id) || first.id.localeCompare(second.id);
}

function shortId(id: string): string {
  return id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
}

function cell(text: string): string {
  return text.replace(/\r?\n/gu, " ").replace(/\|/gu, "\\|");
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Why the manifest cannot be trusted as the picture of the current scenario list. */
export function assessFreshness(
  scenarios: readonly GalleryScenario[],
  manifest: VisualManifest | undefined,
  headRevision: string | undefined,
  imageExists: (capture: string) => boolean = () => true,
  currentWorktreeStatus?: string,
): Freshness {
  if (manifest === undefined) {
    return { stale: true, reasons: ["No visual run manifest was found: run `npm run test:visual`. No image is listed."] };
  }
  const reasons: string[] = [];
  const results = manifest.results ?? [];
  const known = new Set(scenarios.map((scenario) => scenario.id));
  const ran = new Set(results.map((result) => result.id));
  if (manifest.partial === true) {
    reasons.push(`The last visual run was partial (${results.length} of ${scenarios.length} scenarios): run the full \`npm run test:visual\`.`);
  } else {
    const missing = scenarios.filter((scenario) => !ran.has(scenario.id)).length;
    if (missing > 0) reasons.push(`${plural(missing, "scenario")} of the current list did not run in the last visual run.`);
  }
  const unknown = results.filter((result) => !known.has(result.id)).length;
  if (unknown > 0) reasons.push(`The last visual run holds ${plural(unknown, "scenario")} that are not in the scenario list any more (renamed or removed).`);
  if (manifest.status !== undefined && manifest.status !== "passed") {
    reasons.push(`The last visual run status is "${manifest.status}".`);
  }
  if (headRevision !== undefined && manifest.revision !== undefined && manifest.revision !== headRevision) {
    reasons.push(`The visual run was made at revision ${manifest.revision.slice(0, 7)}, HEAD is ${headRevision.slice(0, 7)}.`);
  }
  const dirtyAtRun = manifest.worktreeStatus?.trim() ?? "";
  if (dirtyAtRun !== "") {
    const files = dirtyAtRun.split("\n").length;
    reasons.push(`The visual run was made with uncommitted changes (${plural(files, "file")}): the pictures may not match a commit.`);
  }
  if (currentWorktreeStatus !== undefined && manifest.worktreeStatus !== undefined
    && currentWorktreeStatus.trim() !== dirtyAtRun) {
    reasons.push("The working tree changed since the visual run (`git status` differs).");
  }
  const missingImages = new Set<string>();
  for (const result of results) {
    for (const capture of result.captures ?? []) {
      if (!imageExists(capture.file)) missingImages.add(capture.file);
    }
  }
  if (missingImages.size > 0) {
    reasons.push(`${plural(missingImages.size, "image")} listed by the manifest ${missingImages.size === 1 ? "is" : "are"} missing on disk (pruned or removed).`);
  }
  return { stale: reasons.length > 0, reasons };
}

function stateText(scenario: GalleryScenario): string {
  const parts = [`scroll ${scenario.scroll.kind}`];
  if (scenario.previewThemeMode !== undefined) parts.push(`forced ${scenario.previewThemeMode} preview`);
  if (scenario.editMode === true) parts.push("edit mode");
  if (scenario.toolbarState !== undefined) parts.push(`${scenario.toolbarState} toolbar`);
  if (scenario.fullPage === true) parts.push("full page");
  return parts.join(", ");
}

function metaLine(scenario: GalleryScenario): string {
  return `${scenario.theme} theme · ${scenario.width}×${scenario.height} px · ${stateText(scenario)} · fixture \`${scenario.fixture}\``;
}

function readmeMark(scenario: GalleryScenario): string {
  return scenario.readme === undefined ? "" : ` **README** \`images/readme/${scenario.readme.file}\``;
}

function image(href: string, alt: string, width: number): string {
  return `<a href="${href}"><img src="${href}" width="${width}" alt="${alt.replace(/"/gu, "&quot;")}"></a>`;
}

interface Picture {
  readonly primary?: ManifestCapture;
  readonly steps: readonly ManifestCapture[];
}

function pictureOf(result: ManifestResult | undefined): Picture {
  const captures = result?.captures ?? [];
  const primary = captures.find((capture) => capture.step === null);
  return { ...(primary === undefined ? {} : { primary }), steps: captures.filter((capture) => capture.step !== null) };
}

function scenarioBlock(
  scenario: GalleryScenario,
  result: ManifestResult | undefined,
  prefix: string,
  imageExists: (capture: string) => boolean,
): string {
  const picture = pictureOf(result);
  const flags: string[] = [];
  if (result === undefined) flags.push("not in the last run");
  else if (result.status !== undefined && result.status !== "passed") flags.push(`**${result.status.toUpperCase()}**`);
  if (scenario.knownIssue !== undefined) flags.push(`known issue ${scenario.knownIssue}`);
  const lines = [
    `### ${shortId(scenario.id)}${readmeMark(scenario)}`,
    "",
    `\`${scenario.id}\`${flags.length > 0 ? ` · ${flags.join(" · ")}` : ""}`,
    "",
    `${metaLine(scenario)}`,
    "",
    `**Locks:** ${scenario.locks}`,
    "",
  ];
  if (picture.primary !== undefined) {
    if (imageExists(picture.primary.file)) {
      lines.push(image(`${prefix}${picture.primary.file}`, scenario.id, THUMBNAIL_WIDTH), "");
    } else {
      lines.push(`Image missing on disk: \`${picture.primary.file}\`.`, "");
    }
  } else {
    lines.push("No image in the last run.", "");
  }
  if (picture.steps.length > 0) {
    lines.push("Steps:", "");
    for (const step of picture.steps) {
      lines.push(imageExists(step.file)
        ? `${image(`${prefix}${step.file}`, `${scenario.id} ${step.step ?? ""}`, STEP_WIDTH)} <sub>${step.step}</sub>`
        : `<sub>${step.step}: image missing</sub>`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function assertionTable(scenarios: readonly GalleryScenario[], results: ReadonlyMap<string, ManifestResult>): string {
  const lines = [
    "| Scenario | Theme | Width | State | Run | Locks |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const scenario of scenarios) {
    const result = results.get(scenario.id);
    const run = result === undefined ? "not run" : result.status ?? "?";
    lines.push(`| \`${cell(shortId(scenario.id))}\` | ${cell(scenario.theme)} | ${scenario.width} | ${cell(stateText(scenario))} | ${run} | ${cell(scenario.locks)} |`);
  }
  return lines.join("\n");
}

function freshnessBanner(freshness: Freshness): string[] {
  if (!freshness.stale) return [];
  return [
    "> **STALE.** This gallery does not show a complete, current visual run:",
    ...freshness.reasons.map((reason) => `> - ${reason}`),
    "",
  ];
}

export function buildPoGallery(input: GalleryInput): GalleryOutput {
  const imageExists = input.imageExists ?? (() => true);
  const manifest = input.manifest;
  const freshness = assessFreshness(input.scenarios, manifest, input.headRevision, imageExists, input.worktreeStatus);
  const results = new Map<string, ManifestResult>((manifest?.results ?? []).map((result) => [result.id, result]));
  const files: Record<string, string> = {};
  const counts: Record<string, GroupCounts> = {};

  const groupIds = new Set(input.groups.map((group) => group.id));
  const orphans = input.scenarios.filter((scenario) => !groupIds.has(scenario.group));

  for (const [position, group] of input.groups.entries()) {
    const own = input.scenarios.filter((scenario) => scenario.group === group.id).sort(byNumber);
    const captured = own.filter(isCaptured);
    const assertionOnly = own.filter((scenario) => !isCaptured(scenario));
    const integration = input.integrationTests.filter((row) => row.group === group.id);
    const stepImages = own.reduce((total, scenario) => total + pictureOf(results.get(scenario.id)).steps.length, 0);
    counts[group.id] = {
      scenarios: own.length,
      withImage: captured.length,
      assertionOnly: assertionOnly.length,
      stepImages,
      readme: own.filter((scenario) => scenario.readme !== undefined).length,
      integration: integration.length,
    };

    const previous = input.groups[position - 1];
    const next = input.groups[position + 1];
    const page: string[] = [
      `# ${group.title}`,
      "",
      `[Index](../GALLERY.md)${previous ? ` · Previous: [${previous.title}](${previous.id}.md)` : ""}${next ? ` · Next: [${next.title}](${next.id}.md)` : ""}`,
      "",
      `Group \`${group.id}\`. ${group.scope}.`,
      "",
      ...(group.srcAnchors === undefined ? [] : [`Source anchors: ${group.srcAnchors}.`, ""]),
      `${plural(own.length, "scenario")}: ${captured.length} with an image (${plural(stepImages, "step image")}), `
        + `${assertionOnly.length} assertion-only, ${counts[group.id]!.readme} used by the README; `
        + `${plural(integration.length, "integration test")} without image.`,
      "",
      ...freshnessBanner(freshness),
    ];
    if (captured.length > 0) {
      page.push("## Images", "");
      for (const scenario of captured) page.push(scenarioBlock(scenario, results.get(scenario.id), "../screenshots/", imageExists));
    }
    if (assertionOnly.length > 0) {
      page.push(
        "## Assertion-only scenarios",
        "",
        "These run every check of the campaign but write no picture; the `Locks` column states what is verified.",
        "",
        assertionTable(assertionOnly, results),
        "",
      );
    }
    if (integration.length > 0) {
      page.push(
        "## Integration tests without image",
        "",
        "Real VS Code host tests of this group that produce no screenshot.",
        "",
        "| Test file | Locks |",
        "| --- | --- |",
        ...integration.map((row) => `| \`${cell(row.file)}\` | ${cell(row.locks)} |`),
        "",
      );
    }
    if (own.length === 0 && integration.length === 0) page.push("No visual scenario or integration test yet.", "");
    files[`gallery/${group.id}.md`] = `${page.join("\n").trimEnd()}\n`;
  }

  const sum = (pick: (entry: GroupCounts) => number): number =>
    Object.values(counts).reduce((total, entry) => total + pick(entry), 0);
  const totals: GroupCounts = {
    scenarios: sum((entry) => entry.scenarios),
    withImage: sum((entry) => entry.withImage),
    assertionOnly: sum((entry) => entry.assertionOnly),
    stepImages: sum((entry) => entry.stepImages),
    readme: sum((entry) => entry.readme),
    integration: sum((entry) => entry.integration),
  };

  const index: string[] = [
    "# Product-owner gallery",
    "",
    "What the extension looks like and what is checked, grouped by feature. Each group page shows",
    "every captured scenario (thumbnail, `Locks` statement, step images) and lists the",
    "assertion-only scenarios with what they verify. Images marked **README** feed `images/readme/`.",
    "",
    manifest === undefined
      ? "Visual run: none."
      : `Visual run: ${manifest.status ?? "unknown status"}${manifest.partial === true ? " (partial)" : ""}, revision \`${(manifest.revision ?? "unknown").slice(0, 7)}\`, completed ${manifest.completedAt ?? "unknown"}.`,
    "",
    ...freshnessBanner(freshness),
    "| # | Group | Scenarios | With image | Assertion-only | Step images | README | Integration (no image) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...input.groups.map((group, position) => {
      const entry = counts[group.id]!;
      return `| ${position + 1} | [${cell(group.title)}](gallery/${group.id}.md) | ${entry.scenarios} | ${entry.withImage} | ${entry.assertionOnly} | ${entry.stepImages} | ${entry.readme} | ${entry.integration} |`;
    }),
    `| | **Total** | **${totals.scenarios}** | **${totals.withImage}** | **${totals.assertionOnly}** | **${totals.stepImages}** | **${totals.readme}** | **${totals.integration}** |`,
    "",
  ];
  if (orphans.length > 0) {
    index.push(`> ${plural(orphans.length, "scenario")} belong to a group that is not in the group list and appear on no page: ${orphans.map((scenario) => `\`${scenario.id}\``).join(", ")}.`, "");
  }

  index.push("## Key images", "");
  for (const group of input.groups) {
    const captured = input.scenarios.filter((scenario) => scenario.group === group.id && isCaptured(scenario)).sort(byNumber);
    const key = [
      ...captured.filter((scenario) => scenario.readme !== undefined || scenario.gallery === "key"),
      ...captured,
    ].filter((scenario, position, all) => all.indexOf(scenario) === position)
      .filter((scenario) => {
        const primary = pictureOf(results.get(scenario.id)).primary;
        return primary !== undefined && imageExists(primary.file);
      })
      .slice(0, KEY_PER_GROUP);
    if (key.length === 0) continue;
    index.push(`**[${group.title}](gallery/${group.id}.md)**`, "");
    index.push(key.map((scenario) => image(`screenshots/${pictureOf(results.get(scenario.id)).primary!.file}`, scenario.id, KEY_WIDTH)).join(" "), "");
  }

  const realWindow = input.realWindow ?? [];
  if (realWindow.length > 0) {
    index.push(
      "## Real VS Code window evidence (latest runs)",
      "",
      "Captured in a real extension host; not yet grouped like the pages above.",
      "",
      ...realWindow.map((link) => `- [${link.label}](${link.href})${link.note === undefined ? "" : `: ${link.note}`}`),
      "",
    );
  }
  index.push(
    "## Other entry points",
    "",
    "- [Screenshot review index](REVIEW.md)",
    "- Regenerate this gallery with `npm run review:gallery` (it reads the last visual run; run `npm run test:visual` first for a fresh one).",
    `- Generated ${input.generatedAt}.`,
    "",
  );
  files["GALLERY.md"] = `${index.join("\n").trimEnd()}\n`;

  return { files, freshness, counts, totals };
}

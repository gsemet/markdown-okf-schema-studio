import assert from "node:assert/strict";
import test from "node:test";

import { assessFreshness, buildPoGallery, type GalleryInput, type GalleryScenario, type VisualManifest } from "./poGallery";

const groups = [
  { id: "alpha", title: "Alpha group", scope: "Alpha scope", srcAnchors: "src/alpha" },
  { id: "beta", title: "Beta group", scope: "Beta scope" },
  { id: "gamma", title: "Gamma group", scope: "Gamma scope" },
];

function scenario(id: string, extra: Partial<GalleryScenario> = {}): GalleryScenario {
  return {
    id,
    group: id.split("/")[0]!,
    locks: `Locks of ${id} | with a pipe`,
    fixture: "01-fixture",
    theme: "dark",
    width: 900,
    height: 1000,
    scroll: { kind: "top" },
    ...extra,
  };
}

const scenarios: GalleryScenario[] = [
  scenario("alpha/v02-second-dark-900", { steps: ["open"] }),
  scenario("alpha/v01-first-dark-900", { readme: { file: "first.png" }, editMode: true }),
  scenario("alpha/v03-check-only-dark-900", { capture: false, theme: "light", width: 460 }),
  scenario("beta/v01-only-assertions-dark-900", { capture: false }),
];

function manifest(extra: Partial<VisualManifest> = {}): VisualManifest {
  return {
    status: "passed",
    partial: false,
    revision: "abcdef1234567",
    completedAt: "2026-10-22T10:00:00Z",
    results: [
      { id: "alpha/v01-first-dark-900", status: "passed", captures: [{ file: "visual/alpha/v01-first-dark-900.png", step: null }] },
      {
        id: "alpha/v02-second-dark-900",
        status: "passed",
        captures: [
          { file: "visual/alpha/v02-second-dark-900.png", step: null },
          { file: "visual/alpha/v02-second-dark-900--open.png", step: "open" },
        ],
      },
      { id: "alpha/v03-check-only-dark-900", status: "passed", captures: [] },
      { id: "beta/v01-only-assertions-dark-900", status: "passed", captures: [] },
    ],
    ...extra,
  };
}

const integrationTests = [
  { file: "test/integration/gamma-suite.ts", group: "gamma", locks: "Gamma behaviour" },
];

function build(extra: Partial<GalleryInput> = {}) {
  return buildPoGallery({
    groups,
    scenarios,
    integrationTests,
    manifest: manifest(),
    headRevision: "abcdef1234567",
    generatedAt: "2026-10-22T11:00:00Z",
    ...extra,
  });
}

test("one page per group plus the index, in group order, with counts", () => {
  const output = build();
  assert.deepEqual(Object.keys(output.files).sort(), ["GALLERY.md", "gallery/alpha.md", "gallery/beta.md", "gallery/gamma.md"]);
  assert.deepEqual(output.counts.alpha, { scenarios: 3, withImage: 2, assertionOnly: 1, stepImages: 1, readme: 1, integration: 0 });
  assert.equal(output.counts.beta!.assertionOnly, 1);
  assert.equal(output.counts.gamma!.integration, 1);
  assert.equal(output.totals.scenarios, 4);
  const index = output.files["GALLERY.md"]!;
  const positions = ["Alpha group", "Beta group", "Gamma group"].map((title) => index.indexOf(`[${title}](gallery/`));
  assert.ok(positions.every((position) => position > 0) && positions[0]! < positions[1]! && positions[1]! < positions[2]!);
  assert.match(index, /\| 1 \| \[Alpha group\]\(gallery\/alpha\.md\) \| 3 \| 2 \| 1 \| 1 \| 1 \| 0 \|/u);
  assert.match(index, /\*\*Total\*\* \| \*\*4\*\*/u);
});

test("group pages order scenarios by number and link images relative to the page", () => {
  const page = build().files["gallery/alpha.md"]!;
  assert.ok(page.indexOf("### v01-first") < page.indexOf("### v02-second"));
  assert.match(page, /<img src="\.\.\/screenshots\/visual\/alpha\/v01-first-dark-900\.png" width="360"/u);
  assert.match(page, /<a href="\.\.\/screenshots\/visual\/alpha\/v02-second-dark-900--open\.png">/u);
  assert.match(page, /<sub>open<\/sub>/u);
  assert.match(page, /\*\*Locks:\*\* Locks of alpha\/v01-first-dark-900/u);
  assert.match(page, /dark theme · 900×1000 px · scroll top, edit mode/u);
  assert.match(page, /\[Index\]\(\.\.\/GALLERY\.md\) · Next: \[Beta group\]\(beta\.md\)/u);
});

test("the index uses links relative to out/reports/e2e", () => {
  const index = build().files["GALLERY.md"]!;
  assert.match(index, /<img src="screenshots\/visual\/alpha\/v01-first-dark-900\.png"/u);
  assert.doesNotMatch(index, /\.\.\/screenshots/u);
  assert.match(index, /\[Screenshot review index\]\(REVIEW\.md\)/u);
});

test("assertion-only scenarios are a table with their locks line and no picture", () => {
  const page = build().files["gallery/alpha.md"]!;
  assert.match(page, /## Assertion-only scenarios/u);
  assert.match(page, /\| `v03-check-only-dark-900` \| light \| 460 \| scroll top \| passed \| Locks of alpha\/v03-check-only-dark-900 \\\| with a pipe \|/u);
  assert.doesNotMatch(page, /### v03-check-only/u);
  const beta = build().files["gallery/beta.md"]!;
  assert.doesNotMatch(beta, /## Images/u);
  assert.match(beta, /Locks of beta\/v01-only-assertions-dark-900/u);
});

test("README images are marked on their scenario and counted", () => {
  const output = build();
  assert.match(output.files["gallery/alpha.md"]!, /### v01-first-dark-900 \*\*README\*\* `images\/readme\/first\.png`/u);
  assert.doesNotMatch(output.files["gallery/alpha.md"]!, /### v02-second-dark-900 \*\*README/u);
  assert.equal(output.totals.readme, 1);
});

test("a group with only integration rows still gets a page", () => {
  const page = build().files["gallery/gamma.md"]!;
  assert.match(page, /## Integration tests without image/u);
  assert.match(page, /\| `test\/integration\/gamma-suite\.ts` \| Gamma behaviour \|/u);
  assert.doesNotMatch(page, /## Images/u);
});

test("a complete run at HEAD is not stale", () => {
  const output = build();
  assert.equal(output.freshness.stale, false);
  assert.doesNotMatch(output.files["GALLERY.md"]!, /STALE/u);
});

test("a partial manifest, another revision, a missing scenario or a missing image are stale", () => {
  assert.match(assessFreshness(scenarios, manifest({ partial: true }), undefined).reasons.join("\n"), /partial/u);
  assert.match(assessFreshness(scenarios, manifest(), "1234567890").reasons.join("\n"), /revision abcdef1, HEAD is 1234567/u);
  const short = manifest({ results: manifest().results!.slice(0, 2) });
  assert.match(assessFreshness(scenarios, short, undefined).reasons.join("\n"), /2 scenarios of the current list did not run/u);
  const extra = manifest({ results: [...manifest().results!, { id: "alpha/v99-gone-dark-900" }] });
  assert.match(assessFreshness(scenarios, extra, undefined).reasons.join("\n"), /1 scenario that are not in the scenario list any more/u);
  assert.match(assessFreshness(scenarios, manifest(), undefined, () => false).reasons.join("\n"), /3 images listed by the manifest are missing/u);
  assert.match(assessFreshness(scenarios, manifest({ status: "failed" }), undefined).reasons.join("\n"), /status is "failed"/u);
});

test("a stale gallery says so on the index and on every group page", () => {
  const output = build({ manifest: manifest({ partial: true }) });
  assert.equal(output.freshness.stale, true);
  for (const content of Object.values(output.files)) assert.match(content, /\*\*STALE\.\*\*/u);
});

test("without a manifest no image is listed and the gallery is stale", () => {
  const output = buildPoGallery({ groups, scenarios, integrationTests, generatedAt: "now" });
  assert.equal(output.freshness.stale, true);
  assert.match(output.files["gallery/alpha.md"]!, /No image in the last run\./u);
  assert.doesNotMatch(output.files["gallery/alpha.md"]!, /<img/u);
  assert.match(output.files["GALLERY.md"]!, /Visual run: none\./u);
});

test("a failed scenario and a known issue are flagged; a missing file is reported instead of linked", () => {
  const failing = manifest({
    results: manifest().results!.map((result) => result.id === "alpha/v01-first-dark-900" ? { ...result, status: "failed" } : result),
  });
  const withIssue = [scenarios[0]!, { ...scenarios[1]!, knownIssue: "F-12" }, ...scenarios.slice(2)];
  const output = buildPoGallery({
    groups, scenarios: withIssue, integrationTests, manifest: failing, generatedAt: "now",
    imageExists: (capture) => !capture.endsWith("--open.png"),
  });
  const page = output.files["gallery/alpha.md"]!;
  assert.match(page, /\*\*FAILED\*\* · known issue F-12/u);
  assert.match(page, /<sub>open: image missing<\/sub>/u);
});

test("real-window links are listed on the index", () => {
  const output = build({ realWindow: [{ label: "Real-input editing", href: "screenshots/real-input-x/INDEX.md", note: "passed" }] });
  assert.match(output.files["GALLERY.md"]!, /- \[Real-input editing\]\(screenshots\/real-input-x\/INDEX\.md\): passed/u);
});

test("scenarios of an unknown group are reported on the index", () => {
  const output = build({ scenarios: [...scenarios, scenario("delta/v01-lost-dark-900")] });
  assert.match(output.files["GALLERY.md"]!, /belong to a group that is not in the group list.*delta\/v01-lost-dark-900/u);
});

test("a run made on a dirty tree, or a tree that changed since, is stale", () => {
  assert.match(assessFreshness(scenarios, manifest({ worktreeStatus: " M a.ts\n?? b.ts" }), undefined).reasons.join("\n"), /uncommitted changes \(2 files\)/u);
  assert.equal(assessFreshness(scenarios, manifest({ worktreeStatus: "" }), undefined, () => true, "").stale, false);
  assert.match(assessFreshness(scenarios, manifest({ worktreeStatus: "" }), undefined, () => true, " M a.ts").reasons.join("\n"), /working tree changed since/u);
  assert.equal(assessFreshness(scenarios, manifest({ worktreeStatus: " M a.ts" }), undefined, () => true, " M a.ts").reasons.length, 1);
  // Not detectable (no status in the manifest): no reason.
  assert.equal(assessFreshness(scenarios, manifest(), undefined, () => true, " M a.ts").stale, false);
});

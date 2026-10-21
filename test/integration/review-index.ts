import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { reviewIndexText } from "../site/reviewIndexText";
import { generatePoGallery } from "../site/poGalleryCli";
import { automaticKeep, pruneReports } from "../site/pruneReportsCli";
import { validateReviewEvidence, type CampaignIdentity, type EvidenceManifest } from "../site/reviewEvidence";

const artifacts = E2E_REPORT_ROOT;
const screenshots = E2E_SCREENSHOT_ROOT;
const index = path.join(artifacts, "REVIEW.md");
fs.mkdirSync(artifacts, { recursive: true });
fs.mkdirSync(screenshots, { recursive: true });
function readJson(filePath: string, fallback: EvidenceManifest): EvidenceManifest {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) as EvidenceManifest : fallback;
}

function writeReviewStart(): void {
  const startedAt = new Date().toISOString();
  const campaign = {
    runId: randomUUID(),
    startedAt,
    command: process.env.STUDIO_E2E_COMMAND ?? "npm run test:e2e",
  } satisfies CampaignIdentity;
  fs.writeFileSync(index, "# Screenshot Review\n\nStatus: **running or incomplete**. Do not treat earlier captures as this run's result.\n");
  fs.writeFileSync(path.join(artifacts, "review-start.json"), `${JSON.stringify(campaign, null, 2)}\n`);
}

function finishReview(): void {
  const startPath = path.join(artifacts, "review-start.json");
  const campaign = fs.existsSync(startPath)
    ? JSON.parse(fs.readFileSync(startPath, "utf8")) as CampaignIdentity
    : undefined;
  const integrationPath = path.join(artifacts, "integration-manifest.json");
  const visualPath = path.join(screenshots, "run-manifest.json");
  const integration = readJson(integrationPath, { status: "failed", scope: "missing", error: "integration manifest is missing" });
  const visual = readJson(visualPath, { status: "failed", error: "visual manifest is missing" });
  const failures = campaign
    ? validateReviewEvidence(campaign, integration, visual)
    : ["review start identity is missing"];
  const status = failures.length === 0 ? "passed" : "failed";
  const history = path.join(artifacts, "archive");
  fs.mkdirSync(history, { recursive: true });
  for (const legacy of ["frontmatter-e2e", "link-details-dark-1100.png", "link-details-dark-390.png", "link-details-white-1100.png", "link-details-white-390.png"]) {
    const source = path.join(screenshots, legacy);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(history, path.basename(legacy));
    if (!fs.existsSync(destination)) fs.renameSync(source, destination);
  }
  fs.writeFileSync(path.join(history, "README.md"), "# Historical Evidence\n\nThese captures predate the current checkpoint/sidecar contract. They are retained for diagnosis, not stakeholder approval. Missing notes, failed states and unknown provenance are not reconstructed as current passing evidence. Use ../REVIEW.md for the current campaign.\n");
  fs.writeFileSync(index, reviewIndexText({ status, campaign, integration, visual, failures }));
  fs.writeFileSync(path.join(artifacts, "review.json"), JSON.stringify({
    status,
    runId: campaign?.runId ?? null,
    startedAt: campaign?.startedAt ?? null,
    command: campaign?.command ?? null,
    completedAt: new Date().toISOString(),
    failures,
    integration,
    visual,
  }, null, 2) + "\n");
  console.log(`Review index: ${index}`);
  // The gallery and the pruning never decide the review status: a problem here is only reported.
  try {
    generatePoGallery();
    console.log(`PO gallery: ${path.join(artifacts, "GALLERY.md")}`);
    pruneReports(automaticKeep(), false);
  } catch (error) {
    console.warn(`PO gallery or pruning failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (status !== "passed") process.exitCode = 1;
}

if (process.argv.includes("--begin")) writeReviewStart();
else finishReview();

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
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
  const legacyScroll = path.join(history, "legacy-scroll");
  fs.mkdirSync(legacyScroll, { recursive: true });
  for (const entry of fs.readdirSync(screenshots)) {
    if (!entry.startsWith("scroll-e2e-") || !fs.statSync(path.join(screenshots, entry)).isDirectory()) continue;
    for (const image of fs.readdirSync(path.join(screenshots, entry))) {
      if (!image.endsWith(".png")) continue;
      const destination = path.join(legacyScroll, image);
      if (!fs.existsSync(destination)) fs.renameSync(path.join(screenshots, entry, image), destination);
    }
  }
  fs.writeFileSync(path.join(history, "README.md"), "# Historical Evidence\n\nThese captures predate the current checkpoint/sidecar contract. They are retained for diagnosis, not stakeholder approval. Missing notes, failed states and unknown provenance are not reconstructed as current passing evidence. Use ../REVIEW.md for the current campaign.\n");
  fs.writeFileSync(index, `# Screenshot Review\n\nStatus: **${status}**\n\nCommand: \`${campaign?.command ?? "unknown"}\`\nRun identity: \`${campaign?.runId ?? "unknown"}\`\nRevision: \`${integration.revision ?? "unknown"}\`; dirty worktree: ${Boolean(integration.dirty)}.\n\n${failures.length > 0 ? `Freshness failures:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n\n` : ""}## Review Order\n\n1. [Static document and interaction cases](screenshots/INDEX.md): ${visual.scenarioCount ?? 0} checks, ${visual.screenshotCount ?? 0} canonical images. Includes light/dark, wide/narrow, loading, errors, editing, diagrams and link details. Aliases retain separate assertions without duplicate images.\n2. [Real VS Code scroll checkpoints](screenshots/LATEST.md): ordered states backed by layout, mode, synchronization and keyboard checks.\n3. [Real frontmatter and link interactions](FRONTMATTER-LATEST.md): explicit Description transitions, narrow and wide layouts, target saves, hover tooltips and marker navigation.\n4. [Actual window reload and close/reopen](RELOAD-LATEST.md): before reload, after reload, after reopen. No injected state.\n5. [Real checkbox toggles](CHECKBOX-LATEST.md): \`[ ]\`/\`[x]\` markers clicked in reading mode and edit mode, unchecked and checked states.\n6. [Real-input editing](screenshots/REAL-INPUT-LATEST.md): real mouse and keyboard edits in the side preview and the Open With editor, with the buffer checked after each action.\n\n## Reading Each Capture\n\nOpen the adjacent TXT or Markdown note before its image. It states setup, actions, captured state, expected content, visual checks and limitations. Automated assertions establish behavior; visually check contrast, framing, clipping, spacing and overlap. Intentional fixture warnings are not product failures.\n\nStatic pages use a mock host and do not prove installed-extension behavior. Real-window campaigns use isolated development hosts. Older run directories and archive/ are historical evidence, not this campaign.\n\n[Static manifest](screenshots/run-manifest.json) / [Final integration manifest](integration-manifest.json)\n`);
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
  if (status !== "passed") process.exitCode = 1;
}

if (process.argv.includes("--begin")) writeReviewStart();
else finishReview();

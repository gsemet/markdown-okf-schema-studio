import type { CampaignIdentity, EvidenceManifest } from "./reviewEvidence";

export interface ReviewIndexInput {
  status: "passed" | "failed";
  campaign: CampaignIdentity | undefined;
  integration: EvidenceManifest;
  visual: EvidenceManifest;
  failures: readonly string[];
  /** The real VS Code stage did not run (the manual heavy CI job): its sections are not this campaign. */
  integrationSkipped?: boolean;
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function shortRevision(value: unknown): string {
  return typeof value === "string" && value !== "" ? value.slice(0, 7) : "unknown";
}

/** Counts of the static campaign, read from the visual manifest (never hard-coded). */
export function visualSummary(visual: EvidenceManifest): string {
  const scenarios = count(visual.scenarioCount);
  const primary = count(visual.screenshotCount);
  const steps = count(visual.stepPngCount);
  const assertionOnly = Math.max(0, scenarios - primary);
  return `${scenarios} scenarios, ${primary + steps} images (${primary} primary + ${steps} step), ${assertionOnly} assertion-only`;
}

export function reviewIndexText(input: ReviewIndexInput): string {
  const { campaign, integration, visual, failures } = input;
  const revisionNote = visual.revision !== undefined && integration.revision !== undefined && visual.revision !== integration.revision
    ? ` The visual run was made at a different revision (\`${shortRevision(visual.revision)}\`) than the integration run (\`${shortRevision(integration.revision)}\`).`
    : "";
  return `# Screenshot Review

Status: **${input.status}**

Command: \`${campaign?.command ?? "unknown"}\`
Run identity: \`${campaign?.runId ?? "unknown"}\`
Revision: \`${integration.revision ?? "unknown"}\`; dirty worktree: ${Boolean(integration.dirty)}.
Visual run revision: \`${shortRevision(visual.revision)}\`; completed ${typeof visual.completedAt === "string" ? visual.completedAt : "unknown"}.${revisionNote}

${input.integrationSkipped ? "Real VS Code stage: **not run** in this campaign (it is the manual heavy CI job). The real-window entries below are from an earlier run, if any.\n\n" : ""}${failures.length > 0 ? `Freshness failures:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n\n` : ""}## Review Order

0. [Product-owner gallery by feature](GALLERY.md): every scenario grouped by feature, with its \`locks\` statement, images and the assertion-only scenarios. Start here.
1. [Static document and interaction cases](screenshots/INDEX.md): ${visualSummary(visual)}. Includes light/dark, wide/narrow, loading, errors, editing, diagrams and link details.
2. [Real VS Code scroll checkpoints](screenshots/LATEST.md): ordered states backed by layout, mode, synchronization and keyboard checks.
3. [Real frontmatter and link interactions](FRONTMATTER-LATEST.md): explicit Description transitions, narrow and wide layouts, target saves, hover tooltips and marker navigation.
4. [Actual window reload and close/reopen](RELOAD-LATEST.md): before reload, after reload, after reopen. No injected state.
5. [Real checkbox toggles](CHECKBOX-LATEST.md): \`[ ]\`/\`[x]\` markers clicked in reading mode and edit mode, unchecked and checked states.
6. [Real-input editing](screenshots/REAL-INPUT-LATEST.md): real mouse and keyboard edits in the side preview and the Open With editor, with the buffer checked after each action.
7. [Restricted Mode window](screenshots/UNTRUSTED-LATEST.md): the read-only side preview of an untrusted workspace.

## Reading Each Capture

Open the adjacent JSON or Markdown note before its image. It states setup, actions, captured state, expected content, visual checks and limitations. Automated assertions establish behavior; visually check contrast, framing, clipping, spacing and overlap. Intentional fixture warnings are not product failures.

Static pages use a mock host and do not prove installed-extension behavior. Real-window campaigns use isolated development hosts. Older run directories and archive/ are historical evidence, not this campaign.

[Static manifest](screenshots/run-manifest.json) / [Final integration manifest](integration-manifest.json)
`;
}

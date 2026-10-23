export interface CampaignIdentity {
  runId: string;
  startedAt: string;
  command: string;
}

export type EvidenceManifest = Record<string, unknown>;

function timestamp(value: unknown): number {
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

function validateIdentity(label: string, manifest: EvidenceManifest, campaign: CampaignIdentity): string[] {
  const failures: string[] = [];
  if (manifest.runId !== campaign.runId) failures.push(`${label} run identity does not match review start`);
  if (manifest.campaignStartedAt !== campaign.startedAt) failures.push(`${label} campaign start time does not match review start`);
  if (manifest.campaignCommand !== campaign.command) failures.push(`${label} campaign command does not match review start`);

  const startedAt = timestamp(manifest.startedAt);
  const campaignStartedAt = timestamp(campaign.startedAt);
  const completedAt = timestamp(manifest.completedAt);
  if (Number.isNaN(startedAt) || startedAt < campaignStartedAt) {
    failures.push(`${label} startedAt is missing or predates review start`);
  }
  if (Number.isNaN(completedAt) || completedAt < startedAt) {
    failures.push(`${label} completedAt is missing or predates artifact start`);
  }
  return failures;
}

/**
 * Validate the integration and visual evidence of one campaign. When the two stages ran as separate
 * jobs, each recorded its own campaign identity (same run id, own start time): pass the visual one
 * as `visualCampaign`; each manifest is then validated against the identity of its own stage.
 */
export function validateReviewEvidence(
  campaign: CampaignIdentity,
  integration: EvidenceManifest,
  visual: EvidenceManifest,
  visualCampaign: CampaignIdentity = campaign,
): string[] {
  const failures = [
    ...validateIdentity("integration", integration, campaign),
    ...validateIdentity("visual", visual, visualCampaign),
  ];
  if (visualCampaign.runId !== campaign.runId) failures.push("visual and integration stages belong to different campaigns");
  if (integration.status !== "passed") failures.push("integration campaign did not pass");
  if (integration.scope !== "all") failures.push("integration campaign is not the full scope");
  if (visual.status !== "passed") failures.push("visual campaign did not pass");
  if (!Array.isArray(visual.duplicateImages) || visual.duplicateImages.length !== 0) {
    failures.push("visual campaign has duplicate or missing duplicateImages evidence");
  }
  if (visual.renderRunId !== visualCampaign.runId) failures.push("visual render identity does not match review start");
  if (visual.renderCampaignStartedAt !== visualCampaign.startedAt) {
    failures.push("visual render start time does not match review start");
  }
  return failures;
}

/**
 * Validate the visual evidence alone, for the CI path where the real VS Code stage did not run
 * (it is a manual job). The integration stage is not judged at all: the review says it was skipped.
 */
export function validateVisualEvidence(visualCampaign: CampaignIdentity, visual: EvidenceManifest): string[] {
  const failures = validateIdentity("visual", visual, visualCampaign);
  if (visual.status !== "passed") failures.push("visual campaign did not pass");
  if (!Array.isArray(visual.duplicateImages) || visual.duplicateImages.length !== 0) {
    failures.push("visual campaign has duplicate or missing duplicateImages evidence");
  }
  if (visual.renderRunId !== visualCampaign.runId) failures.push("visual render identity does not match review start");
  if (visual.renderCampaignStartedAt !== visualCampaign.startedAt) {
    failures.push("visual render start time does not match review start");
  }
  return failures;
}

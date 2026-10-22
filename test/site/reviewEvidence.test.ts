import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewEvidence, type CampaignIdentity, type EvidenceManifest } from "./reviewEvidence";

const campaign: CampaignIdentity = {
  runId: "run-current",
  startedAt: "2026-10-14T14:00:00.000Z",
  command: "npm run test:e2e",
};

function artifact(overrides: EvidenceManifest = {}): EvidenceManifest {
  return {
    runId: campaign.runId,
    campaignStartedAt: campaign.startedAt,
    campaignCommand: campaign.command,
    startedAt: "2026-10-14T14:00:01.000Z",
    completedAt: "2026-10-14T14:01:00.000Z",
    ...overrides,
  };
}

test("accepts passed integration and visual artifacts from the current campaign", () => {
  const failures = validateReviewEvidence(
    campaign,
    artifact({ status: "passed", scope: "all" }),
    artifact({
      status: "passed",
      duplicateImages: [],
      renderRunId: campaign.runId,
      renderCampaignStartedAt: campaign.startedAt,
    }),
  );
  assert.deepEqual(failures, []);
});

test("rejects a visually passing manifest left by an earlier campaign", () => {
  const failures = validateReviewEvidence(
    campaign,
    artifact({ status: "passed", scope: "all" }),
    artifact({
      runId: "run-old",
      status: "passed",
      duplicateImages: [],
      renderRunId: "run-old",
      renderCampaignStartedAt: "2026-10-14T13:00:00.000Z",
    }),
  );
  assert.match(failures.join("\n"), /visual run identity does not match/u);
});

test("rejects an artifact created with a different command even when its status passed", () => {
  const failures = validateReviewEvidence(
    campaign,
    artifact({ status: "passed", scope: "all" }),
    artifact({
      status: "passed",
      campaignCommand: "npm run test:visual",
      duplicateImages: [],
      renderRunId: campaign.runId,
      renderCampaignStartedAt: campaign.startedAt,
    }),
  );
  assert.match(failures.join("\n"), /visual campaign command does not match/u);
});

test("validates each stage against its own campaign identity when the stages ran as separate jobs", () => {
  const visualCampaign: CampaignIdentity = { ...campaign, startedAt: "2026-10-14T14:00:30.000Z" };
  const integration = artifact({ status: "passed", scope: "all" });
  const visual = artifact({
    status: "passed",
    duplicateImages: [],
    campaignStartedAt: visualCampaign.startedAt,
    startedAt: "2026-10-14T14:00:40.000Z",
    renderRunId: visualCampaign.runId,
    renderCampaignStartedAt: visualCampaign.startedAt,
  });
  assert.deepEqual(validateReviewEvidence(campaign, integration, visual, visualCampaign), []);
  const stale = { ...visual, startedAt: "2026-10-14T14:00:10.000Z" };
  assert.match(
    validateReviewEvidence(campaign, integration, stale, visualCampaign).join("\n"),
    /visual startedAt is missing or predates review start/u,
  );
  assert.match(
    validateReviewEvidence(campaign, integration, visual, { ...visualCampaign, runId: "other" }).join("\n"),
    /different campaigns/u,
  );
});

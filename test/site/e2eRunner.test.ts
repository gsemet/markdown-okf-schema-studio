import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface Stage {
  name: string;
  command: string;
  status: string;
  exitCode: number;
  startedAt: string;
  completedAt: string;
}

interface RunnerModule {
  runCampaignStages(options: {
    stageRunner: (name: string, command: string, environment?: Record<string, string>) => Stage;
    campaignReader: () => unknown;
  }): { campaign?: unknown; stages: Stage[] };
}

test("propagates a failed review:begin and skips later campaign stages", async () => {
  const runner = await import(pathToFileURL(path.join(process.cwd(), "scripts", "run-e2e.mjs")).href) as RunnerModule;
  const calls: string[] = [];
  let campaignReaderCalled = false;
  const result = runner.runCampaignStages({
    stageRunner: (name, command) => {
      calls.push(name);
      return {
        name,
        command: `npm run ${command}`,
        status: name === "review-begin" ? "failed" : "passed",
        exitCode: name === "review-begin" ? 1 : 0,
        startedAt: "2026-10-14T14:00:00.000Z",
        completedAt: "2026-10-14T14:00:01.000Z",
      };
    },
    campaignReader: () => {
      campaignReaderCalled = true;
      return { runId: "unexpected" };
    },
  });

  assert.deepEqual(calls, ["review-begin"]);
  assert.equal(campaignReaderCalled, false);
  assert.equal(result.campaign, undefined);
  assert.deepEqual(result.stages.map((stage) => stage.status), ["failed"]);
});

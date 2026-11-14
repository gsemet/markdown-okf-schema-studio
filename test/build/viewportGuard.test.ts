import * as assert from "node:assert/strict";
import { test } from "node:test";

import { viewportFitProblem, viewportGuardIsStrict } from "../shared/viewportGuard";

test("a viewport inside the window and the screen passes", () => {
  assert.equal(viewportFitProblem({ width: 1400, height: 900 }, {
    window: { width: 2560, height: 1440 }, screen: { width: 2560, height: 1440 },
  }), undefined);
});

test("an oversize viewport fails with both sizes named", () => {
  const message = viewportFitProblem({ width: 1400, height: 900 }, {
    window: { width: 1280, height: 1024 }, screen: { width: 1280, height: 1024 },
  });
  assert.ok(message);
  assert.match(message, /VIEWPORT EXCEEDS WINDOW/u);
  assert.match(message, /1400x900/u);
  assert.match(message, /window 1280x1024/u);
  assert.match(message, /screen 1280x1024/u);
});

test("a viewport too tall for the screen alone fails", () => {
  const message = viewportFitProblem({ width: 800, height: 1100 }, { window: { width: 1600, height: 1200 }, screen: { width: 1280, height: 1024 } });
  assert.match(message ?? "", /1280x1024/u);
  assert.doesNotMatch(message ?? "", /window 1600x1200/u);
});

test("sizes that could not be read never fail the guard", () => {
  assert.equal(viewportFitProblem({ width: 5000, height: 5000 }, {}), undefined);
  assert.equal(viewportFitProblem({ width: 5000, height: 5000 }, { window: { width: 0, height: 0 } }), undefined);
});

test("the guard is strict only when STUDIO_VIEWPORT_GUARD=strict", () => {
  assert.equal(viewportGuardIsStrict({}), false);
  assert.equal(viewportGuardIsStrict({ STUDIO_VIEWPORT_GUARD: "log" }), false);
  assert.equal(viewportGuardIsStrict({ STUDIO_VIEWPORT_GUARD: " strict " }), true);
});

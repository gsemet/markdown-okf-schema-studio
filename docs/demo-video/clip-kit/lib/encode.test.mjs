// Tests of the key frames the render step writes (keyFrameTimes). Node built-ins only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { keyFrameTimes } from "./encode.mjs";

const names = (frames) => frames.map((frame) => frame.file);

test("a take with presses, a zoom and three marks gives the names of the raw copy clip", () => {
  const take = { presses: [{ id: "copy", t: 2.6 }, { id: "paste", t: 4.2 }], zooms: [{ id: "result", t: 4.4 }], marks: [] };
  const story = { rate: 1, zoom: { id: "result", holdTo: 8.8 }, marks: [{ id: "1", from: 5, to: 6.2 }, { id: "2", from: 6.2, to: 7.4 }, { id: "3", from: 7.4, to: 8.6 }] };
  const frames = keyFrameTimes(take, story);
  assert.deepEqual(names(frames), ["01-selected.png", "02-pasted.png", "03-zoomed.png", "04-mark-1.png", "05-mark-2.png", "06-mark-3.png"]);
  assert.ok(Math.abs(frames[0].at - 2.55) < 1e-9);
  assert.ok(Math.abs(frames[1].at - 4.5) < 1e-9);
  assert.ok(Math.abs(frames[2].at - (4.4 + 0.6 + 8.8) / 2) < 1e-9);
  assert.ok(Math.abs(frames[3].at - 5.6) < 1e-9);
});

test("a take with no press, a zoom, two marks and two key frames gives no press frame", () => {
  const take = { presses: [], keyFrames: [{ name: "drag", t: 2.5 }, { name: "dropped", t: 3.6 }], zooms: [{ id: "raw", t: 4.4 }] };
  const story = { rate: 1.1, zoom: { id: "raw", holdTo: 9.5 }, marks: [{ id: "1", from: 5, to: 6.6 }, { id: "2", from: 6.6, to: 8.2 }] };
  const frames = keyFrameTimes(take, story);
  assert.deepEqual(names(frames), ["03-zoomed.png", "04-mark-1.png", "05-mark-2.png", "drag.png", "dropped.png"]);
  assert.ok(Math.abs(frames[3].at - 2.5 / 1.1) < 1e-9);
  assert.ok(Math.abs(frames[4].at - 3.6 / 1.1) < 1e-9);
});

test("a take with presses and a key frame gives both the press frames and the key frame", () => {
  const take = { presses: [{ id: "copy", t: 1 }], keyFrames: [{ name: "extra", t: 2 }], zooms: [], marks: [] };
  const frames = keyFrameTimes(take, { rate: 1, marks: [] });
  assert.deepEqual(names(frames), ["01-selected.png", "02-pasted.png", "extra.png"]);
});

test("a take with neither presses nor key frames (an older take.json) gives only the zoom and the marks", () => {
  const frames = keyFrameTimes({ zooms: [{ id: "r", t: 1 }] }, { rate: 1, zoom: { id: "r", holdTo: 5 }, marks: [] });
  assert.deepEqual(names(frames), ["03-zoomed.png"]);
});

test("a key frame name that takes a numbered kit name or is repeated is refused, naming scenario.mjs", () => {
  const story = { rate: 1, marks: [] };
  assert.throws(() => keyFrameTimes({ presses: [], keyFrames: [{ name: "01-x", t: 1 }] }, story), { message: /^scenario\.mjs: the key frame name "01-x" must match/u });
  assert.throws(() => keyFrameTimes({ presses: [], keyFrames: [{ name: "Drag", t: 1 }] }, story), { message: /"Drag" must match/u });
  assert.throws(() => keyFrameTimes({ presses: [], keyFrames: [{ name: "drag", t: 1 }, { name: "drag", t: 2 }] }, story), { message: /^scenario\.mjs: the key frame "drag" is named twice/u });
});

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { NAVIGATION_HISTORY_CAP, NavigationHistory } from "../../../src/core/state/navigationHistory";

const place = (uri: string, line: number) => ({ uri, line });

test("an empty history cannot go anywhere", () => {
  const history = new NavigationHistory();
  assert.equal(history.canBack(), false);
  assert.equal(history.canForward(), false);
  assert.equal(history.back(), undefined);
  assert.equal(history.forward(), undefined);
});

test("push, back and forward walk the visited places", () => {
  const history = new NavigationHistory();
  history.push(place("a", 3));
  history.push(place("b", 10));
  history.push(place("c", 1));
  assert.deepEqual(history.back(), place("b", 10));
  assert.deepEqual(history.back(), place("a", 3));
  assert.equal(history.back(), undefined);
  assert.equal(history.canBack(), false);
  assert.equal(history.canForward(), true);
  assert.deepEqual(history.forward(), place("b", 10));
  assert.deepEqual(history.forward(), place("c", 1));
  assert.equal(history.forward(), undefined);
});

test("a push after going back drops the forward entries", () => {
  const history = new NavigationHistory();
  history.push(place("a", 1));
  history.push(place("b", 1));
  history.push(place("c", 1));
  history.back();
  history.push(place("d", 5));
  assert.equal(history.canForward(), false);
  assert.deepEqual(history.snapshot().entries.map((entry) => entry.uri), ["a", "b", "d"]);
});

test("a duplicate of the current entry is ignored", () => {
  const history = new NavigationHistory();
  history.push(place("a", 1));
  history.push(place("a", 1));
  assert.equal(history.snapshot().entries.length, 1);
  history.push(place("a", 2));
  assert.equal(history.snapshot().entries.length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-065
test("the history keeps at most 50 entries, the newest", () => {
  const history = new NavigationHistory();
  for (let n = 1; n <= NAVIGATION_HISTORY_CAP + 10; n += 1) history.push(place("a", n));
  const { entries, index } = history.snapshot();
  assert.equal(entries.length, NAVIGATION_HISTORY_CAP);
  assert.equal(entries[0].line, 11);
  assert.equal(index, NAVIGATION_HISTORY_CAP - 1);
  assert.equal(history.canForward(), false);
});

test("depart updates the line of the same document and pushes another document", () => {
  const history = new NavigationHistory();
  history.depart(place("a", 4));
  history.depart(place("a", 9));
  assert.deepEqual(history.snapshot().entries, [place("a", 9)]);
  history.depart(place("b", 2));
  assert.deepEqual(history.snapshot().entries, [place("a", 9), place("b", 2)]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-059
test("depart without a known line keeps the entry's line and pushes a new document at line 1", () => {
  const history = new NavigationHistory();
  history.push(place("a", 7));
  history.depart({ uri: "a" });
  assert.deepEqual(history.snapshot().entries, [place("a", 7)]);
  history.depart({ uri: "b" });
  assert.deepEqual(history.snapshot().entries, [place("a", 7), place("b", 1)]);
});

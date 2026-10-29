import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  alertExcerpt,
  alertPickApplied,
  alertPickEvents,
  type AlertPickRecord,
  formatAlertPickProbeLine,
} from "../shared/alertPickProbe";

const PARAGRAPH = "Second paragraph.";
const doc = (head: string): string => ["# Smoke document", "", "First paragraph.", "", head, `> ${PARAGRAPH}`, ""].join("\n");

/** A pick that worked: the choice, then the commit key, the re-render and the close. */
const APPLIED: AlertPickRecord = {
  mode: "keyboard",
  chosen: "TIP",
  pickAt: 1000,
  probeEvents: [
    { at: 990, kind: "input", detail: "> [!NOTE]" },
    { at: 1000, kind: "mark", detail: "keyboard pick" },
    { at: 1040, kind: "input", detail: "> [!TIP]" },
    { at: 1100, kind: "mark", detail: "commit key" },
    { at: 1180, kind: "blur", detail: "related=none pageFocus=true" },
  ],
  trace: [
    { at: 400, event: "block editor opened", detail: "line=6" },
    { at: 1150, event: "content patch", detail: "request 1 -> 2" },
    { at: 1151, event: "block editor closed", detail: "line=6 active=body pageFocus=true" },
  ],
  markdown: doc("> [!TIP]"),
  paragraph: PARAGRAPH,
};

/** The stress failure's shape: the text box blurred and committed before the option press landed. */
const LOST: AlertPickRecord = {
  mode: "mouse",
  chosen: "WARNING",
  pickAt: 538,
  probeEvents: [{ at: 538, kind: "mark", detail: "mouse pick" }],
  trace: [
    { at: 460, event: "mousedown", detail: "action=alert prevented=true active=textarea pageFocus=true" },
    { at: 680, event: "block editor blur", detail: "related=none commit active=body pageFocus=true" },
    { at: 681, event: "page blur", detail: "active=body pageFocus=false" },
    { at: 749, event: "content patch", detail: "request 1 -> 2" },
    { at: 749, event: "block editor closed", detail: "line=6 active=body pageFocus=false" },
  ],
  markdown: doc("> [!NOTE]"),
  paragraph: PARAGRAPH,
};

test("the pick's events are sorted into blur, commit, close, choice and marks, from the pick on", () => {
  assert.deepEqual(alertPickEvents(APPLIED), {
    blur: ["+180ms text box blur related=none pageFocus=true"],
    commit: ["+150ms content patch request 1 -> 2"],
    close: ["+151ms block editor closed line=6 active=body pageFocus=true"],
    choice: ["+40ms > [!TIP]"],
    marks: ["+0ms keyboard pick", "+100ms commit key"],
  });
  assert.deepEqual(alertPickEvents(LOST), {
    blur: ["+142ms block editor blur related=none commit active=body pageFocus=true",
      "+143ms page blur active=body pageFocus=false"],
    commit: ["+142ms block editor blur related=none commit active=body pageFocus=true",
      "+211ms content patch request 1 -> 2"],
    close: ["+211ms block editor closed line=6 active=body pageFocus=false"],
    choice: [],
    marks: ["+0ms mouse pick"],
  });
  // Without the pick's time every event is kept, on the page clock.
  assert.deepEqual(alertPickEvents({ ...LOST, pickAt: undefined }).close, ["@749ms block editor closed line=6 active=body pageFocus=false"]);
});

test("the chosen type counts only as the alert head right above the paragraph", () => {
  assert.equal(alertPickApplied(doc("> [!TIP]"), "TIP", PARAGRAPH), true);
  assert.equal(alertPickApplied(doc("> [!NOTE]"), "TIP", PARAGRAPH), false);
  assert.equal(alertPickApplied(["> [!TIP]", "", `> ${PARAGRAPH}`].join("\n"), "TIP", PARAGRAPH), false);
  assert.equal(alertPickApplied(PARAGRAPH, "TIP", PARAGRAPH), false);
  assert.equal(alertExcerpt(doc("> [!TIP]"), PARAGRAPH), `> [!TIP]\n> ${PARAGRAPH}`);
  assert.equal(alertExcerpt(PARAGRAPH, PARAGRAPH), PARAGRAPH);
  assert.equal(alertExcerpt("# Other", PARAGRAPH), "(paragraph \"Second paragraph.\" not found)");
});

test("one log line per pick says what was chosen, whether the file has it, and each event", () => {
  assert.equal(formatAlertPickProbeLine(APPLIED),
    "ALERT-PICK-PROBE keyboard: chosen=TIP applied=true"
    + " blur=[+180ms text box blur related=none pageFocus=true]"
    + " commit=[+150ms content patch request 1 -> 2]"
    + " close=[+151ms block editor closed line=6 active=body pageFocus=true]"
    + " choice=[+40ms > [!TIP]] marks=[+0ms keyboard pick; +100ms commit key]"
    + " markdown=\"> [!TIP]\\n> Second paragraph.\"");
  const lost = formatAlertPickProbeLine(LOST);
  assert.match(lost, /^ALERT-PICK-PROBE mouse: chosen=WARNING applied=false blur=\[\+142ms block editor blur/u);
  assert.match(lost, / choice=none marks=\[\+0ms mouse pick\] markdown="> \[!NOTE\]\\n> Second paragraph\."$/u);
  assert.equal(formatAlertPickProbeLine({ ...LOST, probeEvents: [], trace: [] }).includes("blur=none commit=none close=none"), true);
});

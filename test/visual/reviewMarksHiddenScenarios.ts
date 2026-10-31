/**
 * The toolbar Comments button hides every review mark, not only the chips: two placed threads (an
 * open highlight and a resolved one, drawn with a dotted underline) and two orphaned threads (the
 * Orphaned comments box), in the light and the dark theme. The check of `capture_comment_checks.py`
 * presses the button, checks that the marks are plain text and that a click on a former highlight
 * opens no popover, presses it again to bring everything back, and leaves the page hidden for the
 * screenshot.
 */

import {
  THREAD_ENTRY_OPEN,
  THREAD_ENTRY_ORPHAN_OPEN,
  THREAD_ENTRY_ORPHAN_RESOLVED,
  THREAD_ENTRY_RESOLVED,
  WIDE,
} from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

const ALL_THREADS_MESSAGE = {
  data: {
    type: "previewComments",
    threads: [THREAD_ENTRY_OPEN, THREAD_ENTRY_RESOLVED, THREAD_ENTRY_ORPHAN_OPEN, THREAD_ENTRY_ORPHAN_RESOLVED],
  },
};

export const REVIEW_MARKS_HIDDEN_SCENARIOS: ScenarioDefinition[] = (["light", "dark"] as const).map((theme, index) => ({
  // @tests_req SwRS-MDOKFSTUDIO-REVIEW-152
  id: `review-annotations/v${29 + index}-comments-button-hides-review-marks-${theme}-900`,
  fixture: "45-review-threads",
  theme,
  ...WIDE,
  scroll: { kind: "top" as const },
  render: { hostMessages: [ALL_THREADS_MESSAGE] },
  commentMarksHiddenChecks: true,
  description: `An open and a resolved review thread on the text and two orphaned threads, ${theme} theme, 900 px pane: the `
    + "toolbar Comments button removes the highlight colour, the dotted underline and the Orphaned comments box, the quoted "
    + "text stays as plain text, a click on it opens no popover and reveals its source line, and a second press brings "
    + "every mark back. The final frame is the hidden state after that click.",
}));

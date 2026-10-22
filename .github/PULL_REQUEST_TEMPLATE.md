## Summary

<!-- Why: the user problem or limitation this solves, in two or three sentences. -->

## Changes

<!-- What: the key mechanisms and files, as a short list. Not a diff summary. -->

## Impacts

<!-- What users and developers will notice. For a visible change: before/after screenshots
(light and dark when themes matter). Otherwise one line, e.g. "No visual change". -->

## Blast radius

<!-- Keep one grade and explain it in one or two lines: what could break, how to roll back. -->

- **1**: local and isolated; a plain `git revert` restores the previous behaviour.
- **2**: several features or shared code; revert is possible but needs checks or follow-ups.
- **3**: wide impact (data, formats, CI, release, public API); rollback is complex or partial.

Grade: <!-- 1 | 2 | 3 -->

## Test plan

- [ ] New or changed tests (they fail on the previous code)
- [ ] Local gates: <!-- targets run and their counts -->
- [ ] Review
- [ ] CI green

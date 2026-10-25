<!-- Write the whole PR (title and body) in English, for a reader outside the project team:
no internal ids (CR, backlog, plan or task numbers). Put any such reference in an optional
last section "Internal references". -->

## Summary

<!-- Why: the user problem or limitation this solves, in two or three sentences. -->

## Deliverable showcase

<!-- Show the deliverable, meaning what the reader gets, with small visuals each next to the
sentence it supports: a Mermaid flowchart of the modules or calls that change, a sequence diagram
of one real flow, a before/after tree or table, or a 5-15 line code sketch of the new interface.
Only the calls, files, props and boundaries the reviewer needs. A one-line fix may write "None". -->

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
- [ ] Requirements: SwRS updated or added, markers in code and tests, `just requirements-update`
      <!-- or "No behaviour change" -->
- [ ] Local gates: <!-- targets run and their counts -->
- [ ] Review
- [ ] CI green

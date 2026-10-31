# Plan: link-only blocks open their editor

A block that holds only a link opens the link when it is clicked, so its editor cannot be reached
from the preview. The agent proposes three fixes; the recommended one is preselected. Click
another option to change the decision: the choice is written back to this file.

Fix direction:

- (x) A click in the margin around the block opens its editor
- ( ) Alt+click on the link opens the editor
- ( ) Leave as is: edit link-only blocks in the source

Rollout:

1. ( ) Ship behind a setting first
2. (x) Ship on by default in the next release

## Tasks

- [x] Reproduce the bug in a link-only paragraph
- [ ] Implement the chosen fix
- [ ] Add a real-input test for the click

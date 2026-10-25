---
type: SwRS
id: SwRS-MDOKFSTUDIO-PALETTE-183
uuid: dbfd1e4b-15f6-4518-a8a3-efc47cb5192a
title: The host scans nearby bibliography files for citation keys within bounds
description: When the host answers previewListCitations, the extension SHALL
  search the .bib files of the folder of the document first and then of its
  workspace folder outside the folders node_modules, .git, _build, .venv, venv,
  out and dist, read at most 20 files within 2 MiB and 5 seconds, and answer the
  unique entry keys sorted, at most 1000, each with its title, marking the list
  truncated when any bound cuts it, or answer ok false with the message of the
  error when the scan fails.
project: markdown-okf-schema-studio
scope: palette-slash
lifecycle: draft
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-PALETTE-013
depends_on:
- SwRS-MDOKFSTUDIO-TRUST-052
- SwRS-MDOKFSTUDIO-TRUST-005
- SwRS-MDOKFSTUDIO-TRUST-065
- SwRS-MDOKFSTUDIO-TRUST-090
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/mapping/mystTargets.ts
- src/session/bibScan.ts
- src/session/features/hostRequests.ts
tested_in_files:
- test/core/mapping/mystTargets.test.ts
- test/integration/mystPickers.test.ts
- test/session/paletteReq.requirements.test.ts
---

## The host scans nearby bibliography files for citation keys within bounds

### Normative behavior

When the host answers previewListCitations, the extension SHALL search the .bib files of the folder of the document first and then of its workspace folder outside the folders node_modules, .git, _build, .venv, venv, out and dist, read at most 20 files within 2 MiB and 5 seconds, and answer the unique entry keys sorted, at most 1000, each with its title, marking the list truncated when any bound cuts it, or answer ok false with the message of the error when the scan fails.

### Scenario (nominal): Nearest first

- GIVEN a .bib file next to the document and another in a sibling folder
- WHEN the scan runs
- THEN both keys are listed and the file next to the document is read first

### Scenario (refusal): Excluded folder

- GIVEN a .bib file under node_modules
- WHEN the scan runs
- THEN its keys are not listed

The skipped folders are node_modules, .git, _build, .venv, venv, out and dist; the search uses the glob **/*.bib with that exclusion list.

### Scenario (boundary): Bounds of the scan

| Input | Outcome |
| --- | --- |
| more bibliography files than 20 | at most 20 files are taken and the list is marked truncated when that cap is reached |
| bibliography files of 3 MiB together | files are read only while their total size stays within 2 MiB; the files that do not fit are skipped and the list is marked truncated |
| a file that cannot be read | the file is skipped and the other files still count; the scan does not fail |
| a search that takes longer than 5 seconds | the search is cancelled, no more file is read, and the list holds the keys read so far with truncated true |
| a search that ends in time | the timer is cleared |

### Scenario (nominal): Entries of the list

- GIVEN a file with the entries smith2024 and jones-2020 and a comment entry
- WHEN the keys are read
- THEN the two keys are listed sorted (English locale comparison) with their titles (clipped to 80 characters), and the comment, string and preamble entries are skipped

### Scenario (boundary): Duplicates and cap of the list

| Input | Outcome |
| --- | --- |
| the same key in two files | the key appears once and the first file that defines it wins |
| more than 1000 keys | the list is cut at 1000 with truncated true |

### Scenario (refusal): Failed scan, read-only preview and stale preview

| Input | Outcome |
| --- | --- |
| a scan that throws an Error | previewListCitationsResult holds ok false and the reason is the message of the error |
| a scan that throws a value that is not an Error | ok false and the reason is that value as a string |
| one unreadable file among readable ones | the scan does not fail and the other keys are answered |
| a read-only preview | ok false with the reason Citations are read from the workspace, which needs trust. |
| a document that is no longer the one of the render | ok false with the reason The preview is out of date. Try again once it has refreshed. |
| a previewListCitations message without a non-empty editId of at most 100 characters | ignored by the envelope check |

Each answer repeats the editId and holds ok true with the items (value and label are the key, the detail is the title) and the truncated flag; see SwRS-MDOKFSTUDIO-TRUST-052, SwRS-MDOKFSTUDIO-TRUST-005, SwRS-MDOKFSTUDIO-TRUST-065 and SwRS-MDOKFSTUDIO-TRUST-090.

### Known issues

- Known issue: the truncated flag is also set when exactly 20 bibliography files exist, although nothing was cut, so the note More entries exist is shown for a complete list (bibScan.ts:search sets it when the number of files found reaches the cap; deduced from the code, not run).

### Related requirements

- SwRS-MDOKFSTUDIO-PALETTE-149: the cite role written for a chosen key.

### Verification notes

- Method: test/integration/mystPickers.test.ts (the keys smith2024 and zed are listed, hiddenkey in node_modules is excluded, the title Smith title is listed with smith2024; checks nearest first, excluded folder, entries of the list)
- Method: test/session/paletteReq.requirements.test.ts (the scan skips files that do not fit in 2 MiB, marks the list truncated and skips an unreadable file; a scan still running after 5 seconds stops reading and marks the list truncated; a fast scan clears the timer; a citation scan that throws is answered with ok false and the message of the error; checks the bounds and failed scan scenarios)
- Method: test/core/mapping/mystTargets.test.ts (bibKeys reads entry keys and titles, and skips comment, string and preamble entries; collectBibKeys merges files, removes duplicates, sorts and caps; checks the entries and duplicates scenarios)
- Criteria: The 20 file cap is not asserted by a test (untested); MAX_BIB_BYTES is 2 MiB and the text of each file is decoded as UTF-8; SCAN_TIMEOUT_MS is 5000; the read-only and out-of-date answers are deduced from the code (handleListCitations), not tested.

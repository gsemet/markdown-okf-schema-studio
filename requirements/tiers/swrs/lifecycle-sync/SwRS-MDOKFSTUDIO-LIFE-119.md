---
type: SwRS
id: SwRS-MDOKFSTUDIO-LIFE-119
uuid: 933f6c92-10de-4ae6-9f2a-190702457ff2
title: Both panes share one reading anchor that survives updates
description: When a preview is scrolled, rebuilt, re-laid out or edited, the
  extension SHALL define its scroll anchor as a source line (the editor's first
  visible line, and the preview's line at its reading line below the sticky
  heading band, with the very top of the page always being line 1) and keep that
  anchor through the update.
project: markdown-okf-schema-studio
scope: lifecycle-sync
lifecycle: proposed
origin: native
tier: SwRS
derives_from:
- StRS-MDOKFSTUDIO-LIFE-010
- StRS-MDOKFSTUDIO-LIFE-003
depends_on:
- SwRS-MDOKFSTUDIO-CORE-003
annotation_exemption: false
exemption_reason:
derived_by: []
implemented_in_files:
- src/core/scroll/anchorPolicy.ts
- src/core/security/html-sanitizer.ts
- src/page/features/scrollCore.ts
- src/session/features/scrollSync.ts
tested_in_files:
- test/core/scroll/anchorPolicy.test.ts
- test/integration/scroll-sync-suite.ts
- test/integration/sourceMapping.test.ts
- test/page/lifeReq.requirements.test.ts
- test/page/runtimeContentPatch.test.ts
- test/page/runtimeScroll.test.ts
default_owner_email: gaetan@xeberon.net
---

## Both panes share one reading anchor that survives updates

### Normative behavior

When a preview is scrolled, rebuilt, re-laid out or edited, the extension SHALL define its scroll anchor as a source line (the editor's first visible line, and the preview's line at its reading line below the sticky heading band, with the very top of the page always being line 1) and keep that anchor through the update.

### Scenario (nominal): Reading the anchor line
| Input | Outcome |
| --- | --- |
| a preview scrolled down the page | the anchor line is the line that starts at the reading line below the band, never the caret line; the editor top line is the floor of the anchor |
| a scroll position of 0 | the anchor line is line 1 |

### Scenario (nominal): A line inside a long paragraph
| Input | Outcome |
| --- | --- |
| a paragraph of five source lines wrapped over twelve rendered lines, and source line 4 looked up | the position is the measured start of that line, not a proportional guess |
| a paragraph whose line starts cannot be measured reliably, and a line inside it looked up | the block's top and bottom bound the position |

### Scenario (nominal): A new render starts at the last anchor
| Input | Outcome |
| --- | --- |
| a preview whose anchor is line 80, and a new render is built | its boot context carries initialAnchor 80 and the page applies it before the first paint |
| no anchor yet and a visible editor whose zero-based first visible line is 30, the first render is built | its initial anchor is line 31 in one-based numbering |
| no anchor yet and the follow setting off | no anchor is passed |

### Scenario (nominal): Layout changes re-apply the stored anchor
| Input | Outcome |
| --- | --- |
| an image loads, the pane is resized, the content changes size, the sticky band changes or the zoom changes | the page scrolls again to the stored anchor line instead of re-reading it from the scroll position |
| a preview scrolled to the middle of a long document, and the reader cycles the width mode through auto, full and margin | the same heading stays within 40 px of where it was |
| a sticky band that appears while the page is scrolled | the content does not move |
| a scroll whose layout pass runs before the scroll is handled (a viewport resize reported with each scroll, as in a webview next to an editor) | the scroll sets the anchor first; the page stays where the reader scrolled |
| a pending scroll while blocks change position or height, such as a comment above the reading line closing | the stored anchor survives; the layout-induced scroll does not become a new reading position |

### Scenario (boundary): Lines added or removed above the anchor
| Input | Outcome |
| --- | --- |
| an anchor at line 50 and two lines inserted at line 10 | the anchor of each preview of that document is line 52 |
| an edit at line 60 with the anchor at line 50 | the anchor stays line 50 |

### Scenario (nominal): While a block or field editor is open
| Input | Outcome |
| --- | --- |
| an open block editor or frontmatter field editor whose text grows and the layout shifts | the edited element stays where it was on screen |
| an open block editor and the text editor scrolled explicitly | the preview follows, the editor stays open and the element's anchor is the new position |

### Scenario (nominal): Every mapped block carries its source mapping
- GIVEN a rendered document of a heading, paragraphs, an admonition and a figure
- WHEN the host builds the page
- THEN each element with a positive integer source line carries the source file, the source line, the document id and a block id source-block-1, source-block-2 and so on in document order; an element that spans several lines also carries its end line; no line is 0 or negative
- GIVEN a figure directive and an element whose line attribute is 0, negative or not a number
- WHEN the host builds the page
- THEN the figure is keyboard-accessible with tabindex 0 (an element that is naturally focusable keeps its own) and the invalid element gets no mapping attributes

### Scenario (refusal): The page measures only its own visible mapped blocks
| Input | Outcome |
| --- | --- |
| an element that names another document or another file | ignored for scrolling and anchors |
| a mapped element with display none | ignored |
| a mapping whose file path uses Windows separators | the backslashes are normalized and the document identity check still applies |

### Related requirements
- SwRS-MDOKFSTUDIO-CORE-003: the line numbers of the source mapping
- SwRS-MDOKFSTUDIO-TOOLBAR-025: the sticky band
- SwRS-MDOKFSTUDIO-LIFE-100: the scroll from the text editor to the preview
- SwRS-MDOKFSTUDIO-LIFE-108: the scroll from the preview to the text editor

### Verification notes
- Method: test/page/runtimeScroll.test.ts, `a pending layout-induced scroll does not replace the reading anchor` distinguishes changed block geometry from the unchanged geometry in `a viewport resize fired before the scroll it accompanies does not pull the page back`.
- Method: test/core/scroll/anchorPolicy.test.ts (scenarios 1, 2, 5: "converts lines to scroll positions and back through the reading offset", "reports the editor top line as the floor of the anchor", "ramps the reading line so the top of the page is line 1", "anchors long paragraphs at the start of each source line", "falls back to block bounds when paragraph lines cannot be measured", "shifts the anchor when lines change above it only")
- Method: test/page/runtimeContentPatch.test.ts (scenario 3, page half: a boot context with initialAnchor 50); the host rule (stored anchor, then the editor's first visible line, then none) is untested
- Method: test/integration/scroll-sync-suite.ts (scenarios 4 and 6: width-cycle-reading-line; block editor stays open through scrolling)
- Method: test/page/runtimeScroll.test.ts (scenarios 4 and 6: "preserves preview scroll when layout changes during sticky heading activation", "refreshes source anchor geometry after a block editor changes document flow", "source scrolling remains bidirectional while a block editor is open")
- Method: test/integration/sourceMapping.test.ts (scenario 7: the attributes, the block ids, the figure tabindex and that no zero or negative line appears; block ids are per render)
- Method: test/page/lifeReq.requirements.test.ts (scenario 8: "the page uses only mapped blocks of its own document and file that are visible", by reading parseMappings in src/page/features/scrollCore.ts) and test/core/mapping/sourceMapping.test.ts (the same rules on parseSourceMappings: "keeps only active-document mappings in DOM order for ties", "accepts Windows separators without weakening document identity")
- Criteria: lineAtScrollTop(0) is 1 and editorTopLine floors the anchor; buildAnchorMap holds one point per measured line; initialAnchorLine returns the stored anchor first, then the editor line, then undefined; the anchor line is unchanged and the heading offset stays within 40 px; shiftLineForEdits returns line + delta only for changes that end above the anchor; the element's viewport top is unchanged while typing and follows an explicit scroll; the html matches the attribute patterns; parseMappings returns only elements that pass the checks.

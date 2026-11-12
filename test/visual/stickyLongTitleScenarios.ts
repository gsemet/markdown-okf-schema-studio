/**
 * The sticky band keeps a long heading on one line, cut with an ellipsis (CR 311), at 160 % zoom.
 */

import { WIDE } from "./scenarioAssertions";
import type { ScenarioDefinition } from "./scenarioAssertions";

export const STICKY_LONG_TITLE_SCENARIOS: ScenarioDefinition[] = [
  {
    // @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-025
    id: "toolbar-navigation/v45-sticky-long-title-zoom-160-cream-900",
    fixture: "88-sticky-long-title",
    theme: "light",
    previewThemeMode: "cream",
    stickyHeadingDepth: 1,
    render: { zoom: 160 },
    ...WIDE,
    scroll: { kind: "stickyHeading", value: 'h1[data-line="1"]' },
    expectedStickyHeadings: "# Operating a cross-functional vehicle software verification programme across several engineering domains and release trains",
    expectStickyEllipsis: true,
    expectSectionStartVisible: true,
    description:
      "At 160 % zoom in Cream with depth 1, a long H1 stays on one line in the sticky band, cut with an ellipsis, and the first line of its section is visible under the band.",
  },
];

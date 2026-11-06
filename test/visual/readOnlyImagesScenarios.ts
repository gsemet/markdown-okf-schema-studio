/**
 * Restricted Mode shows images (CR 238): an image with spaces in its name in a subfolder of the
 * document folder, the same file in angle brackets and an image of the workspace root load; an
 * image below a dot-directory stays refused.
 */

import { READ_ONLY_IMAGES_ASSERTIONS, WIDE, type ScenarioDefinition } from "./scenarioAssertions";

export const READ_ONLY_IMAGES_SCENARIOS: ScenarioDefinition[] = [{
  // @tests_req SwRS-MDOKFSTUDIO-TRUST-002
  id: "trust-security/v04-read-only-images-light-900",
  fixture: "77-read-only-images",
  theme: "light",
  ...WIDE,
  scroll: { kind: "top" as const },
  render: { restrictedReads: true as const },
  contentAssertions: READ_ONLY_IMAGES_ASSERTIONS,
  description: "A preview with restricted reads (Restricted Mode) shows an image with spaces in its name in a subfolder, the same file in angle brackets "
    + "and an image of the workspace root, and refuses an image below a dot-directory.",
}];

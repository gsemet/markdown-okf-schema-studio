import * as path from "node:path";

export const EXTENSION_ROOT = path.resolve(__dirname, "../..");
export const REPORTS_ROOT = path.join(EXTENSION_ROOT, "out", "reports");
export const VISUAL_REPORT_ROOT = path.join(REPORTS_ROOT, "visual");
export const E2E_REPORT_ROOT = path.join(REPORTS_ROOT, "e2e");
export const E2E_SCREENSHOT_ROOT = path.join(E2E_REPORT_ROOT, "screenshots");
export const INTEGRATION_REPORT_ROOT = path.join(REPORTS_ROOT, "integration");
export const UNIT_REPORT_ROOT = path.join(REPORTS_ROOT, "unit");
export const CONTRACT_REPORT_ROOT = path.join(REPORTS_ROOT, "contract");
export const SECURITY_REPORT_ROOT = path.join(REPORTS_ROOT, "security");
export const SPHINX_REPORT_ROOT = path.join(REPORTS_ROOT, "sphinx");

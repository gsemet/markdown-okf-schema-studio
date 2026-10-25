/**
 * The page side of the span colours. The colour grammar itself is host-neutral and lives in core
 * (the sanitizer uses it too); it is re-exported here for the page runtime.
 */
export { isSafeOkfColor } from "../../core/security/spanColors";

// @implements_req SwRS-MDOKFSTUDIO-GFM-034
/**
 * Applies the validated colours kept by the sanitizer. The value is validated again here with the
 * same grammar (passed in), so a hand-edited attribute can never reach `style`.
 */
export function applySpanColors(document: Document, isSafe: (value: string) => boolean): void {
  const targets: Array<[string, string]> = [["data-okf-color", "color"], ["data-okf-background", "background-color"]];
  for (const [attribute, property] of targets) {
    document.querySelectorAll<HTMLElement>("#sphinx-myst-preview-content [" + attribute + "]").forEach((element) => {
      const value = (element.getAttribute(attribute) ?? "").trim();
      if (isSafe(value)) element.style.setProperty(property, value);
    });
  }
}

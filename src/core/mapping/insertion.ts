import { sourceLines } from "../edits/textEdit";
import { matchFrontmatterBlock } from "../frontmatter/okfFrontmatter";

export interface InsertionPlan {
  /** UTF-16 offset in the document text where the inserted text starts. */
  offset: number;
  prefix: string;
  suffix: string;
  lineEnding: string;
}

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-094
/** Where and how to insert a new block after `afterLine` (0 = start of the body). */
export function planInsertion(text: string, afterLine: number): InsertionPlan | undefined {
  if (!Number.isSafeInteger(afterLine) || afterLine < 0) {
    return undefined;
  }
  const lineEnding = text.includes("\r\n") ? "\r\n" : text.includes("\n") ? "\n" : text.includes("\r") ? "\r" : "\n";
  const lines = sourceLines(text);
  let anchorLine = afterLine;
  if (afterLine === 0) {
    const frontmatter = matchFrontmatterBlock(text);
    if (!frontmatter) {
      const firstLineBlank = text.length > 0 && lines.text(0).trim() === "";
      return {
        offset: 0,
        prefix: "",
        suffix: text.length === 0 || firstLineBlank ? lineEnding : lineEnding + lineEnding,
        lineEnding,
      };
    }
    const closed = text.slice(0, frontmatter.length).replace(/(?:\r\n|\n|\r)$/u, "");
    anchorLine = sourceLines(closed).count;
  }
  // The line after a final line break does not exist; an empty text has its one empty line.
  if (anchorLine > lines.count || (lines.start(anchorLine - 1) >= text.length && text.length > 0)) {
    return undefined;
  }
  const offset = lines.end(anchorLine - 1);
  const following = anchorLine < lines.count ? lines.text(anchorLine) : "";
  return {
    offset,
    prefix: lineEnding + lineEnding,
    suffix: following.trim() !== "" ? lineEnding : "",
    lineEnding,
  };
}

/** Text to insert at `plan.offset` for the raw block text; empty when nothing should be inserted. */
export function insertionText(plan: InsertionPlan, raw: string): string {
  if (raw.trim() === "") {
    return "";
  }
  return plan.prefix
    + raw.replace(/\r\n|\n|\r/gu, plan.lineEnding).replace(/(?:\r\n|\n|\r)+$/u, "")
    + plan.suffix;
}

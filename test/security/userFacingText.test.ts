import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";

/**
 * Strings that mention Sphinx on purpose. Each entry needs a reason why a user never sees it.
 * Currently empty: no scanned file keeps an internal Sphinx string literal.
 */
const ALLOWLIST: readonly { file: string; text: string; reason: string }[] = [];

interface Literal {
  line: number;
  text: string;
}

/** Extracts string and template literals, skipping comments and regex literals' quotes loosely. */
function literals(source: string): Literal[] {
  const result: Literal[] = [];
  let line = 1;
  let index = 0;
  const templateDepth: number[] = [];
  let braceDepth = 0;
  const readQuoted = (quote: string): void => {
    const startLine = line;
    let text = "";
    index += 1;
    while (index < source.length && source[index] !== quote) {
      if (source[index] === "\\") {
        text += source[index];
        index += 1;
      }
      if (source[index] === "\n") line += 1;
      text += source[index];
      index += 1;
    }
    index += 1;
    result.push({ line: startLine, text });
  };
  const readTemplate = (): void => {
    let startLine = line;
    let text = "";
    index += 1;
    while (index < source.length && source[index] !== "`") {
      if (source[index] === "\\") {
        text += source[index];
        index += 1;
      } else if (source[index] === "$" && source[index + 1] === "{") {
        result.push({ line: startLine, text });
        text = "";
        index += 2;
        templateDepth.push(braceDepth);
        braceDepth += 1;
        return scanCode();
      }
      if (source[index] === "\n") line += 1;
      text += source[index];
      index += 1;
    }
    index += 1;
    result.push({ line: startLine, text });
    startLine = line;
  };
  function scanCode(): void {
    while (index < source.length) {
      const char = source[index];
      if (char === "\n") {
        line += 1;
        index += 1;
      } else if (char === "/" && source[index + 1] === "/") {
        while (index < source.length && source[index] !== "\n") index += 1;
      } else if (char === "/" && source[index + 1] === "*") {
        index += 2;
        while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
          if (source[index] === "\n") line += 1;
          index += 1;
        }
        index += 2;
      } else if (char === '"' || char === "'") {
        readQuoted(char);
      } else if (char === "`") {
        readTemplate();
      } else if (char === "{") {
        braceDepth += 1;
        index += 1;
      } else if (char === "}") {
        braceDepth -= 1;
        index += 1;
        if (templateDepth.length > 0 && templateDepth[templateDepth.length - 1] === braceDepth) {
          templateDepth.pop();
          return resumeTemplate();
        }
      } else {
        index += 1;
      }
    }
  }
  function resumeTemplate(): void {
    // Continue reading the template text after a closing "}" of an interpolation.
    index -= 1;
    source = source.slice(0, index) + "`" + source.slice(index + 1);
    readTemplate();
    scanCode();
  }
  scanCode();
  return result;
}

function scannedFiles(): string[] {
  const root = path.resolve(__dirname, "../../..");
  const files = [path.join(root, "src", "extension.ts"), path.join(root, "src", "session", "webview.ts")];
  const renderDirectory = path.join(root, "src", "core", "render");
  for (const name of fs.readdirSync(renderDirectory)) {
    if (name.endsWith(".ts")) files.push(path.join(renderDirectory, name));
  }
  return files;
}

test("the literal scanner skips comments and finds strings in templates", () => {
  const found = literals([
    "// Sphinx in a comment",
    "/* Sphinx in a block */",
    "const a = 'plain';",
    "const b = `Sphinx ${value} tail`;",
    "const c = \"Sphinx\";",
  ].join("\n"));
  const hits = found.filter((entry) => /Sphinx/u.test(entry.text));
  assert.deepEqual(hits.map((entry) => entry.line), [4, 5]);
});

// @tests_req SwRS-MDOKFSTUDIO-TRUST-070
test("no user-facing string literal mentions Sphinx", () => {
  const offenders: string[] = [];
  for (const file of scannedFiles()) {
    const relative = path.relative(path.resolve(__dirname, "../../.."), file).split(path.sep).join("/");
    const source = fs.readFileSync(file, "utf8").replace(/\r\n/gu, "\n");
    for (const entry of literals(source)) {
      if (!/Sphinx/u.test(entry.text)) continue;
      if (ALLOWLIST.some((allowed) => allowed.file === relative && entry.text.includes(allowed.text))) continue;
      offenders.push(relative + ":" + entry.line + ": " + entry.text.trim().slice(0, 80));
    }
  }
  assert.deepEqual(offenders, []);
});

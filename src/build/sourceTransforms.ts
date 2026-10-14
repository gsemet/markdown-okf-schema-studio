const GITHUB_ALERT_TYPES = new Map([
  ["NOTE", "note"],
  ["TIP", "tip"],
  ["IMPORTANT", "important"],
  ["WARNING", "warning"],
  ["CAUTION", "caution"],
]);

const ALERT_MARKER = /^(\s*)>\s*\[!([A-Za-z]+)\]\s*$/u;
const FENCE = /^\s*(?:`{3,}|~{3,})/u;

function stripQuote(line: string): string {
  return line.replace(/^\s*>\s?/u, "");
}

/**
 * Rewrites GitHub alert blockquotes (`> [!NOTE]`) into MyST colon-fence admonitions.
 *
 * Line numbers are preserved whenever the alert is followed by a blank line, which the
 * closing fence reuses — the preview source map depends on that alignment.
 */
export function expandGithubAlerts(text: string): string {
  const lines = text.split("\n");
  const output: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (FENCE.test(line)) {
      inFence = !inFence;
      output.push(line);
      continue;
    }
    const marker = inFence ? null : line.match(ALERT_MARKER);
    const kind = marker ? GITHUB_ALERT_TYPES.get(marker[2].toUpperCase()) : undefined;
    if (!marker || !kind) {
      output.push(line);
      continue;
    }

    const indent = marker[1];
    output.push(`${indent}:::{${kind}}`);
    let cursor = index + 1;
    while (cursor < lines.length && /^\s*>/u.test(lines[cursor])) {
      output.push(indent + stripQuote(lines[cursor]));
      cursor += 1;
    }
    if (cursor < lines.length && lines[cursor].trim() === "") {
      output.push(`${indent}:::`);
    } else {
      output.push(`${indent}:::`, "");
      cursor -= 1;
    }
    index = cursor;
  }

  return output.join("\n");
}

const CITE_PATTERN = /\{cite\}/u;
const BIBLIOGRAPHY_DIRECTIVE = /```\{bibliography\}/u;

/**
 * Appends a `{bibliography}` directive so staged-build citations resolve.
 *
 * NOTE: this transform belongs to the legacy staged-Sphinx path (snapshotWorkspace →
 * sphinxBuild), which is not wired into the live preview. The live path renders
 * in-process (renderPipeline → renderMyst) and deliberately degrades `{cite}` to an
 * unresolved placeholder — see mystRenderer's BUILD_ONLY_TYPES. This function exists so
 * the committed snapshotWorkspace.ts compiles and stays correct if the staged path is
 * reactivated; it must not be relied upon by the live preview.
 *
 * The book keeps its bibliography in a dedicated references chapter. When the staged
 * source cites something and carries no bibliography of its own, a directive is
 * appended after the content — never inside it — so line numbers of the original
 * document are untouched and the source map stays valid.
 */
export function appendPreviewBibliography(text: string): string {
  if (!CITE_PATTERN.test(text) || BIBLIOGRAPHY_DIRECTIVE.test(text)) {
    return text;
  }
  const separator = text.endsWith("\n") ? "\n" : "\n\n";
  return `${text}${separator}# Bibliography\n\n\`\`\`{bibliography}\n\`\`\`\n`;
}
import * as path from "node:path";

export const REPOSITORY_URL = "https://github.com/gsemet/markdown-okf-schema-studio";

export function outputPathForMarkdown(relativeSource: string): string {
  if (relativeSource === "README.md") return "index.html";
  if (relativeSource === "CONTRIBUTING.md") return "contributing.html";
  return relativeSource.replace(/\.md$/u, ".html");
}

export function isAbsoluteUrl(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(value);
}

export function relativeSitePath(fromPage: string, target: string): string {
  if (isAbsoluteUrl(target)) return target;
  const relative = path.posix.relative(path.posix.dirname(fromPage), target);
  return relative || path.posix.basename(target);
}

function publishedTargetForSource(sourceTarget: string): string {
  if (sourceTarget === "out/reports") return "reports";
  if (sourceTarget.startsWith("out/reports/")) return sourceTarget.slice("out/".length);
  return sourceTarget;
}

export function rewriteLinkTarget(
  currentValue: string,
  sourcePage: string,
  outputPage: string,
  renderedPages: ReadonlySet<string>,
): string {
  if (!currentValue || currentValue.startsWith("#") || isAbsoluteUrl(currentValue)) return currentValue;
  const match = /^([^?#]*)([?#].*)?$/u.exec(currentValue);
  if (!match || !match[1]) return currentValue;

  const sourceTarget = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePage), match[1]));
  let siteTarget = publishedTargetForSource(sourceTarget);
  if (renderedPages.has(sourceTarget)) {
    siteTarget = outputPathForMarkdown(sourceTarget);
  } else if (siteTarget.startsWith("reports/") || siteTarget.startsWith("images/")) {
    // These files are copied verbatim into the Pages tree.
  } else if (/\.md$/u.test(sourceTarget)) {
    siteTarget = `${REPOSITORY_URL}/blob/main/${sourceTarget}`;
  }
  return `${relativeSitePath(outputPage, siteTarget)}${match[2] ?? ""}`;
}

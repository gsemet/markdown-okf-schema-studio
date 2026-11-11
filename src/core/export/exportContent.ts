/**
 * The content rules of the HTML export, applied to the parsed content of the page: sections
 * unfolded, the properties table as a closed `details`, review comments and editing chrome left
 * out, links classified, images embedded. Pure module: no host API, no DOM, no Node built-ins.
 */

import { classifyPreviewReference } from "../navigation/previewNavigation";
import {
  attr,
  childElements,
  detach,
  elementFromHtml,
  hasAttr,
  hasClass,
  removeAttr,
  replaceWith,
  setAttr,
  textOf,
  unwrap,
  walkElements,
  type HtmlElement,
  type HtmlParent,
} from "./exportDom";

/** The elements that never belong in an exported file: controls, scripts and everything that loads. */
const REMOVED_TAGS = new Set([
  "button", "textarea", "select", "script", "link", "iframe", "object", "embed", "base", "frame", "frameset",
]);

/** Classes of review comments and editing chrome. The element goes with its content. */
const REMOVED_CLASSES = [
  "okf-comment", "okf-chip", "okf-comment-body", "sphinx-preview-insert-point", "sphinx-preview-edit-palette",
  "sphinx-preview-link-panel", "okf-fold-toggle",
];

/** Attributes that mark editing chrome. The element goes with its content. */
const REMOVED_BY_ATTRIBUTE = [
  "data-sphinx-preview-block-editor", "data-sphinx-preview-block-editor-host", "data-sphinx-preview-edit-status",
  "data-okf-row-handle", "data-okf-col-handle", "data-okf-frontmatter-editor", "data-okf-frontmatter-menu",
  "data-okf-fold-toggle", "data-okf-comment-kind",
];

/** The comment attributes that only mark text or a block (the text stays; the element goes only if it is a wrapper). */
const COMMENT_MARKS = ["data-okf-comment-thread", "data-okf-comment-resolved", "data-okf-comment-badged", "data-okf-comment-badge-after"];

/** `data-sphinx-preview-*` attributes the CSS needs: the frozen breakout of the width mode. */
const KEPT_PREVIEW_ATTRIBUTES = new Set([
  "data-sphinx-preview-wide", "data-sphinx-preview-figure", "data-sphinx-preview-token",
  "data-sphinx-preview-navigation",
]);

const REMOVED_ATTRIBUTES = new Set([
  "contenteditable", "tabindex", "draggable", "spellcheck", "data-line", "data-okf-line", "data-okf-end-line",
  "data-okf-fold", "data-okf-folded", "data-okf-value", "data-okf-value-yaml", "data-okf-enums",
  "data-okf-edit-cell", "data-okf-editable", "data-okf-value-cell", "data-okf-available-keys",
  "data-okf-available-fields",
]);

const REMOVED_ATTRIBUTE_PREFIXES = [
  "data-sphinx-source-", "data-okf-link-", "data-okf-available-", "data-okf-comment", "data-okf-thread",
  "data-myst-checkbox-",
];

/** Attributes that hold a URL: one that points into the host, or runs script, is dropped. */
const URL_ATTRIBUTES = new Set(["src", "href", "srcset", "poster", "data", "xlink:href", "style", "action", "formaction"]);

/** What the content rules report. */
export interface ContentReport {
  /** The targets of the links the export removed, unique, in document order. */
  removedLinks: string[];
  /** How many images could not be embedded. */
  missingImages: number;
  /** The front matter `title`, when the page has a properties table with one. */
  frontmatterTitle: string | undefined;
}

const hasAnyAttribute = (element: HtmlElement, names: readonly string[]): boolean =>
  element.attrs.some((entry) => names.includes(entry.name));

/** The front matter title, read from the value the properties table keeps for its editor. */
function readFrontmatterTitle(root: HtmlParent): string | undefined {
  let title: string | undefined;
  walkElements(root, (element) => {
    if (title !== undefined || attr(element, "data-okf-field") !== "title") return;
    try {
      const value: unknown = JSON.parse(attr(element, "data-okf-value") ?? "null");
      if (typeof value === "string" && value.trim() !== "") title = value.trim();
    } catch {
      // A value that is not JSON gives no title; the first heading stands in.
    }
  });
  return title;
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/** Shows the whole document: a folded section comes back (the file has no fold toggle). */
function unfold(root: HtmlParent): void {
  walkElements(root, (element) => {
    if (hasAttr(element, "data-okf-folded")) removeAttr(element, "hidden");
  });
}

// @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-091
/**
 * The properties section becomes `<details data-okf-properties>`, closed. Its summary is the title
 * (the issue badge becomes text). The Description column stays: the page's toggle state is not copied.
 */
function convertProperties(root: HtmlParent): void {
  walkElements(root, (section) => {
    if (section.tagName !== "section" || !hasAttr(section, "data-okf-properties")) return;
    const title = childElements(section).find((child) => hasClass(child, "okf-properties-title"));
    if (title) {
      walkElements(title, (inner) => {
        if (inner.tagName !== "button") return;
        if (hasAttr(inner, "data-okf-badge")) {
          const badge = elementFromHtml('<span data-okf-badge></span>');
          badge.childNodes = [...inner.childNodes];
          badge.childNodes.forEach((child) => { child.parentNode = badge; });
          replaceWith(inner, [badge]);
        }
      });
      title.tagName = "summary";
      title.nodeName = "summary";
    }
    section.tagName = "details";
    section.nodeName = "details";
    removeAttr(section, "open");
  });
}

/** True for an element of review or editing chrome that goes with its whole content. */
function isChrome(element: HtmlElement): boolean {
  if (REMOVED_TAGS.has(element.tagName)) return true;
  if (REMOVED_CLASSES.some((name) => hasClass(element, name))) return true;
  if (hasAnyAttribute(element, REMOVED_BY_ATTRIBUTE)) return true;
  // Any other comment attribute (popover, badge, compose box, orphan entry, actions) is chrome; a highlight is not.
  return element.attrs.some((entry) => (entry.name.startsWith("data-okf-comment") || entry.name.startsWith("data-okf-thread"))
    && !COMMENT_MARKS.includes(entry.name) && entry.name !== "data-okf-thread-count");
}

function isTabRadio(element: HtmlElement): boolean {
  return element.tagName === "input" && attr(element, "type") === "radio" && hasAttr(element, "data-export-tab");
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-137
/**
 * Leaves out the review comments and the editing chrome: controls, chips, threads, find marks
 * (their text stays), handles, source-mapping attributes and edit-mode attributes. A task-list
 * checkbox stays, disabled.
 */
function removeChrome(root: HtmlParent): void {
  walkElements(root, (element) => {
    if (element.tagName === "input") {
      if (isTabRadio(element)) return;
      if (attr(element, "type") === "checkbox") {
        setAttr(element, "disabled", "");
        stripAttributes(element);
        return;
      }
      detach(element);
      return;
    }
    if (isChrome(element)) {
      detach(element);
      return;
    }
    // A find mark and the highlight of a comment thread are text with a wrapper: the text stays.
    if (element.attrs.some((entry) => entry.name.startsWith("data-sphinx-preview-find"))
      || (["mark", "span"].includes(element.tagName) && hasAnyAttribute(element, COMMENT_MARKS.slice(0, 2)))) {
      unwrap(element);
      return;
    }
    stripAttributes(element);
  });
}

function stripAttributes(element: HtmlElement): void {
  element.attrs = element.attrs.filter((entry) => {
    const name = entry.name;
    if (REMOVED_ATTRIBUTES.has(name)) return false;
    if (REMOVED_ATTRIBUTE_PREFIXES.some((prefix) => name.startsWith(prefix))) return false;
    if (name.startsWith("data-sphinx-preview-")) return KEPT_PREVIEW_ATTRIBUTES.has(name);
    return true;
  });
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-135
/**
 * The links: an external link gets its URL back, an in-page anchor is kept, every other link (a
 * relative path, a wikilink, a blocked target) is unwrapped and its target is reported.
 */
function rewriteLinks(root: HtmlParent, removed: string[]): void {
  walkElements(root, (element) => {
    const request = attr(element, "data-sphinx-preview-navigation");
    if (element.tagName !== "a" || request === undefined) return;
    const reference = classifyPreviewReference(request);
    if (reference.kind === "external" || reference.kind === "anchor") {
      setAttr(element, "href", reference.value);
      removeAttr(element, "data-sphinx-preview-navigation");
      return;
    }
    const target = request.trim();
    if (!removed.includes(target)) removed.push(target);
    unwrap(element);
  });
}

/** The URL of every candidate of a `srcset` value. */
function srcsetCandidates(value: string): { url: string; descriptor: string }[] {
  return value.split(",").map((candidate) => candidate.trim()).filter((candidate) => candidate !== "").map((candidate) => {
    const [url = "", ...rest] = candidate.split(/\s+/u);
    return { url, descriptor: rest.join(" ") };
  });
}

/** The URLs of the `src` and `srcset` of every image under `root` that are not data URIs, unique, in document order. */
export function imageSourcesOf(root: HtmlParent): string[] {
  const sources = new Set<string>();
  walkElements(root, (element) => {
    if (element.tagName !== "img") return;
    const src = attr(element, "src");
    if (src !== undefined && !src.startsWith("data:")) sources.add(src);
    for (const { url } of srcsetCandidates(attr(element, "srcset") ?? "")) {
      if (url !== "" && !url.startsWith("data:")) sources.add(url);
    }
  });
  return [...sources];
}

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-136
/**
 * Every local image becomes a data URI through `imageData`. An image that cannot be embedded loses
 * its `src` and `srcset`, keeps its `alt`, and is counted. A `data:` image (a diagram) is kept as it is.
 */
function embedImages(root: HtmlParent, imageData: (src: string) => string | undefined): number {
  let missing = 0;
  walkElements(root, (element) => {
    if (element.tagName !== "img") return;
    let failed = false;
    const embed = (url: string): string | undefined => {
      if (url.startsWith("data:")) return url;
      const data = imageData(url);
      if (data === undefined) failed = true;
      return data;
    };
    const src = attr(element, "src");
    if (src !== undefined) {
      const data = embed(src);
      if (data === undefined) removeAttr(element, "src");
      else setAttr(element, "src", data);
    }
    const srcset = attr(element, "srcset");
    if (srcset !== undefined) {
      const kept = srcsetCandidates(srcset).flatMap(({ url, descriptor }) => {
        const data = embed(url);
        return data === undefined ? [] : [descriptor === "" ? data : `${data} ${descriptor}`];
      });
      if (kept.length === 0) removeAttr(element, "srcset");
      else setAttr(element, "srcset", kept.join(", "));
    }
    if (failed) missing += 1;
  });
  return missing;
}

/** The last guard: no event attribute, no script URL, no URL that points into the host. */
function guardAttributes(root: HtmlParent): void {
  walkElements(root, (element) => {
    element.attrs = element.attrs.filter((entry) => {
      if (/^on/iu.test(entry.name) || entry.name === "data-sphinx-preview-navigation") return false;
      if (URL_ATTRIBUTES.has(entry.name) && /^\s*javascript:|vscode-(?:webview|resource|cdn)/iu.test(entry.value)) return false;
      return true;
    });
  });
}

/** The text of the first `h1` of the content. */
export function firstHeadingText(root: HtmlParent): string | undefined {
  let text: string | undefined;
  walkElements(root, (element) => {
    if (text === undefined && element.tagName === "h1") {
      const value = textOf(element).replace(/\s+/gu, " ").trim();
      if (value !== "") text = value;
    }
  });
  return text;
}

/**
 * Applies the content rules to `root` (the parsed `main` element and what is in it) in place. The
 * tab sets must already be converted: the radios they created are kept.
 */
export function applyContentRules(
  root: HtmlParent,
  imageData: (src: string) => string | undefined,
): ContentReport {
  const frontmatterTitle = readFrontmatterTitle(root);
  unfold(root);
  convertProperties(root);
  removeChrome(root);
  const removedLinks: string[] = [];
  rewriteLinks(root, removedLinks);
  const missingImages = embedImages(root, imageData);
  guardAttributes(root);
  return { removedLinks, missingImages, frontmatterTitle };
}

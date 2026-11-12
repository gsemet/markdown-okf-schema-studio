import { relativeFolderLink, relativeSitePath } from "./siteLinks";

/** What the requirements pages add to the site header: the History checkbox, the breadcrumb and the controls. */
export interface SiteHeaderExtras {
  /** First in the header, before the brand: the History checkbox and its script. */
  readonly lead?: string;
  /** After the brand, before the links: the breadcrumb. */
  readonly middle?: string;
  /** After the links: the History label and the Search button. */
  readonly trail?: string;
}

/**
 * The Site header, the same on every page: the logo brand then Home, Contributing, How we ship,
 * Gallery and Requirements, all relative to `currentPage` (a path under the site, for example
 * `docs/guide.html`). The requirements pages pass `extras`.
 */
export function siteHeader(currentPage: string, extras: SiteHeaderExtras = {}): string {
  const rootLink = relativeSitePath(currentPage, "index.html");
  const logo = relativeSitePath(currentPage, "images/logo.svg");
  const links: [string, string][] = [
    ["Home", rootLink],
    ["Contributing", relativeSitePath(currentPage, "contributing.html")],
    ["How we ship", relativeSitePath(currentPage, "docs/how-we-ship.html")],
    ["Gallery", relativeSitePath(currentPage, "gallery.html")],
    ["Requirements", relativeFolderLink(currentPage, "requirements")],
  ];
  const nav = links.map(([text, href]) => `<a href="${href}">${text}</a>`).join("");
  return `<header class="top"><div class="in">${extras.lead ?? ""}<a class="site-brand" href="${rootLink}"><img src="${logo}" alt="" width="44" height="44"><strong>Markdown OKF-Schema Studio</strong></a>${extras.middle ?? ""}<nav class="site" aria-label="Site">${nav}</nav>${extras.trail ?? ""}</div></header>`;
}

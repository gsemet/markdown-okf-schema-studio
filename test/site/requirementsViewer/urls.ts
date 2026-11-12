import { REPOSITORY_URL, relativeFolderLink, relativeSitePath } from "../siteLinks";
import type { Requirement, ViewerModel } from "./model";

/** Folder of the viewer inside the site. */
export const VIEWER_DIR = "requirements";

/** `DIAG-015` for `SwRS-MDOKFSTUDIO-DIAG-015`: only a display label, never in a URL. */
export function shortId(id: string): string {
  return id.replace(/^(?:StRS|SwRS)-MDOKFSTUDIO-/u, "");
}

export function areaDir(scope: string): string {
  return `${VIEWER_DIR}/${scope}`;
}

/** Folder of the page of a StRS or a SwRS: under the area of the requirement itself. */
export function requirementDir(requirement: Pick<Requirement, "scope" | "id">): string {
  return `${VIEWER_DIR}/${requirement.scope}/${requirement.id}`;
}

/** Link from the page in folder `fromDir` to the page in folder `toDir`, with a trailing slash. */
export function dirLink(fromDir: string, toDir: string): string {
  return relativeFolderLink(`${fromDir}/index.html`, toDir);
}

/** Link from the page in folder `fromDir` to a file of the viewer folder, for example `viewer.css`. */
export function assetLink(fromDir: string, file: string): string {
  return relativeSitePath(`${fromDir}/index.html`, `${VIEWER_DIR}/${file}`);
}

/** Link from the page in folder `fromDir` to a file of the site, for example `gallery.html`. */
export function siteLink(fromDir: string, file: string): string {
  return relativeSitePath(`${fromDir}/index.html`, file);
}

/** The repository file at the commit of the build. */
export function blobUrl(model: Pick<ViewerModel, "sha">, file: string): string {
  return `${REPOSITORY_URL}/blob/${model.sha}/${file}`;
}

/** Link to the page of an active requirement, or undefined when the id has none (absent or retired). */
export function pageLink(model: ViewerModel, fromDir: string, id: string): string | undefined {
  const requirement = model.byId.get(id);
  return requirement?.active ? dirLink(fromDir, requirementDir(requirement)) : undefined;
}

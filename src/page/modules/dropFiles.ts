/**
 * The pure parts of dropping files from the VS Code Explorer onto the preview (CR 146): reading the
 * dragged addresses from the drag data and choosing the insertion point nearest to the pointer.
 */

/** The slice of a `DataTransfer` the drop reads. */
export interface DropData {
  types?: ArrayLike<string> | null;
  getData?(format: string): string;
}

/** The drag formats VS Code's Explorer offers for the files it drags. */
const URI_LIST = "text/uri-list";
const RESOURCE_URLS = "ResourceURLs";
const MAX_URIS = 50;

/** True when the drag carries file addresses (an Explorer drag), whatever they point to. */
export function carriesFiles(data: DropData | null | undefined): boolean {
  const types = Array.from(data?.types ?? []);
  return types.includes(URI_LIST) || types.includes(RESOURCE_URLS);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-004
/** The `file:` addresses of a drag, in order and without repeats (at most 50); empty for any other drag. */
export function droppedFileUris(data: DropData | null | undefined): string[] {
  if (!data || typeof data.getData !== "function") return [];
  const found: string[] = [];
  const add = (value: unknown): void => {
    if (typeof value === "string" && /^file:/iu.test(value.trim()) && !found.includes(value.trim())) found.push(value.trim());
  };
  const list = data.getData(URI_LIST);
  if (typeof list === "string") list.split(/\r\n|\n|\r/u).filter((line) => !line.startsWith("#")).forEach(add);
  if (found.length === 0) {
    try {
      const urls: unknown = JSON.parse(data.getData(RESOURCE_URLS) || "[]");
      if (Array.isArray(urls)) urls.forEach(add);
    } catch {
      // Not JSON: no files.
    }
  }
  return found.slice(0, MAX_URIS);
}

/** The index of the insertion bar whose line is nearest to `y` (viewport coordinates), or -1 for no bars. */
export function nearestPointIndex(tops: readonly number[], y: number): number {
  let best = -1;
  tops.forEach((top, index) => {
    if (best < 0 || Math.abs(top - y) < Math.abs(tops[best] - y)) best = index;
  });
  return best;
}

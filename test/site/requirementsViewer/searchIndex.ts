import { replacementsOf, type ViewerModel } from "./model";
import { VIEWER_DIR, areaDir, requirementDir, shortId } from "./urls";

/** One entry of the search sheet of the viewer. Links are relative to the `requirements/` folder. */
export interface SearchItem {
  /** Kind: Area, Use case, Behaviour or File. */
  readonly k: "Area" | "Use case" | "Behaviour" | "File";
  /** Text shown. */
  readonly t: string;
  /** Extra text that is searched and shown small. */
  readonly s: string;
  /** Link, relative to the `requirements/` folder. */
  readonly h: string;
  /** Behaviours that carry a file, for the File kind. */
  readonly n?: number;
  /** 1 for a retired requirement: shown only when the History button is on. */
  readonly r?: 1;
}

function fromViewer(folder: string): string {
  return `${folder.slice(VIEWER_DIR.length + 1)}/`;
}

/** The entries of the search sheet: areas, use cases, behaviours, then the files that carry them. */
export function searchIndex(model: ViewerModel): SearchItem[] {
  const items: SearchItem[] = [];
  for (const area of model.areas) items.push({ k: "Area", t: area.title, s: `${area.id} ${area.description}`, h: fromViewer(areaDir(area.id)) });
  const entry = (kind: "Use case" | "Behaviour", requirement: ViewerModel["active"][number]): SearchItem => {
    const area = model.areas.find((candidate) => candidate.id === requirement.scope);
    const label = shortId(requirement.id);
    const s = kind === "Use case" ? `${label} ${area?.title ?? requirement.scope}` : `${label} ${requirement.scope}`;
    if (requirement.active) return { k: kind, t: requirement.title, s, h: fromViewer(requirementDir(requirement)) };
    const replacement = replacementsOf(model, requirement).find((candidate) => candidate.active);
    const h = replacement ? fromViewer(requirementDir(replacement)) : fromViewer(areaDir(requirement.scope));
    return { k: kind, t: requirement.title, s: `${s} ${requirement.lifecycle}`, h, r: 1 };
  };
  const all = [...model.active, ...model.retired];
  for (const kind of ["Use case", "Behaviour"] as const) {
    const tier = kind === "Use case" ? "StRS" : "SwRS";
    for (const requirement of all) if (requirement.tier === tier) items.push(entry(kind, requirement));
  }
  const files = new Map<string, { first: string; count: number; role: string }>();
  for (const behaviour of model.active) {
    if (behaviour.tier !== "SwRS") continue;
    for (const [role, list] of [["code", behaviour.implementedIn], ["test", behaviour.testedIn]] as const) {
      for (const file of list) {
        const known = files.get(file);
        if (known) known.count += 1;
        else files.set(file, { first: fromViewer(requirementDir(behaviour)), count: 1, role });
      }
    }
  }
  for (const [file, info] of [...files].sort(([a], [b]) => a.localeCompare(b))) items.push({ k: "File", t: file, s: info.role, h: info.first, n: info.count });
  return items;
}

/** The content of `requirements/search-index.js`. */
export function searchIndexScript(model: ViewerModel | undefined): string {
  return `window.SEARCH=${JSON.stringify(model ? searchIndex(model) : [])};\n`;
}

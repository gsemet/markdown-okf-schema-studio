/**
 * The MyST `card` and `grid` directives the Card and Grid forms write: the form values, their
 * validation and the text inserted for them (a `{card}`, or a `{grid}` of `{grid-item-card}`s).
 */

import { insertBlockAt } from "./editActionHelpers";
import type { EditActionContext } from "./editActions";
import type { TextEdit } from "./textEditing";

/** The values of the Card form; an empty value leaves the option out. */
export interface CardValues {
  title: string;
  header: string;
  footer: string;
  link: string;
}

/** The values of the Grid form: `columns` is 1 to 4 numbers (extra small to large screens). */
export interface GridValues {
  columns: string;
  gutter: string;
  cards: string;
  /** The header, footer and link of each card, one entry per card separated by `|`; empty entries leave the option out. */
  headers?: string;
  footers?: string;
  links?: string;
}

export const DEFAULT_CARD: CardValues = { title: "Title", header: "", footer: "", link: "" };
export const DEFAULT_GRID: GridValues = { columns: "2", gutter: "2", cards: "2", headers: "", footers: "", links: "" };

const MAX_COLUMNS = 12;
const MAX_GUTTER = 5;
const MAX_CARDS = 24;

const PER_CARD_FIELDS = [["headers", "Headers"], ["footers", "Footers"], ["links", "Links"]] as const;

const oneLine = (value: string): string => value.replace(/\s+/gu, " ").trim();

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-271
/** Why the Grid form values cannot be written, or `undefined` when they can. */
export function validateGrid(values: GridValues): string | undefined {
  const columns = oneLine(values.columns).split(" ").filter((part) => part !== "");
  if (columns.length < 1 || columns.length > 4 || !columns.every((part) => /^\d+$/u.test(part)
    && Number(part) >= 1 && Number(part) <= MAX_COLUMNS)) {
    return "Columns: one to four numbers from 1 to " + MAX_COLUMNS + ", for example 1 2 3 3.";
  }
  const gutter = oneLine(values.gutter);
  if (gutter !== "" && !(/^\d+$/u.test(gutter) && Number(gutter) <= MAX_GUTTER)) {
    return "Gutter: a number from 0 to " + MAX_GUTTER + ", or empty.";
  }
  if (!/^\d+$/u.test(oneLine(values.cards)) || Number(values.cards) < 1 || Number(values.cards) > MAX_CARDS) {
    return "Cards: a number from 1 to " + MAX_CARDS + ".";
  }
  for (const [key, label] of PER_CARD_FIELDS) {
    if (perCard(values[key]).length > Number(oneLine(values.cards))) {
      return label + ": more entries than cards (one entry per card, separated by |).";
    }
  }
  return undefined;
}

/** The entries of a per-card field, one per card. */
const perCard = (value: string | undefined): string[] => (value ?? "").trim() === "" ? [] : (value ?? "").split("|");

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-270
/** The `{card}` text and where the body placeholder starts in it. */
export function cardText(values: CardValues): { text: string; bodyAt: number } {
  const title = oneLine(values.title);
  let head = ":::{card}" + (title === "" ? "" : " " + title) + "\n";
  for (const [name, value] of [["header", values.header], ["footer", values.footer], ["link", values.link]]) {
    const clean = oneLine(value);
    if (clean !== "") head += ":" + name + ": " + clean + "\n";
  }
  head += "\n";
  return { text: head + "Content\n:::", bodyAt: head.length };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-271
/**
 * One `{grid-item-card}`: a grid card takes its header and footer from the `^^^` and `+++`
 * separators of its body, as in sphinx-design (only a standalone `{card}` reads `:header:` and
 * `:footer:` options); its link stays an option.
 */
function gridCardText(title: string, header: string, footer: string, link: string): string {
  const [cleanHeader, cleanFooter, cleanLink] = [header, footer, link].map(oneLine);
  return ":::{grid-item-card} " + title + "\n"
    + (cleanLink === "" ? "" : ":link: " + cleanLink + "\n") + "\n"
    + (cleanHeader === "" ? "" : cleanHeader + "\n^^^\n")
    + "Content\n"
    + (cleanFooter === "" ? "" : "+++\n" + cleanFooter + "\n")
    + ":::";
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-271
/** The `{grid}` text, its cards numbered, and where the first card's title starts in it. */
export function gridText(values: GridValues): { text: string; titleAt: number } {
  const gutter = oneLine(values.gutter);
  let text = "::::{grid} " + oneLine(values.columns) + "\n" + (gutter === "" ? "" : ":gutter: " + gutter + "\n");
  const count = Number(values.cards);
  for (let index = 1; index <= count; index += 1) {
    const pick = (value: string | undefined): string => perCard(value)[index - 1] ?? "";
    text += "\n" + gridCardText("Card " + index, pick(values.headers), pick(values.footers), pick(values.links)) + "\n";
  }
  const titleAt = text.indexOf("Card 1");
  return { text: text + "::::", titleAt };
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-270
/** Inserts a card after the selection; the caret selects its body placeholder. */
export function cardEdit(ctx: EditActionContext, values: CardValues): TextEdit {
  const { text, bodyAt } = cardText(values);
  return insertBlockAt(ctx, text, bodyAt, "Content".length);
}

// @implements_req SwRS-MDOKFSTUDIO-PALETTE-271
/** Inserts a grid of cards after the selection; the caret selects the first card's title. */
export function gridEdit(ctx: EditActionContext, values: GridValues): TextEdit {
  const { text, titleAt } = gridText(values);
  return insertBlockAt(ctx, text, titleAt, "Card 1".length);
}

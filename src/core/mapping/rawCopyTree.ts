/**
 * Reads one edge of a selection of the rendered page into a {@link RawCopyEdge}: the mapped
 * elements around it, the rendered text of the innermost one and the edge's place in that text.
 * The tree is read through an adapter, so the page's live DOM and the unit tests' parsed HTML share
 * these rules. Pure module: no DOM and no host API.
 */

import type { ChromeProbe } from "../export/chromeMarks";
import type { RawCopyEdge } from "./rawCopy";
import type { RawCopyFrame } from "./rawCopyEdges";
import { isAtomicBlock, isAtomicInline, isContainerTitle, RAW_COPY_PLACEHOLDER } from "./rawCopyKinds";

/** How to read a tree of nodes (`N`): a DOM `Node`, a parse5 node. */
export interface RawCopyTreeAdapter<N> {
  isText(node: N): boolean;
  /** The text of a text node. */
  data(node: N): string;
  /** The lower-case tag name of an element. */
  tagName(node: N): string;
  hasClass(node: N, name: string): boolean;
  attributeNames(node: N): readonly string[];
  attribute(node: N, name: string): string | null;
  parent(node: N): N | undefined;
  children(node: N): readonly N[];
}

/** A boundary point of a selection: a text offset, or the index of a child in an element. */
export interface RawCopyPoint<N> {
  node: N;
  offset: number;
}

type Side = "start" | "end";

// @implements_req SwRS-MDOKFSTUDIO-BLOCK-276
/** Reads a tree for one selection: the content container and what counts as chrome inside it. */
export class RawCopyTree<N> {
  private readonly order = new Map<N, number>();
  private readonly last = new Map<N, number>();
  private readonly texts: N[] = [];

  constructor(
    private readonly tree: RawCopyTreeAdapter<N>,
    private readonly content: N,
    private readonly chrome: (probe: ChromeProbe) => boolean,
  ) {
    this.number(content, 0);
  }

  private number(node: N, next: number): number {
    this.order.set(node, next);
    let at = next + 1;
    // A text, or an inline construct copied whole, is a place an edge can stand on.
    if ((this.tree.isText(node) ? /\S/u.test(this.tree.data(node)) : isAtomicInline(this.probe(node))) && !this.inChrome(node)) this.texts.push(node);
    for (const child of this.tree.children(node)) at = this.number(child, at);
    this.last.set(node, at - 1);
    return at;
  }

  private probe(node: N): ChromeProbe {
    const { tree } = this;
    return {
      tagName: tree.tagName(node),
      hasClass: (name) => tree.hasClass(node, name),
      attributeNames: () => tree.attributeNames(node),
    };
  }

  private isChrome(node: N): boolean {
    return !this.tree.isText(node) && this.chrome(this.probe(node));
  }

  /** The outermost chrome element holding `node` (or `node` itself), if any. */
  private chromeAncestor(node: N): N | undefined {
    let found: N | undefined;
    for (let current: N | undefined = node; current !== undefined && current !== this.content; current = this.tree.parent(current)) {
      if (this.isChrome(current)) found = current;
    }
    return found;
  }

  private inChrome(node: N): boolean {
    return this.chromeAncestor(node) !== undefined;
  }

  /** Where a point sits in document order: before the node it precedes, or after its container's last descendant. */
  private key(point: RawCopyPoint<N>): number {
    const { node, offset } = point;
    if (this.tree.isText(node)) return this.order.get(node)! + 0.5;
    const child = this.tree.children(node)[offset];
    return child === undefined ? this.last.get(node)! + 0.5 : this.order.get(child)! - 0.5;
  }

  /** The mapped elements around a node, outermost first. */
  private frameElements(node: N): N[] {
    const chain: N[] = [];
    for (let current: N | undefined = node; current !== undefined && current !== this.content; current = this.tree.parent(current)) {
      if (!this.tree.isText(current) && this.tree.attribute(current, "data-sphinx-source-line") !== null) chain.unshift(current);
    }
    return chain;
  }

  private frameOf(element: N): RawCopyFrame {
    const number = (name: string): number => Number(this.tree.attribute(element, name));
    const line = number("data-sphinx-source-line");
    const written = this.tree.attribute(element, "data-sphinx-source-end-line");
    const frontmatter = this.tree.attribute(element, "data-okf-frontmatter-end-line");
    const endLine = frontmatter !== null ? Number(frontmatter) : written === null ? line : number("data-sphinx-source-end-line");
    return { line, endLine, atomic: isAtomicBlock(this.probe(element)) };
  }

  /** The text point an element point stands for: the first text at or after it (start), the last before it (end). */
  private toText(point: RawCopyPoint<N>, side: Side): RawCopyPoint<N> | undefined {
    if (this.tree.isText(point.node)) return point;
    const key = this.key(point);
    if (side === "start") {
      const text = this.texts.find((node) => this.order.get(node)! > key);
      return text === undefined ? undefined : { node: text, offset: 0 };
    }
    const before = this.texts.filter((node) => this.order.get(node)! < key);
    const text = before[before.length - 1];
    return text === undefined ? undefined : { node: text, offset: this.tree.isText(text) ? this.tree.data(text).length : this.tree.children(text).length };
  }

  /** The point moved out of chrome: before the chrome element (start) or after it (end). */
  private outOfChrome(point: RawCopyPoint<N>, side: Side): RawCopyPoint<N> {
    const chrome = this.chromeAncestor(point.node);
    const parent = chrome === undefined ? undefined : this.tree.parent(chrome);
    if (chrome === undefined || parent === undefined) return point;
    const index = this.tree.children(parent).indexOf(chrome);
    return { node: parent, offset: side === "start" ? index : index + 1 };
  }

  /** True when a mapped element lies wholly before (start side) or after (end side) a point. */
  private mappedBeyond(key: number, side: Side): boolean {
    for (const [node, number] of this.order) {
      if (this.tree.isText(node) || this.tree.attribute(node, "data-sphinx-source-line") === null) continue;
      if (side === "start" ? this.last.get(node)! + 0.5 <= key : number - 0.5 >= key) return true;
    }
    return false;
  }

  /** The rendered text of a frame (chrome and titles left out, an atomic inline construct as one placeholder) and a point's offset in it. */
  private textOf(frame: N, point: RawCopyPoint<N>, side: Side): { text: string; offset: number } {
    let text = "";
    let offset = 0;
    const visit = (node: N): void => {
      if (this.tree.isText(node)) {
        if (node === point.node) offset = text.length + point.offset;
        text += this.tree.data(node);
        return;
      }
      if (this.isChrome(node) || isContainerTitle(this.probe(node))) return;
      if (node !== frame && isAtomicInline(this.probe(node))) {
        const inside = node === point.node || this.contains(node, point.node);
        offset = inside && side === "start" ? text.length : offset;
        text += RAW_COPY_PLACEHOLDER;
        offset = inside && side === "end" ? text.length : offset;
        return;
      }
      const children = this.tree.children(node);
      children.forEach((child, index) => {
        if (node === point.node && index === point.offset) offset = text.length;
        visit(child);
      });
      if (node === point.node && point.offset >= children.length) offset = text.length;
    };
    visit(frame);
    return { text, offset };
  }

  private contains(ancestor: N, node: N): boolean {
    for (let current: N | undefined = node; current !== undefined; current = this.tree.parent(current)) {
      if (current === ancestor) return true;
    }
    return false;
  }

  /** The edge of a selection at a point; `side` says whether it opens or closes the selection. */
  edge(rawPoint: RawCopyPoint<N>, side: Side): RawCopyEdge {
    const original = this.outOfChrome(rawPoint, side);
    let point: RawCopyPoint<N> | undefined = original;
    let elements = this.frameElements(point.node);
    if (elements.length === 0 && !this.mappedBeyond(this.key(original), side)) {
      return { frames: [], clamp: side, text: "", offset: 0 };
    }
    point = this.toText(original, side);
    elements = point === undefined ? [] : this.frameElements(point.node);
    // No text on the edge's side of the point: the selection is empty there (start after the end).
    if (point === undefined) return { frames: [], clamp: side === "start" ? "end" : "start", text: "", offset: 0 };
    if (elements.length === 0) return { frames: [], text: "", offset: 0 };
    const frames = elements.map((element) => this.frameOf(element));
    const innermost = elements[elements.length - 1]!;
    // A real Select all ends in the first and last text nodes, not in the container: it is the document's own side.
    const extreme = this.atExtreme(point, side) ? { extreme: true } : {};
    if (frames.some((frame) => frame.atomic)) return { frames, ...extreme, text: "", offset: 0 };
    if (this.inTitle(point.node, innermost)) return { frames, opening: true, ...extreme, text: "", offset: 0 };
    return { frames, ...extreme, ...this.textOf(innermost, point, side) };
  }

  /** True when nothing but chrome and whitespace lies before (start side) or after (end side) a text point. */
  private atExtreme(point: RawCopyPoint<N>, side: Side): boolean {
    const edgeText = side === "start" ? this.texts[0] : this.texts[this.texts.length - 1];
    if (edgeText === undefined) return false;
    const { node, offset } = point;
    if (node === edgeText && this.tree.isText(node)) {
      const data = this.tree.data(node);
      return (side === "start" ? data.slice(0, offset) : data.slice(offset)).trim() === "";
    }
    return side === "start"
      ? this.order.get(node)! < this.order.get(edgeText)!
      : this.order.get(node)! > this.last.get(edgeText)!;
  }

  private inTitle(node: N, frame: N): boolean {
    for (let current: N | undefined = node; current !== undefined && current !== frame; current = this.tree.parent(current)) {
      if (!this.tree.isText(current) && isContainerTitle(this.probe(current))) return true;
    }
    return false;
  }
}

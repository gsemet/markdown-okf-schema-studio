/**
 * The links controller: the links the reader follows from the page (Markdown links, wiki links,
 * MyST references, frontmatter links). It resolves them under the navigation rules (inside the
 * workspace, or the document's folder in a read-only preview), answers the page's link discovery,
 * and opens the target: an anchor of the page, another document, or an external URL.
 */

import * as path from "node:path";

import {
  findSchemaDirectory,
  frontmatterLinkIdentity,
  type FrontmatterResult,
} from "../../core/frontmatter/okfFrontmatter";
import { resolveFrontmatterLinkRoots } from "../../core/frontmatter/fileLinks";
import { resourcePathPart } from "../../core/security/resource-policy";
import type { TextRange } from "../../host-api/documentStore";
import { decodePath, markdownFragmentRange, markdownMarkerLine } from "../../core/navigation/previewNavigation";
import type { PageMessageOf } from "../../core/protocol/pageToHost";
import type { PageMessageRouter } from "../pageMessages";
import type { PreviewManager } from "../previewManager";
import type { PreviewSession } from "../previewSession";
import { globLiteral, revisionOfStage } from "../sessionDocuments";
import { lineSelection } from "./history";
import { fireAndForget } from "../../host-api/logger";

// @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-079
/** Folders a link-target search skips: dependencies, VCS data and build output never hold a link target. */
export const DISCOVERY_EXCLUDE = "{**/node_modules/**,**/.git/**,**/_build/**,**/.venv/**,**/venv/**}";
/** A link name matching more files than this is ambiguous long before; the search stops there. */
export const MAX_DISCOVERED_FILES = 50;

/** Links state of one page (owned by the links controller). */
export interface LinkState {
  /** File searches of the wiki links being resolved, by name: one search per name at a time. */
  discoveries?: Map<string, Promise<readonly string[]>>;
}

/** A fresh {@link LinkState}. */
export function createLinkState(): LinkState {
  return {};
}

function cachedFrontmatterLinkCandidate(
  link: NonNullable<FrontmatterResult["linkResults"]>[number],
  filePath: string,
  roots: ReturnType<typeof resolveFrontmatterLinkRoots>,
): string | undefined {
  if (!link.normalizedTarget || !link.resolution || link.resolution === "filename-stem") {
    return undefined;
  }
  const root = link.resolution === "document-relative"
    ? path.dirname(path.resolve(filePath))
    : link.resolution.startsWith("bundle-relative")
      ? roots.bundleRoot
      : roots.projectRoot;
  return root ? path.resolve(root, link.normalizedTarget) : undefined;
}

/** The links the reader follows from the page. */
export class LinkController {
  public constructor(private readonly manager: PreviewManager) {}

  /** Registers the handlers of link requests and link discovery. */
  public register(router: PageMessageRouter): void {
    // @implements_req SwRS-MDOKFSTUDIO-TRUST-006
    router.on("previewLinkDiscover", (message, preview) => {
      fireAndForget(this.manager.host.logger, this.handleDiscovery(preview, message), "handleDiscovery");
    });
    // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-113
    router.on("previewLink", (message, preview) => {
      this.manager.view.recordPreviewState(preview, message);
      if (message.request) {
        return this.handleLink(preview, message.request);
      }
      return undefined;
    });
  }

  // @implements_req SwRS-MDOKFSTUDIO-TRUST-007
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-098
  /** Resolves a link request of the page (a URL, a path, a wiki link or an `okf-link:` identity). */
  public async resolve(preview: PreviewSession, request: string) {
    const { manager } = this;
    const { host, navigator } = manager;
    const stage = preview.stage!;
    const navigationRoots = preview.navigationRoots;
    const analysisRoots = preview.readOnly ? navigationRoots : preview.sessionRoots;
    if (request.startsWith("okf-link:")) {
      try {
        const identity = JSON.parse(decodeURIComponent(request.slice("okf-link:".length))) as {
          fieldPath?: unknown;
          arrayIndex?: unknown;
        };
        const currentDocument = preview.document && preview.document.id === preview.documentUri
          ? preview.document
          : await host.documents.open(host.documents.idOf(stage.activeDocumentPath));
        const currentPath = manager.pathOf(currentDocument);
        const frontmatterState = preview.frontmatter;
        const canReuseResolvedLinks = frontmatterState.result !== undefined
          && frontmatterState.documentUri === currentDocument.id
          && frontmatterState.revision === currentDocument.revision
          && frontmatterState.linkResultsRevision === currentDocument.revision;
        const cachedFrontmatter = canReuseResolvedLinks ? frontmatterState.result : undefined;
        const cachedLink = cachedFrontmatter?.linkResults?.find((candidate) =>
          candidate.fieldPath === identity.fieldPath
          && candidate.arrayIndex === (typeof identity.arrayIndex === "number" ? identity.arrayIndex : undefined));
        const freshFrontmatter = cachedFrontmatter && cachedLink?.resolution !== "filename-stem"
          ? cachedFrontmatter
          : manager.frontmatter.analyze(preview, currentPath, currentDocument.getText(), true, analysisRoots);
        if (!canReuseResolvedLinks && preview.documentUri === currentDocument.id) {
          manager.frontmatter.setState(
            preview,
            freshFrontmatter,
            currentDocument.id,
            currentDocument.revision,
            true,
          );
        }
        const link = freshFrontmatter.linkResults?.find((candidate) =>
          candidate.fieldPath === identity.fieldPath
          && candidate.arrayIndex === (typeof identity.arrayIndex === "number" ? identity.arrayIndex : undefined));
        if (!link || link.status !== "valid" || !link.resolvedPath) {
          return {
            kind: "blocked" as const,
            reason: link?.message || "The frontmatter link is unavailable.",
          };
        }
        const suffix = `${link.query ? `?${link.query}` : ""}${link.fragment !== undefined ? `#${link.fragment}` : ""}`;
        const resolvedRoots = resolveFrontmatterLinkRoots({
          filePath: currentPath,
          bundleRoot: preview.frontmatterConfiguration.bundleRoot,
          projectRoot: preview.frontmatterConfiguration.projectRoot,
          workspaceRoots: analysisRoots,
          schemaDirectory: findSchemaDirectory(host.schemaFiles, currentPath, preview.workspaceRoot),
        });
        const candidatePath = cachedFrontmatterLinkCandidate(link, currentPath, resolvedRoots);
        // Read the text before the await below: the marker identity must come from the same snapshot
        // as the link analysis, as it did when the validation was synchronous.
        const currentText = currentDocument.getText();
        const navigation = await navigator.validateResolvedPreviewNavigation(
          candidatePath ?? link.resolvedPath,
          suffix,
          [
            path.dirname(stage.activeDocumentPath),
            ...navigationRoots,
            resolvedRoots.bundleRoot,
            resolvedRoots.projectRoot,
            ...resolvedRoots.filenameRoots,
          ].filter((root): root is string => root !== undefined),
          preview.readOnly ? "the standalone document directory" : "the workspace",
          preview.frontmatterConfiguration.allowOutsideWorkspaceLinks
            && link.resolution === "document-relative",
        );
        if (navigation.kind !== "local" || !link.basenameMarker) return navigation;
        const markerIdentity = frontmatterLinkIdentity(
          currentText,
          currentPath,
          link.idMarker,
        );
        if (!markerIdentity) return navigation;
        let targetSource: string;
        try {
          targetSource = Buffer.from(
            await host.files.readFile(navigation.path),
          ).toString("utf8");
        } catch {
          return navigation;
        }
        const markerLine = markdownMarkerLine(targetSource, link.basenameMarker, markerIdentity);
        return markerLine === undefined ? navigation : { ...navigation, markerLine };
      } catch {
        return { kind: "blocked" as const, reason: "The frontmatter link request is invalid." };
      }
    }
    return navigator.resolvePreviewNavigation(request, stage.activeDocumentPath, preview.workspaceRoot, async (name) => {
      preview.links.discoveries ??= new Map();
      const existing = preview.links.discoveries.get(name);
      if (existing) return existing;
      const literal = globLiteral(name);
      const discovery = Promise.all(navigationRoots.map((root) =>
        host.workspace.findFiles({
          base: root, pattern: `**/${literal}`, exclude: DISCOVERY_EXCLUDE, maxResults: MAX_DISCOVERED_FILES,
        }),
      )).then((pathGroups) => [...new Set(pathGroups.flat())]);
      preview.links.discoveries.set(name, discovery);
      try {
        return await discovery;
      } finally {
        preview.links.discoveries.delete(name);
      }
    }, preview.readOnly ? "the standalone document directory" : "the workspace", navigationRoots);
  }

  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-079
  private async handleDiscovery(preview: PreviewSession, message: PageMessageOf<"previewLinkDiscover">): Promise<void> {
    const { manager } = this;
    try {
      const targets = await Promise.all((message.requests ?? []).map(async (request) => {
        const navigation = await this.resolve(preview, request);
        // The page shows the reason as a tooltip: a missing file names the path of the link.
        return navigation.kind === "blocked" && navigation.reason === "The navigation target is unavailable."
          ? { request, ...navigation, reason: `File not found: ${decodePath(resourcePathPart(request)) ?? request}` }
          : { request, ...navigation };
      }));
      if (!manager.matchesCurrent(preview, message)) return;
      await preview.postToPage({ type: "previewLinkTargets", ...manager.rendering.runtimeContext(preview.stage!), targets });
    } catch (error) {
      if (!preview.disposed) fireAndForget(manager.host.logger, manager.host.ui.showWarning(`Preview link discovery failed: ${String(error)}`), "showWarning");
    }
  }

  // @implements_req SwRS-MDOKFSTUDIO-FMSCHEMA-073
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-059
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-077
  // @implements_req SwRS-MDOKFSTUDIO-BLOCK-205
  // @implements_req SwRS-MDOKFSTUDIO-TOOLBAR-117
  private async handleLink(preview: PreviewSession, request: string): Promise<void> {
    const { manager } = this;
    const { host } = manager;
    // The page posted the save of its open editor before this link: apply it before anything else.
    await manager.edits.settleHostEdits(preview);
    const stage = preview.stage;
    if (!stage || !manager.matchesCurrent(preview, {
      type: "previewLink",
      documentId: stage.activeDocumentIdentity,
      revision: revisionOfStage(stage),
      requestId: stage.requestId,
    })) {
      return;
    }
    let navigation;
    try {
      navigation = await this.resolve(preview, request);
    } catch (error) {
      fireAndForget(host.logger, host.ui.showWarning(`Preview link resolution failed: ${String(error)}`), "showWarning");
      return;
    }
    if (preview.disposed || preview.stage?.activeDocumentIdentity !== stage.activeDocumentIdentity) return;
    if (navigation.kind === "blocked") {
      fireAndForget(host.logger, host.ui.showWarning(`Markdown OKF-Schema Studio could not follow the link: ${navigation.reason}`), "showWarning");
      return;
    }
    if (navigation.kind === "anchor") {
      const activeDocument = preview.document && preview.document.id === preview.documentUri
        ? preview.document
        : undefined;
      const fragmentRange = activeDocument
        ? markdownFragmentRange(activeDocument.getText(), navigation.value)
        : undefined;
      if (fragmentRange) {
        manager.history.recordNavigation(preview, { uri: preview.documentUri, line: fragmentRange.startLine });
      }
      fireAndForget(this.manager.host.logger, preview.postToPage({
        type: "navigateAnchor",
        value: navigation.value,
        ...(fragmentRange ? {
          sourceLine: fragmentRange.startLine,
          sourceEndLine: fragmentRange.endLine,
        } : {}),
        documentId: stage.activeDocumentIdentity,
        revision: revisionOfStage(stage),
        requestId: stage.requestId,
      }), "postToPage");
      return;
    }
    if (navigation.kind === "external") {
      await host.navigation.openExternal(navigation.value);
      return;
    }
    try {
      const targetId = host.documents.idOf(navigation.path);
      let selection: TextRange | undefined;
      if (navigation.markerLine !== undefined) {
        const document = await host.documents.open(targetId);
        const lineIndex = navigation.markerLine - 1;
        if (lineIndex >= 0 && lineIndex < document.lineCount) {
          selection = lineSelection(document, lineIndex, lineIndex);
        }
      } else if (navigation.suffix.includes("#") && /\.md$/iu.test(navigation.path)) {
        const document = await host.documents.open(targetId);
        const range = markdownFragmentRange(document.getText(), navigation.suffix);
        if (range !== undefined) {
          selection = lineSelection(document, range.startLine - 1, range.endLine - 1);
        }
      }
      if (preview.disposed || preview.stage?.activeDocumentIdentity !== stage.activeDocumentIdentity) return;
      if (preview.followsActiveEditor) {
        // A locked preview does not follow the opened file, so only anchor jumps are recorded.
        const opened = await host.documents.open(targetId).then((document) => document, () => undefined);
        if (preview.disposed || preview.stage?.activeDocumentIdentity !== stage.activeDocumentIdentity) return;
        if (opened?.path !== undefined && path.extname(opened.path).toLowerCase() === ".md") {
          manager.history.recordNavigation(preview, { uri: opened.id, line: (selection?.start.line ?? 0) + 1 });
        }
      }
      await host.navigation.showDocument(targetId, selection);
    } catch (error) {
      fireAndForget(host.logger, host.ui.showWarning(
        `Markdown OKF-Schema Studio could not open ${navigation.path}: ${error instanceof Error ? error.message : String(error)}`,
      ), "showWarning");
    }
  }
}

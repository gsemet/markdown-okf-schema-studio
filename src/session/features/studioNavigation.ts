/**
 * Studio's own navigation: whether a link or a history move from a page goes to a Studio tab or to
 * a text editor. The decision reads the session kind, the target and one setting; the host does the
 * opening (`Navigation.showDocumentInStudio` or `showDocument`).
 */

import { settingSection } from "../../core/configuration/settingsRegistry";
import type { HostServices } from "../../host-api/index";
import type { PreviewSession } from "../previewSession";

// @implements_req SwRS-MDOKFSTUDIO-LIFE-182
/**
 * True when navigation from `preview` to `targetPath` shows a Studio tab: the session is an Open
 * With Studio tab (not the side preview), the target is a Markdown file, and
 * `open.markdownFilesInStudio` is on. In every other case a text editor opens, as before.
 */
export function navigatesInStudio(
  host: Pick<HostServices, "settings">,
  preview: PreviewSession,
  targetPath: string | undefined,
): boolean {
  return !preview.followsActiveEditor
    && targetPath !== undefined
    && /\.md$/iu.test(targetPath)
    && host.settings.section(settingSection("open")).get<boolean>("markdownFilesInStudio", false);
}

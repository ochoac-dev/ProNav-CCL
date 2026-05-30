import { describe, expect, it, vi } from "vitest";
import { createDesktopMenuTemplate } from "../src/desktop/menu.js";

describe("desktop menu", () => {
  it("labels the packaged app and exposes folder, view, and help actions", () => {
    const template = createDesktopMenuTemplate({
      openProjectFolder: vi.fn(),
      openGitHub: vi.fn()
    });

    const topLevelLabels = template.map((item) => item.label);
    const fileMenu = template.find((item) => item.label === "File");
    const viewMenu = template.find((item) => item.label === "View");
    const helpMenu = template.find((item) => item.label === "Help");

    expect(topLevelLabels).toContain("ProNav");
    expect(fileMenu?.submenu?.map((item) => item.label)).toContain("Open Project Folder");
    expect(viewMenu?.submenu?.map((item) => item.label)).toContain("Reload");
    expect(helpMenu?.submenu?.map((item) => item.label)).toContain("ProNav on GitHub");
  });
});

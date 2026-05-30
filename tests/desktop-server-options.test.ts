import { describe, expect, it } from "vitest";
import { createDesktopServerOptions, parseDesktopPort } from "../src/desktop/serverOptions.js";

describe("desktop server options", () => {
  it("uses the OS app data folder as the desktop workspace root", () => {
    const options = createDesktopServerOptions({
      appPaths: { getPath: () => "/tmp/pronav-user-data" },
      dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
      port: 0
    });

    expect(options.workspaceRoot).toBe("/tmp/pronav-user-data");
    expect(options.port).toBe(0);
    expect(options.pickFolder).toBeTypeOf("function");
  });

  it("parses valid desktop ports and falls back to ephemeral ports for invalid values", () => {
    expect(parseDesktopPort("4173")).toBe(4173);
    expect(parseDesktopPort("0")).toBe(0);
    expect(parseDesktopPort("not-a-port")).toBe(0);
    expect(parseDesktopPort("70000")).toBe(0);
  });
});

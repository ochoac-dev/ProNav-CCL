import { describe, expect, it } from "vitest";
import { createDesktopFolderPicker } from "../src/desktop/folderPicker.js";

describe("desktop folder picker", () => {
  it("returns null when the native folder dialog is canceled", async () => {
    const picker = createDesktopFolderPicker({
      showOpenDialog: async () => ({ canceled: true, filePaths: [] })
    });

    await expect(picker()).resolves.toBeNull();
  });

  it("returns the selected folder path with trailing slashes normalized", async () => {
    let options: unknown;
    const picker = createDesktopFolderPicker({
      showOpenDialog: async (receivedOptions) => {
        options = receivedOptions;
        return { canceled: false, filePaths: ["/tmp/example-project///"] };
      }
    });

    await expect(picker()).resolves.toBe("/tmp/example-project");
    expect(options).toMatchObject({
      title: "Open Project Folder",
      buttonLabel: "Open Folder",
      properties: ["openDirectory"]
    });
  });
});

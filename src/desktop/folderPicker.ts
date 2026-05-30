export interface DesktopOpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface DesktopDialog {
  showOpenDialog(options: {
    title: string;
    buttonLabel: string;
    properties: Array<"openDirectory">;
  }): Promise<DesktopOpenDialogResult>;
}

export function createDesktopFolderPicker(dialog: DesktopDialog): () => Promise<string | null> {
  return async () => {
    const result = await dialog.showOpenDialog({
      title: "Open Project Folder",
      buttonLabel: "Open Folder",
      properties: ["openDirectory"]
    });

    if (result.canceled) return null;
    const selectedPath = result.filePaths[0];
    return selectedPath ? normalizePickedFolderPath(selectedPath) : null;
  };
}

export function normalizePickedFolderPath(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

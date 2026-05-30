export interface DesktopMenuActions {
  openProjectFolder: () => void;
  openGitHub: () => void;
}

export interface DesktopMenuItem {
  label?: string;
  role?: string;
  type?: "normal" | "separator";
  accelerator?: string;
  submenu?: DesktopMenuItem[];
  click?: () => void;
}

export function createDesktopMenuTemplate(actions: DesktopMenuActions): DesktopMenuItem[] {
  return [
    {
      label: "ProNav",
      submenu: [
        { label: "About ProNav", role: "about" },
        { type: "separator" },
        { label: "Quit ProNav", role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        {
          label: "Open Project Folder",
          accelerator: "CmdOrCtrl+O",
          click: actions.openProjectFolder
        },
        { type: "separator" },
        { label: "Close Window", role: "close" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", role: "reload" },
        { label: "Force Reload", role: "forceReload" },
        { label: "Toggle Developer Tools", role: "toggleDevTools" },
        { type: "separator" },
        { label: "Actual Size", role: "resetZoom" },
        { label: "Zoom In", role: "zoomIn" },
        { label: "Zoom Out", role: "zoomOut" },
        { type: "separator" },
        { label: "Toggle Full Screen", role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "ProNav on GitHub",
          click: actions.openGitHub
        }
      ]
    }
  ];
}

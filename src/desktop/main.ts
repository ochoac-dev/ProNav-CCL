import { app, BrowserWindow, dialog, Menu, shell, type MenuItemConstructorOptions } from "electron";
import { startLocalServer, type LocalServerHandle } from "../server/localServer.js";
import { createDesktopMenuTemplate } from "./menu.js";
import { createDesktopServerOptions } from "./serverOptions.js";

let mainWindow: BrowserWindow | null = null;
let localServer: LocalServerHandle | null = null;
let quitAfterServerClose = false;

async function startDesktopApp(): Promise<void> {
  configureDesktopIdentity();
  localServer = await startLocalServer(
    createDesktopServerOptions({
      appPaths: app,
      dialog: {
        showOpenDialog: (options) => dialog.showOpenDialog(options)
      }
    })
  );

  mainWindow = createMainWindow(localServer.url);
  installDesktopMenu();
  await mainWindow.loadURL(localServer.url);
}

function configureDesktopIdentity(): void {
  app.setName("ProNav");
  if (process.platform === "darwin") {
    app.setAboutPanelOptions({
      applicationName: "ProNav",
      applicationVersion: app.getVersion(),
      copyright: "Copyright © 2026 Carlos Ochoa"
    });
  }
}

function installDesktopMenu(): void {
  const template = createDesktopMenuTemplate({
    openProjectFolder: () => {
      if (!mainWindow) return;
      mainWindow.focus();
      void mainWindow.webContents.executeJavaScript('document.getElementById("open-folder-button")?.click();');
    },
    openGitHub: () => {
      void shell.openExternal("https://github.com/ochoac-dev/ProNav-CCL");
    }
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template as MenuItemConstructorOptions[]));
}

function createMainWindow(localUrl: string): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: "ProNav",
    backgroundColor: "#f7f4ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(localUrl)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.on("closed", () => {
    if (mainWindow === window) mainWindow = null;
  });

  return window;
}

async function closeLocalServer(): Promise<void> {
  const server = localServer;
  localServer = null;
  if (server) await server.close();
}

app.whenReady().then(startDesktopApp).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  app.quit();
});

app.on("activate", () => {
  if (!mainWindow && localServer) {
    mainWindow = createMainWindow(localServer.url);
    void mainWindow.loadURL(localServer.url);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", (event) => {
  if (quitAfterServerClose) return;
  quitAfterServerClose = true;
  event.preventDefault();
  void closeLocalServer().finally(() => app.quit());
});

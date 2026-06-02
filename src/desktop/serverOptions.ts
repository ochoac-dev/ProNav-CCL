import type { LocalServerOptions } from "../server/localServer.js";
import { createDesktopFolderPicker, type DesktopDialog } from "./folderPicker.js";

export interface DesktopAppPaths {
  getAppPath(): string;
  getPath(name: "userData"): string;
}

export interface CreateDesktopServerOptionsInput {
  appPaths: DesktopAppPaths;
  dialog: DesktopDialog;
  port?: number;
}

export function createDesktopServerOptions(input: CreateDesktopServerOptionsInput): LocalServerOptions {
  return {
    port: input.port ?? parseDesktopPort(),
    workspaceRoot: input.appPaths.getPath("userData"),
    staticAssetRoot: input.appPaths.getAppPath(),
    pickFolder: createDesktopFolderPicker(input.dialog)
  };
}

export function parseDesktopPort(value = process.env.PRONAV_DESKTOP_PORT): number {
  const configuredPort = Number.parseInt(value ?? "0", 10);
  return Number.isInteger(configuredPort) && configuredPort >= 0 && configuredPort <= 65535 ? configuredPort : 0;
}

# ProNav Desktop Release Plan

ProNav can run as a local web server or as an Electron desktop app. The desktop app still keeps scans local, writes generated memory/reports inside ProNav app data, and never edits the scanned project.

## Local Inspection Build

Use this when you want to inspect the packaged app folder without making an installer.

```bash
npm run desktop:package
```

This creates an unpacked app under `release/`. It is useful for checking the app icon, app name, menu, and folder picker flow.

## Installer Build

Use this when you want distributable desktop artifacts.

```bash
npm run desktop:dist
```

On macOS, this is configured to produce unsigned `.dmg` and `.zip` artifacts. On Windows, it is configured for NSIS. On Linux, it is configured for AppImage.

## Signing And Notarization

The current repository intentionally keeps macOS signing disabled with `identity: null`, which is fine for local development. Before a public release, add:

- Apple Developer certificate and hardened runtime settings.
- Notarization credentials in the release environment.
- A CI job that runs tests, builds, packages, signs, notarizes, and uploads release artifacts.
- A clean release checklist that verifies the app icon, app name, menu actions, folder picker, scan flow, validation output, and memory/handoff flow.

## Public Release Boundary

V1 desktop packaging is still local-first. It does not call external AI APIs, does not sync repos to a cloud service, and does not write generated files into scanned projects.

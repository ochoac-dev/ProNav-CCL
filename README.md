# ProNav

ProNav is a local-first project navigator for people building software with help from AI coding tools.

It is designed for builders who may not know every framework, folder, command, or backend system in their project yet, but still want to understand what they have built and delegate better tasks to tools like Codex, Claude Code, Cursor, or a future connected coding agent.

## Quick Start

```bash
npm install
npm test
npm run build
npm run pronav -- serve --port 4173
```

Then open `http://127.0.0.1:4173`, choose **Open Folder**, or type the local path to a project you want ProNav to scan.

Generated profiles, reports, app data, and handoff packets are written inside the ProNav workspace under ignored local folders. ProNav should not create, edit, stage, or format files inside the repo being scanned.

## Desktop App

ProNav can also run as an Electron desktop app:

```bash
npm run desktop
```

The desktop app starts the same local ProNav server internally, opens a native app window, and uses the operating system folder picker for **Open Folder**.

In desktop mode, generated ProNav data is stored in the app data folder for your operating system instead of the installed app bundle.

To create an unpacked desktop build for local inspection:

```bash
npm run desktop:package
```

Local inspection builds are unsigned. Signed and notarized public releases will need platform-specific release setup later, such as Apple Developer signing for macOS.

## What ProNav Is For

Most code projects become hard to understand once they grow beyond a few files. A non-coder or early builder might know what they want to create, but not know:

- Which folder controls the app screens.
- Which files are backend or database related.
- Which files are safe to change first.
- Which files should not be touched casually.
- What validation command proves the project still works.
- How to ask an AI coding tool for a focused task instead of a vague request.

ProNav turns a local project folder into a plain-English map.

It scans the selected repo read-only, explains what it finds, and helps the user create smaller, safer, better-scoped tasks for an AI coding assistant.

## What It Does Today

ProNav currently runs as a local web app served on `127.0.0.1`.

From the browser UI, a user can:

- Open or enter a local project folder.
- Scan the project without writing into that project.
- See a beginner-friendly summary of what the project appears to be.
- See likely edit areas such as screens, backend, database, docs, tests, and validation.
- Browse folder cards that explain what each area is for, how safe it is to edit, and what to ask an AI coding tool next.
- See detected project capabilities such as Git, Node, Unity, Supabase, WordPress, or generic code.
- Browse important project documents and preview readable files.
- Generate Markdown reports inside the ProNav workspace.
- Create bounded handoff packets for Codex, Claude Code, Cursor, or copy-paste prompts.
- Run configured validation checks from inside the app.
- Read plain-English explanations of what each validation check catches.
- Expand a validation output dropdown only when they want to inspect stdout and stderr.
- Keep local project memory for scan history, validation results, handoffs, and user notes.

The current scanner supports:

- Generic file, language, folder, manifest, and script detection.
- Git branch, status, recent commits, and redacted remotes.
- Node projects through `package.json`.
- Unity projects through `Assets/` and `ProjectSettings/`.
- Supabase projects through migration and SQL/RPC text scanning.
- WordPress projects through common WordPress roots and config files.
- Project documents from README files, docs folders, Markdown, SQL, JSON, YAML, and other readable text formats.

## What ProNav Does Not Do

ProNav is intentionally conservative.

It does not:

- Edit the scanned target repo.
- Stage or commit target repo changes.
- Execute Supabase SQL.
- Call an external AI API.
- Upload project files to a cloud service.
- Replace a developer, reviewer, or test suite.

The goal is to help users understand, delegate, and validate work more safely.

## Why This Matters

AI coding tools are powerful, but they are easier to misuse when the user cannot clearly explain the project structure or task boundary.

ProNav helps bridge that gap.

Instead of asking an AI tool, "fix my app," a user can ask from a grounded packet:

- Here is the repo.
- Here is the feature area.
- Here are the relevant files.
- Here are the protected paths.
- Here are the checks that need to pass.
- Here is what the user actually wants changed.

That makes AI-assisted work easier to review, easier to validate, and less likely to drift into unrelated files.

## Current Direction

ProNav is moving toward a standalone local app for vibe coders, founders, designers, and builders who want to collaborate with AI coding tools without needing to understand every technical detail first.

The direction is:

1. **Local desktop app**
   Package ProNav with Electron so users can install it on Mac or Windows, open folders with a native picker, and use it without starting a terminal server manually.

2. **Better project translation**
   Improve the plain-English project story so users can quickly answer:
   - What did I build?
   - Where do I change it?
   - What is risky?
   - What should I ask an AI coding tool to do next?

3. **Smarter validation**
   Make validation checks more understandable by explaining what each command catches, showing pass/fail history, and helping users understand failures without reading raw terminal output first.

4. **Deeper AI handoff support**
   Improve task packets for Codex, Claude Code, Cursor, and other local coding tools so each task has clear scope, relevant files, constraints, and proof-of-work checks.

5. **Project memory**
   Let ProNav remember prior scans, project decisions, generated handoffs, validation results, and important notes across sessions.

6. **Safer agent workflows**
   Eventually connect more directly to coding tools while keeping the user in control of scope, validation, and review.

7. **Public templates and profiles**
   Add reusable project profiles for common stacks, including Node apps, Unity games, Supabase backends, WordPress sites, and mixed full-stack projects.

## Design Principles

ProNav is built around a few rules:

- **Local first:** Projects stay on the user's machine.
- **Read-only by default:** Scanning should not modify the selected repo.
- **Plain English first:** Non-coders should understand the project before seeing raw technical maps.
- **Bounded delegation:** AI tasks should include scope, constraints, relevant files, and validation.
- **Validation matters:** A task is not done just because code changed. The user needs proof.
- **No hidden magic:** Generated reports, profiles, app data, and handoffs should be visible files.

## Public Status

ProNav is early and actively evolving.

The current version is best understood as a local project translator and AI handoff assistant. The next major step is turning the localhost app into a packaged desktop experience while continuing to improve project understanding, validation, and safe delegation workflows.

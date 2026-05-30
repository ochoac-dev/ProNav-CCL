import type { ProNavAppData } from "./appData.js";

export function renderAppHtml(profileName = "ProNav", data: ProNavAppData | null = null): string {
  const serializedData = JSON.stringify(data).replace(/</g, "\\u003c");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>ProNav - ${escapeHtml(profileName)}</title>`,
    '  <link rel="stylesheet" href="styles.css">',
    "</head>",
    "<body>",
    '  <div class="app-shell">',
    '    <aside class="sidebar" aria-label="Project navigation">',
    '      <div class="brand-block">',
    '        <div class="brand-mark">P</div>',
    '        <div>',
    '          <h1>ProNav</h1>',
    '          <p>Local AI project command center</p>',
    '        </div>',
    "      </div>",
    '      <nav class="section-nav" aria-label="Sections">',
    '        <button class="nav-button active" type="button" data-section="connect"><span class="nav-icon">+</span><span class="label">Connect Repo</span></button>',
    '        <button class="nav-button" type="button" data-section="overview"><span class="nav-icon">◎</span><span class="label">Understand</span></button>',
    '        <button class="nav-button" type="button" data-section="features"><span class="nav-icon">⌕</span><span class="label">Browse</span></button>',
    '        <button class="nav-button" type="button" data-section="delegate"><span class="nav-icon">↗</span><span class="label">Delegate</span></button>',
    '        <button class="nav-button" type="button" data-section="validation"><span class="nav-icon">✓</span><span class="label">Validate</span></button>',
    '        <button class="nav-button" type="button" data-section="history"><span class="nav-icon">◷</span><span class="label">History</span></button>',
    "      </nav>",
    '      <div class="sidebar-panel">',
    '        <p class="panel-label">Design principle</p>',
    '        <p>Every screen explains what exists, why it matters, and how to hand the next task to an AI coder.</p>',
    "      </div>",
    '      <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false">Dark mode</button>',
    "    </aside>",
    '    <main class="main-surface">',
    '      <section id="connect" class="view-section active connect-wrap" aria-labelledby="entry-title">',
    '        <div class="connect-card">',
    '          <span class="badge blue">Local-first · Read-only scan</span>',
    '          <h2 id="entry-title">Connect a local project</h2>',
    '          <p>Enter a project folder from your computer. ProNav scans it safely, explains what is inside, and helps you create focused tasks for Codex, Claude Code, Cursor, or a copy-paste prompt.</p>',
    '          <form id="repo-form" class="repo-form">',
    '            <label><span>Local repo path</span><input id="repo-path" name="repoPath" type="text" placeholder="/path/to/your/project" autocomplete="off"></label>',
    '            <label><span>Project name, optional</span><input id="project-name" name="name" type="text" placeholder="ProNav" autocomplete="off"></label>',
    '            <div class="connect-actions"><button id="open-folder-button" class="secondary" type="button">Open Folder</button><button id="scan-button" class="primary" type="submit">Scan Project</button></div>',
    "          </form>",
    '          <div id="scan-error" class="error-box" role="alert" hidden></div>',
    '          <div class="safe-strip">✓ ProNav only reads your selected project. It never edits the target repo.</div>',
    "        </div>",
    '        <div class="recent-block">',
    '          <div class="topbar compact">',
    "            <div>",
    '              <p class="eyebrow">Recent projects</p>',
    '              <h2>Open a generated scan</h2>',
    "            </div>",
    "          </div>",
    '          <div id="recent-projects" class="recent-grid"></div>',
    "        </div>",
    "      </section>",
    '      <div id="dashboard" class="dashboard" hidden>',
    '        <section id="overview" class="view-section" aria-labelledby="overview-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="overview-title">Understand</h2>',
    '              <p>ProNav translates the repo into plain language before showing technical details.</p>',
    '              <div id="capability-badges" class="badges"></div>',
    "            </div>",
    '            <div class="repo-pill"><span class="status-dot"></span><span id="sidebar-title">Local Navigator</span></div>',
    "          </div>",
    '          <div class="content-grid hero-grid">',
    '            <section class="big-explain">',
    '              <p class="eyebrow">What this project is</p>',
    '              <div id="vibe-project-story" class="vibe-story"></div>',
    '              <div id="vibe-quick-summary" class="friendly-summary secondary-summary"></div>',
    '              <div class="actions"><button class="ghost" type="button" data-section-jump="features">Browse project</button><button class="primary" type="button" data-section-jump="delegate">Create AI task</button></div>',
    "            </section>",
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Risk Notes</h3><p>Simple watch-outs before delegating work.</p></div><span class="badge green">Read-only</span></div>',
    '              <div id="vibe-risk-notes" class="vibe-list"></div>',
    "            </section>",
    "          </div>",
    '          <div class="content-grid two-column vibe-panels">',
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Where to make changes</h3><p>Beginner-friendly entry points with safety level.</p></div></div>',
    '              <div id="vibe-change-areas" class="vibe-card-grid"></div>',
    "            </section>",
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Good tasks to delegate</h3><p>Click a suggestion to prefill the Delegate screen.</p></div></div>',
    '              <div id="vibe-ai-tasks" class="vibe-card-grid"></div>',
    "            </section>",
    "          </div>",
    '          <div class="content-grid hero-grid secondary-grid">',
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Plain Scan Summary</h3><p>Older scan summary kept for quick reference.</p></div></div>',
    '              <div id="friendly-summary" class="friendly-summary"></div>',
    "            </section>",
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Project Health</h3><p>Git and repo signals before delegating work.</p></div><span class="badge green">Read-only</span></div>',
    '              <div id="git-state" class="list"></div>',
    "            </section>",
    "          </div>",
    '          <div id="metric-grid" class="metric-grid"></div>',
    '          <section class="panel report-panel">',
    '            <div class="card-header"><div><h3>Friendly Folder Map</h3><p>Raw folders translated into human meaning.</p></div><button class="secondary" type="button" data-section-jump="features">Open Browse</button></div>',
    '            <div id="folder-map" class="list"></div>',
    "          </section>",
    '          <div class="content-grid two-column">',
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Code Summary</h3><p>Language counts, top folders, and manifests.</p></div></div>',
    '              <div id="generic-summary" class="file-list"></div>',
    "            </section>",
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Report Files</h3><p>Markdown outputs generated inside ProNav.</p></div></div>',
    '              <div id="report-links" class="button-row packet"></div>',
    "            </section>",
    "          </div>",
    "        </section>",
    '        <section id="features" class="view-section" aria-labelledby="features-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="features-title">Browse Project</h2>',
    '              <p>Use friendly folder cards first, then search features, documents, and systems when you need more detail.</p>',
    "            </div>",
    '            <div id="generated-at" class="repo-pill"></div>',
    "          </div>",
    '          <div class="tabs" role="tablist" aria-label="Explore sections"><button class="tab active explore-tab" type="button" data-section="features">Browse</button><button class="tab explore-tab" type="button" data-section="documents">Documents</button><button class="tab explore-tab" type="button" data-section="backend">Systems</button></div>',
    '          <section class="panel report-panel">',
    '            <div class="card-header"><div><h3>Folder Guide</h3><p>Plain-English map of where to start, where to use care, and what to avoid.</p></div></div>',
    '            <div id="browse-folder-cards" class="vibe-card-grid browse-grid"></div>',
    "          </section>",
    '          <label class="search-field full-search"><span>Search features</span><input id="feature-search" type="search" placeholder="feature, file, keyword, folder"></label>',
    '          <div class="feature-layout">',
    '            <div id="feature-cards" class="feature-list"></div>',
    '            <section class="panel feature-detail">',
    '              <div class="card-header"><div><h3 id="feature-detail-title">Select a feature</h3><p id="feature-detail-description" class="muted"></p></div></div>',
    '              <div id="feature-detail-meta" class="detail-meta packet"></div>',
    '              <div id="feature-file-list" class="file-list packet"></div>',
    "            </section>",
    "          </div>",
    "        </section>",
    '        <section id="documents" class="view-section" aria-labelledby="documents-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="documents-title">Explore Documents</h2>',
    '              <p>Open README, markdown, SQL, JSON, YAML, and text files from the read-only scan.</p>',
    "            </div>",
    "          </div>",
    '          <div class="tabs" role="tablist" aria-label="Explore sections"><button class="tab explore-tab" type="button" data-section="features">Browse</button><button class="tab active explore-tab" type="button" data-section="documents">Documents</button><button class="tab explore-tab" type="button" data-section="backend">Systems</button></div>',
    '          <label class="search-field full-search"><span>Search documents</span><input id="document-search" type="search" placeholder="readme, docs, sql, notes"></label>',
    '          <div class="document-layout">',
    '            <div id="document-list" class="document-list"></div>',
    '            <section class="panel document-preview">',
    '              <div class="card-header"><div><h3 id="document-preview-title">Select a document</h3><p id="document-preview-meta" class="muted"></p></div></div>',
    '              <pre id="document-preview-content" class="document-content"></pre>',
    "            </section>",
    "          </div>",
    "        </section>",
    '        <section id="delegate" class="view-section" aria-labelledby="delegate-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="delegate-title">Delegate</h2>',
    '              <p>Turn a plain-English goal into a focused packet for Codex, Claude Code, Cursor, or copy-paste.</p>',
    "            </div>",
    '            <div class="repo-pill"><span class="status-dot"></span>AI handoff ready</div>',
    "          </div>",
    '          <div class="delegate-layout">',
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Task Builder</h3><p>Guide the task instead of writing a perfect prompt from scratch.</p></div></div>',
    '              <form id="handoff-form" class="handoff-form stepper">',
    '                <label class="step active"><small>Step 1</small><span>Coding app</span><select id="handoff-agent"><option value="codex">Codex</option><option value="claude">Claude Code</option><option value="cursor">Cursor</option><option value="copy">Copy Prompt</option></select></label>',
    '                <label class="step"><small>Step 2</small><span>Task type</span><select id="handoff-task-type"><option value="build-feature">Build feature</option><option value="fix-bug">Fix bug</option><option value="explain-code">Explain code</option><option value="refactor">Refactor</option><option value="write-tests">Write tests</option><option value="review">Review</option></select></label>',
    '                <label class="step"><small>Step 3</small><span>Attach scope</span><input id="handoff-scope" type="text" placeholder="Optional: folder, file, feature, or docs"></label>',
    '                <label class="step"><small>Step 4</small><span>Describe the goal</span><textarea id="handoff-goal" rows="6" placeholder="Describe the task in normal language"></textarea></label>',
    '                <button id="handoff-button" class="primary" type="submit">Generate Handoff</button>',
    "              </form>",
    '              <div id="handoff-error" class="error-box" role="alert" hidden></div>',
    "            </section>",
    '            <section class="panel">',
    '              <div class="card-header"><div><h3>Generated Handoff Packet</h3><p>Readable packet first. Raw prompt second.</p><p id="handoff-meta" class="muted">No handoff generated yet.</p></div><div class="button-row"><a id="handoff-link" class="link-button" href="#" hidden>Open packet</a><button id="copy-handoff-button" class="primary" type="button" hidden>Copy prompt</button></div></div>',
    '              <pre id="handoff-output" class="document-content"></pre>',
    "            </section>",
    "          </div>",
    "        </section>",
    '        <section id="backend" class="view-section" aria-labelledby="backend-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="backend-title">System Map</h2>',
    '              <p>Technical evidence grouped by detected systems and manifests.</p>',
    "            </div>",
    "          </div>",
    '          <div class="tabs" role="tablist" aria-label="Explore sections"><button class="tab explore-tab" type="button" data-section="features">Browse</button><button class="tab explore-tab" type="button" data-section="documents">Documents</button><button class="tab active explore-tab" type="button" data-section="backend">Systems</button></div>',
    '          <div class="content-grid system-grid">',
    '            <section class="panel"><div class="card-header"><div><h3>Node and Manifests</h3><p>Package scripts, frameworks, and root manifests.</p></div></div><div id="node-map" class="file-list packet"></div></section>',
    '            <section class="panel"><div class="card-header"><div><h3>Unity</h3><p>Scenes, prefabs, resources, and SEL folders.</p></div></div><div id="unity-map" class="file-list packet"></div></section>',
    '            <section class="panel"><div class="card-header"><div><h3>Supabase</h3><p>Migrations and likely SQL function names.</p></div></div><div id="supabase-map" class="file-list packet"></div></section>',
    '            <section class="panel"><div class="card-header"><div><h3>WordPress</h3><p>Themes, plugins, and content roots when detected.</p></div></div><div id="wordpress-map" class="file-list packet"></div></section>',
    "          </div>",
    "        </section>",
    '        <section id="validation" class="view-section" aria-labelledby="validation-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="validation-title">Validate</h2>',
    '              <p>Use these checks before trusting AI changes or handing work back.</p>',
    "            </div>",
    "          </div>",
    '          <div class="content-grid two-column">',
    '            <section class="panel"><div class="card-header"><div><h3>Recommended Checks</h3><p>Each command tells the next coding agent how to prove the work.</p></div></div><div id="validation-list" class="file-list packet"></div></section>',
    '            <section class="panel"><div class="card-header"><div><h3>Protected Paths</h3><p>These should appear in every generated packet.</p></div></div><div id="protected-list" class="file-list packet"></div></section>',
    "          </div>",
    '          <details id="validation-output-panel" class="panel report-panel validation-output-panel"><summary>Validation Output <span id="validation-meta" class="muted">Run a recommended check, then open this to inspect stdout and stderr.</span></summary><pre id="validation-output" class="document-content validation-output"></pre></details>',
    "        </section>",
    '        <section id="history" class="view-section" aria-labelledby="history-title">',
    '          <div class="topbar">',
    '            <div class="title-block">',
    '              <h2 id="history-title">History</h2>',
    '              <p>Recent generated files and scans stay inside ProNav so the target repo remains untouched.</p>',
    "            </div>",
    "          </div>",
    '          <div class="content-grid two-column">',
    '            <section class="panel"><div class="card-header"><div><h3>Project Memory</h3><p>Scans, validations, handoffs, and notes remembered locally by ProNav.</p></div><button class="secondary" type="button" id="refresh-memory-button">Refresh</button></div><div id="memory-timeline" class="file-list packet"></div></section>',
    '            <section class="panel"><div class="card-header"><div><h3>Remember this about the project</h3><p>Add a local note to make future handoffs more grounded.</p></div></div><form id="memory-note-form" class="handoff-form"><textarea id="memory-note-text" rows="5" placeholder="Example: The settings screen lives in src/app/settings."></textarea><button id="memory-note-button" class="primary" type="submit">Save Note</button></form><div id="memory-note-error" class="error-box" role="alert" hidden></div></section>',
    "          </div>",
    '          <section class="panel"><div class="card-header"><div><h3>Generated Outputs</h3><p>Open reports from the latest scan, then create follow-up handoffs from Delegate.</p></div><button class="secondary" type="button" data-section-jump="connect">Scan another repo</button></div><div id="history-report-links" class="button-row packet"></div></section>',
    "        </section>",
    "      </div>",
    "    </main>",
    "  </div>",
    `  <script id="pronav-data" type="application/json" data-source="data.json">${serializedData}</script>`,
    '  <script src="app.js"></script>',
    "</body>",
    "</html>"
  ].join("\n");
}

export function renderAppStyles(): string {
  return `
:root {
  color-scheme: light;
  --bg: #f4f6fb;
  --panel: #ffffff;
  --panel-soft: #f8faff;
  --text: #111827;
  --muted: #667085;
  --muted-2: #98a2b3;
  --line: #e5e7eb;
  --primary: #315efb;
  --primary-soft: #eef3ff;
  --green: #12b76a;
  --green-soft: #ecfdf3;
  --amber: #f79009;
  --amber-soft: #fffaeb;
  --purple: #7a5af8;
  --purple-soft: #f4f3ff;
  --red: #f04438;
  --red-soft: #fef3f2;
  --danger: #b42318;
  --danger-bg: #fef3f2;
  --shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
  --radius: 18px;
  --radius-sm: 12px;
  --sidebar: 260px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0b1020;
  --panel: #111827;
  --panel-soft: #182033;
  --text: #f8fafc;
  --muted: #a7b0c0;
  --muted-2: #7d89a0;
  --line: #293244;
  --primary: #8ea2ff;
  --primary-soft: #19254b;
  --green: #31d08a;
  --green-soft: #0d3324;
  --amber: #f6b04b;
  --amber-soft: #3d2b12;
  --purple: #b5a6ff;
  --purple-soft: #2b2450;
  --red: #ff8b82;
  --red-soft: #3a1e20;
  --danger: #ffb4ad;
  --danger-bg: #3a1e20;
  --shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--panel-soft), var(--bg) 340px);
  color: var(--text);
}

button,
input,
select,
textarea { font: inherit; }

button,
a,
input,
select,
textarea { min-width: 0; }

h1,
h2,
h3,
p { margin-top: 0; }

h1 { margin: 0; font-size: 19px; line-height: 1; letter-spacing: 0; }
h2 { margin-bottom: 0; font-size: 30px; letter-spacing: 0; }
h3 { margin-bottom: 8px; font-size: 17px; letter-spacing: 0; }
p { line-height: 1.5; }

.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar) minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  border-right: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 82%, transparent);
  backdrop-filter: blur(18px);
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 0;
  height: 100vh;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 18px;
}

.brand-block p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #315efb, #7a5af8);
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow: 0 14px 30px rgba(49, 94, 251, 0.22);
}

.eyebrow,
.panel-label {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

.section-nav {
  display: grid;
  gap: 8px;
}

.nav-button {
  border: 0;
  border-radius: 13px;
  background: transparent;
  color: var(--text);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 14px;
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text) 7%, transparent);
  font-size: 13px;
}

.nav-button:hover,
.nav-button.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
}

.nav-button.active .nav-icon {
  background: var(--panel);
  box-shadow: 0 8px 20px rgba(49, 94, 251, 0.12);
}

.sidebar-panel {
  margin-top: auto;
  padding: 16px;
  border-radius: var(--radius);
  background: #101828;
  color: #ffffff;
  box-shadow: var(--shadow);
  font-size: 13px;
  line-height: 1.45;
}

.sidebar-panel .panel-label { color: rgba(255, 255, 255, 0.64); }
.sidebar-panel p:last-child { margin-bottom: 0; }

.theme-toggle {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  color: var(--text);
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 700;
  justify-content: center;
}

.main-surface {
  padding: 28px;
  overflow: auto;
  max-width: 1440px;
  width: 100%;
}

.connect-card,
.panel,
.metric {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: 0 16px 46px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.connect-wrap {
  max-width: 900px;
  margin: 40px auto;
}

.connect-card {
  padding: 34px;
  border-radius: 28px;
}

.connect-card h2 {
  margin-top: 18px;
  font-size: 34px;
}

.connect-card p {
  color: var(--muted);
  max-width: 660px;
}

.repo-form {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  margin-top: 22px;
}

.connect-actions {
  display: grid;
  grid-template-columns: minmax(160px, 0.45fr) minmax(180px, 1fr);
  gap: 12px;
}

.connect-actions button {
  justify-content: center;
}

.handoff-form {
  display: grid;
  gap: 12px;
}

.repo-form label,
.handoff-form label,
.search-field {
  display: grid;
  gap: 8px;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}

.repo-form input,
.handoff-form input,
.handoff-form select,
.handoff-form textarea,
.search-field input {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel);
  color: var(--text);
  padding: 14px;
  outline: none;
}

.repo-form input:focus,
.handoff-form input:focus,
.handoff-form select:focus,
.handoff-form textarea:focus,
.search-field input:focus {
  border-color: color-mix(in srgb, var(--primary) 60%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent);
}

.handoff-form textarea {
  resize: vertical;
  min-height: 140px;
}

button,
.link-button {
  border: 0;
  border-radius: 12px;
  padding: 11px 14px;
  font-weight: 700;
  cursor: pointer;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.primary {
  background: var(--primary);
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(49, 94, 251, 0.2);
}

.secondary,
.link-button,
.recent-button {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--line);
}

.ghost {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

#scan-button:disabled,
#open-folder-button:disabled,
#handoff-button:disabled { opacity: 0.65; cursor: wait; }

.error-box {
  margin-top: 12px;
  border: 1px solid #f3b0aa;
  border-radius: var(--radius);
  background: var(--danger-bg);
  color: var(--danger);
  padding: 10px 12px;
}

.safe-strip {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px;
  border-radius: 16px;
  background: var(--green-soft);
  color: color-mix(in srgb, var(--green) 72%, #064e3b);
  font-size: 13px;
  font-weight: 700;
}

.recent-block { margin-top: 18px; }

.recent-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.recent-button {
  width: 100%;
  justify-content: flex-start;
  min-height: 68px;
  border-radius: 16px;
}

.dashboard[hidden],
.view-section { display: none; }
.view-section.active { display: block; }

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 22px;
}

.topbar.compact { margin-bottom: 12px; }

.title-block p {
  margin: 8px 0 0;
  color: var(--muted);
  max-width: 780px;
  font-size: 15px;
}

.repo-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 14px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  white-space: nowrap;
  color: var(--muted);
  font-size: 13px;
}

.status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--green) 14%, transparent);
}

.timestamp,
.muted { color: var(--muted); }
.timestamp { font-size: 13px; }

.badge-row,
.badges,
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-row { margin-top: 10px; }

.badge,
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  background: color-mix(in srgb, var(--text) 7%, transparent);
}

.badge.blue,
.pill { background: var(--primary-soft); color: var(--primary); }
.badge.green { background: var(--green-soft); color: color-mix(in srgb, var(--green) 74%, #027a48); }
.badge.amber { background: var(--amber-soft); color: color-mix(in srgb, var(--amber) 70%, #b54708); }
.badge.purple { background: var(--purple-soft); color: var(--purple); }
.badge.red { background: var(--red-soft); color: color-mix(in srgb, var(--red) 72%, #b42318); }

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 18px;
  margin-top: 18px;
  margin-bottom: 18px;
}

.metric {
  padding: 18px;
  min-height: 112px;
}
.metric-value {
  display: block;
  font-size: 26px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}
.metric-label {
  display: block;
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
}

.content-grid {
  display: grid;
  gap: 18px;
}
.two-column { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.hero-grid { grid-template-columns: 1.35fr 0.85fr; }
.system-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.panel { padding: 0; }
.report-panel { margin-top: 14px; }

.card-header {
  padding: 20px 22px 14px;
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-header h3 { margin: 0; }
.card-header p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.big-explain {
  padding: 26px;
  border-radius: 24px;
  color: #ffffff;
  background: linear-gradient(135deg, #101828, #1f2937);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.big-explain .eyebrow {
  color: rgba(255, 255, 255, 0.68);
  margin-bottom: 14px;
}

.big-explain .file-row {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-family: inherit;
  font-size: 15px;
}

.big-explain .file-row:first-child {
  border: 0;
  background: transparent;
  padding: 0;
  color: #ffffff;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
}

.vibe-story {
  font-size: 23px;
  line-height: 1.35;
  font-weight: 800;
  max-width: 900px;
}

.secondary-summary {
  margin-top: 18px;
}

.secondary-summary .file-row {
  font-size: 13px;
}

.big-explain .secondary-summary .file-row:first-child {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  padding: 11px 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.vibe-panels,
.secondary-grid {
  margin-top: 18px;
}

.vibe-card-grid,
.vibe-list {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.vibe-card,
.risk-note {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel-soft);
  padding: 16px;
  display: grid;
  gap: 10px;
}

.task-card {
  align-content: start;
}

.vibe-card-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.vibe-card-title h4 {
  margin: 0;
  font-size: 15px;
  line-height: 1.3;
}

.vibe-card p,
.risk-note p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.vibe-paths {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.path-chip {
  max-width: 100%;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--panel);
  padding: 6px 9px;
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.feature-layout,
.document-layout {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.feature-list,
.document-list,
.file-list {
  display: grid;
  gap: 10px;
}

.feature-card,
.document-card {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
  padding: 18px;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 10px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.04);
}

.feature-card:hover,
.feature-card.active,
.document-card:hover,
.document-card.active {
  border-color: color-mix(in srgb, var(--primary) 60%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent);
}
.feature-card h3,
.document-card h3 { margin-bottom: 0; }

.card-meta,
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  margin-bottom: 18px;
  width: fit-content;
}

.tab {
  padding: 9px 13px;
  border-radius: 11px;
  color: var(--muted);
  cursor: pointer;
  border: 0;
  background: transparent;
}

.tab.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
}

.search-field.full-search {
  margin-bottom: 18px;
}

.search-field input { width: min(520px, 100%); }

.file-row {
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--panel-soft);
  padding: 11px 12px;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  color: var(--text);
}

.validation-command {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.validation-copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.validation-command .file-row {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.validation-description {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.4;
}

.validation-output {
  min-height: 240px;
  max-height: 460px;
  border-radius: 0 0 var(--radius) var(--radius);
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

.validation-output-panel summary {
  cursor: pointer;
  list-style-position: inside;
  padding: 20px 22px;
  border-bottom: 1px solid var(--line);
  font-weight: 800;
}

.validation-output-panel summary .muted {
  display: block;
  margin-top: 6px;
  font-weight: 500;
  line-height: 1.4;
}

.validation-output-panel:not([open]) {
  padding-bottom: 0;
}

.list {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.packet {
  padding: 18px;
}

.document-content {
  min-height: 420px;
  max-height: 70vh;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #101828;
  color: #e5e7eb;
  padding: 16px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}

.document-preview .document-content {
  border-radius: 0 0 var(--radius) var(--radius);
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
}

.delegate-layout {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.stepper {
  padding: 18px;
}

.step {
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  background: var(--panel);
}

.step.active {
  border-color: color-mix(in srgb, var(--primary) 35%, transparent);
  background: var(--primary-soft);
}

.step small {
  color: var(--muted);
  font-weight: 700;
}

@media (max-width: 1000px) {
  :root { --sidebar: 86px; }
  .sidebar { padding: 16px 10px; }
  .brand-block div:not(.brand-mark),
  .nav-button span.label,
  .sidebar-panel { display: none; }
  .brand-block { justify-content: center; padding-bottom: 18px; }
  .nav-button { justify-content: center; padding: 12px; }
  .theme-toggle {
    width: 54px;
    height: 54px;
    padding: 0;
    border-radius: 50%;
    font-size: 0;
  }
  .theme-toggle::before {
    content: "◐";
    font-size: 16px;
  }
  [data-theme="dark"] .theme-toggle::before { content: "☀"; }
  .two-column,
  .hero-grid,
  .system-grid,
  .feature-layout,
  .document-layout,
  .delegate-layout,
  .repo-form {
    grid-template-columns: 1fr;
  }

  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .topbar { align-items: start; flex-direction: column; }
  .recent-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  :root { --sidebar: 1fr; }
  .app-shell { grid-template-columns: 1fr; }
  .sidebar {
    position: static;
    height: auto;
    padding: 18px;
  }
  .brand-block div:not(.brand-mark) { display: block; }
  .section-nav { grid-template-columns: repeat(3, 1fr); }
  .nav-button span.label { display: none; }
  .main-surface { padding: 18px; }
  .metric-grid { grid-template-columns: 1fr; }
  .connect-actions { grid-template-columns: 1fr; }
  .connect-wrap { margin: 0; }
  .connect-card { padding: 22px; }
  .connect-card h2 { font-size: 28px; }
  .tabs { width: 100%; }
  .tab { flex: 1; justify-content: center; }
}
`.trim();
}

export function renderAppScript(): string {
  return `
const rawData = document.getElementById("pronav-data").textContent;
let appData = JSON.parse(rawData);
let selectedFeatureId = appData?.features?.[0]?.id ?? null;
let selectedDocumentPath = appData?.documents?.files?.[0]?.path ?? null;
let lastHandoffPrompt = "";
let projectMemory = null;
const themeToggle = document.getElementById("theme-toggle");
const openFolderButton = document.getElementById("open-folder-button");

const metricLabels = [
  ["files", "Files"],
  ["scripts", "Scripts"],
  ["scriptTypes", "Script types"],
  ["prefabs", "Prefabs"],
  ["scenes", "Scenes"],
  ["migrations", "Migrations"],
  ["rpcFunctions", "RPC functions"],
  ["features", "Feature areas"],
  ["documents", "Documents"],
  ["dirtyEntries", "Git status entries"]
];

function text(value) {
  return String(value ?? "");
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fileRow(value) {
  return '<div class="file-row">' + escapeHtml(value) + "</div>";
}

function nameFromPath(path) {
  const parts = text(path).replaceAll("\\\\", "/").split("/").filter(Boolean);
  return parts.at(-1) ?? "";
}

function readStoredTheme() {
  try {
    const saved = localStorage.getItem("pronav-theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    return "light";
  }

  return "light";
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  if (themeToggle) {
    themeToggle.textContent = nextTheme === "dark" ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-pressed", nextTheme === "dark" ? "true" : "false");
  }
  try {
    localStorage.setItem("pronav-theme", nextTheme);
  } catch {
    // Local storage can be unavailable in a file preview.
  }
}

function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
}

function primarySection(sectionId) {
  return ["features", "documents", "backend"].includes(sectionId) ? "features" : sectionId;
}

function showSection(sectionId, shouldScroll = true) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  if (sectionId !== "connect" && appData) {
    document.getElementById("dashboard").hidden = false;
  }

  document.querySelectorAll(".view-section").forEach((item) => item.classList.remove("active"));
  target.classList.add("active");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === primarySection(sectionId));
  });
  document.querySelectorAll(".explore-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionId);
  });

  if (shouldScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard(data) {
  appData = data;
  selectedFeatureId = appData.features?.[0]?.id ?? null;
  selectedDocumentPath = appData.documents?.files?.[0]?.path ?? null;
  document.getElementById("dashboard").hidden = false;
  document.getElementById("sidebar-title").textContent = appData.project.name;
  renderMetrics();
  renderOverview();
  renderVibeSummary();
  renderFriendlyProject();
  renderBrowseProject();
  renderFeatureCards();
  renderFeatureDetail();
  renderDocuments();
  renderSystemMap();
  renderValidation();
  loadProjectMemory();
  showSection("overview", false);
}

function renderMetrics() {
  document.getElementById("metric-grid").innerHTML = metricLabels
    .map(([key, label]) => {
      return '<div class="metric"><span class="metric-value">' + escapeHtml(appData.metrics[key] ?? 0) + '</span><span class="metric-label">' + escapeHtml(label) + "</span></div>";
    })
    .join("");
}

function renderOverview() {
  const scriptSummary = appData.generic.scripts ?? { total: appData.metrics.scripts ?? 0, typeCounts: {}, samples: [] };
  document.getElementById("generated-at").textContent = "Generated " + new Date(appData.project.generatedAt).toLocaleString();
  document.getElementById("capability-badges").innerHTML = appData.project.detectedCapabilities
    .map((capability) => '<span class="pill">' + escapeHtml(capability) + "</span>")
    .join("");
  document.getElementById("git-state").innerHTML = [
    fileRow("Repo: " + appData.project.repoRoot),
    fileRow("Type: " + appData.project.type),
    fileRow("Branch: " + appData.git.branch),
    ...(appData.git.status.length ? appData.git.status.map(fileRow) : [fileRow("Git status is clean")])
  ].join("");
  document.getElementById("generic-summary").innerHTML = [
    fileRow("Files scanned: " + appData.generic.totalFiles),
    fileRow("Script files: " + scriptSummary.total),
    ...Object.entries(scriptSummary.typeCounts).slice(0, 12).map(([name, count]) => fileRow("Script type " + name + ": " + count)),
    ...Object.entries(appData.generic.languageCounts).slice(0, 12).map(([name, count]) => fileRow(name + ": " + count)),
    ...scriptSummary.samples.slice(0, 8).map((item) => fileRow("Script sample: " + item)),
    ...appData.generic.topDirectories.slice(0, 8).map((item) => fileRow("Dir " + item.path + ": " + item.count))
  ].join("");
  document.getElementById("report-links").innerHTML = appData.reports
    .map((report) => '<a class="link-button" href="' + encodeURI(report.path) + '">' + escapeHtml(report.label) + "</a>")
    .join("");
  const historyReportLinks = document.getElementById("history-report-links");
  if (historyReportLinks) {
    historyReportLinks.innerHTML = appData.reports
      .map((report) => '<a class="link-button" href="' + encodeURI(report.path) + '">' + escapeHtml(report.label) + "</a>")
      .join("");
  }
}

function renderVibeSummary() {
  const vibe = appData.vibe ?? {
    projectStory: appData.friendly?.plainSummary ?? "ProNav scanned this project and generated a local summary.",
    whereToChange: [],
    askAiNext: [],
    riskNotes: []
  };

  document.getElementById("vibe-project-story").textContent = vibe.projectStory;
  document.getElementById("vibe-quick-summary").innerHTML = [
    fileRow("Read-only local scan. ProNav does not edit the selected project."),
    fileRow("Detected: " + (appData.project.detectedCapabilities.length ? appData.project.detectedCapabilities.join(", ") : appData.project.type))
  ].join("");

  document.getElementById("vibe-change-areas").innerHTML = vibe.whereToChange.length
    ? vibe.whereToChange
        .map((area) => {
          return '<article class="vibe-card"><div class="vibe-card-title"><h4>' + escapeHtml(area.label) + '</h4><span class="badge ' + vibeSafetyClass(area.safety) + '">' + escapeHtml(vibeSafetyLabel(area.safety)) + '</span></div><p>' + escapeHtml(area.description) + '</p><p class="muted">' + escapeHtml(area.reason) + '</p><div class="vibe-paths">' + vibePaths(area.paths) + "</div></article>";
        })
        .join("")
    : '<div class="file-row">No change areas were detected yet.</div>';

  document.getElementById("vibe-ai-tasks").innerHTML = vibe.askAiNext.length
    ? vibe.askAiNext
        .map((task, index) => {
          return '<article class="vibe-card task-card"><div class="vibe-card-title"><h4>' + escapeHtml(task.title) + '</h4><span class="pill">' + escapeHtml(task.taskType) + '</span></div><p>' + escapeHtml(task.goal) + '</p><div class="vibe-paths"><span class="path-chip">' + escapeHtml(task.scope || "whole project") + '</span></div><button class="secondary" type="button" data-vibe-task-index="' + index + '">Use in Delegate</button></article>';
        })
        .join("")
    : '<div class="file-row">No suggested AI tasks were generated yet.</div>';

  document.getElementById("vibe-risk-notes").innerHTML = vibe.riskNotes.length
    ? vibe.riskNotes
        .map((note) => {
          return '<article class="risk-note"><div class="vibe-card-title"><h4>' + escapeHtml(note.label) + '</h4><span class="badge ' + vibeSeverityClass(note.severity) + '">' + escapeHtml(note.severity) + '</span></div><p>' + escapeHtml(note.description) + '</p><div class="vibe-paths">' + vibePaths(note.paths) + "</div></article>";
        })
        .join("")
    : '<div class="file-row">No risk notes were generated yet.</div>';

  document.querySelectorAll("[data-vibe-task-index]").forEach((button) => {
    button.addEventListener("click", () => prefillDelegateFromSuggestion(Number(button.dataset.vibeTaskIndex)));
  });
}

function vibePaths(paths) {
  return paths?.length
    ? paths.slice(0, 6).map((path) => '<span class="path-chip">' + escapeHtml(path) + "</span>").join("")
    : '<span class="path-chip">No specific path</span>';
}

function vibeSafetyClass(safety) {
  if (safety === "good-start") return "green";
  if (safety === "avoid") return "red";
  return "amber";
}

function vibeSafetyLabel(safety) {
  if (safety === "good-start") return "Good start";
  if (safety === "avoid") return "Avoid";
  return "Use care";
}

function vibeSeverityClass(severity) {
  if (severity === "danger") return "red";
  if (severity === "warning") return "amber";
  return "green";
}

function prefillDelegateFromSuggestion(index) {
  const task = appData?.vibe?.askAiNext?.[index];
  if (!task) return;

  document.getElementById("handoff-task-type").value = task.taskType;
  document.getElementById("handoff-scope").value = task.scope;
  document.getElementById("handoff-goal").value = task.goal;
  document.getElementById("handoff-meta").textContent = "Prefilled from suggested task: " + task.title;
  showSection("delegate");
  document.getElementById("handoff-goal").focus();
}

function renderFriendlyProject() {
  const summary = appData.friendly;
  document.getElementById("friendly-summary").innerHTML = [
    fileRow(summary.headline),
    fileRow(summary.plainSummary),
    ...summary.keyAreas.map((area) => fileRow(area.label + ": " + area.description + (area.paths.length ? " | " + area.paths.join(", ") : ""))),
    ...summary.nextSteps.map((step) => fileRow("Next: " + step))
  ].join("");
  document.getElementById("folder-map").innerHTML = appData.folders.length
    ? appData.folders.map((folder) => fileRow(folder.label + " (" + folder.path + "): " + folder.description + " | " + folder.fileCount + " files")).join("")
    : fileRow("No folder summary available yet.");
}

function renderFeatureCards() {
  const query = document.getElementById("feature-search").value.trim().toLowerCase();
  const features = appData.features.filter((feature) => {
    const haystack = [feature.title, feature.description, ...feature.files.map((file) => file.path + " " + file.matchedKeywords.join(" "))].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  document.getElementById("feature-cards").innerHTML = features
    .map((feature) => {
      const active = feature.id === selectedFeatureId ? " active" : "";
      return '<button type="button" class="feature-card' + active + '" data-feature-id="' + escapeHtml(feature.id) + '"><h3>' + escapeHtml(feature.title) + '</h3><p class="muted">' + escapeHtml(feature.description) + '</p><div class="card-meta"><span class="pill">' + feature.highSignalFiles + ' files</span><span class="pill">' + feature.totalCandidates + ' scanned</span></div></button>';
    })
    .join("");

  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedFeatureId = card.dataset.featureId;
      renderFeatureCards();
      renderFeatureDetail();
    });
  });
}

function renderFeatureDetail() {
  const feature = appData.features.find((item) => item.id === selectedFeatureId) ?? appData.features[0];
  if (!feature) return;
  document.getElementById("feature-detail-title").textContent = feature.title;
  document.getElementById("feature-detail-description").textContent = feature.description;
  document.getElementById("feature-detail-meta").innerHTML = '<span class="pill">' + feature.highSignalFiles + ' high-signal files</span><span class="pill">' + feature.totalCandidates + ' candidates</span>';
  document.getElementById("feature-file-list").innerHTML = feature.files.length
    ? feature.files.map((file) => fileRow(file.path + " | score " + file.score + " | " + file.matchedKeywords.join(", "))).join("")
    : fileRow("No high-signal files matched this feature profile.");
}

function renderBrowseProject() {
  const folders = appData.browse?.folders?.length
    ? appData.browse.folders
    : appData.folders.map((folder) => ({
        path: folder.path,
        label: folder.label,
        category: "other",
        safety: "use-care",
        description: folder.description,
        reason: "This folder was found in the read-only scan.",
        nextAction: "Ask an AI assistant to explain this folder before changing it.",
        fileCount: folder.fileCount
      }));

  document.getElementById("browse-folder-cards").innerHTML = folders.length
    ? folders
        .map((folder, index) => {
          return '<article class="vibe-card browse-card"><div class="vibe-card-title"><h4>' + escapeHtml(folder.label || folder.path) + '</h4><span class="badge ' + vibeSafetyClass(folder.safety) + '">' + escapeHtml(vibeSafetyLabel(folder.safety)) + '</span></div><p>' + escapeHtml(folder.description) + '</p><p class="muted">' + escapeHtml(folder.reason || "") + '</p><p class="muted">Next: ' + escapeHtml(folder.nextAction || "Use this as task context.") + '</p><div class="vibe-paths"><span class="path-chip">' + escapeHtml(folder.path) + '</span><span class="path-chip">' + escapeHtml(folder.category) + '</span><span class="path-chip">' + escapeHtml(folder.fileCount ?? 0) + ' files</span></div><button class="secondary" type="button" data-browse-folder-index="' + index + '">Use in Delegate</button></article>';
        })
        .join("")
    : '<div class="file-row">No folder cards are available for this scan yet.</div>';

  document.querySelectorAll("[data-browse-folder-index]").forEach((button) => {
    button.addEventListener("click", () => prefillDelegateFromBrowse(Number(button.dataset.browseFolderIndex)));
  });
}

function prefillDelegateFromBrowse(index) {
  const folders = appData.browse?.folders?.length ? appData.browse.folders : appData.folders;
  const folder = folders?.[index];
  if (!folder) return;

  document.getElementById("handoff-task-type").value = "explain-code";
  document.getElementById("handoff-scope").value = folder.path;
  document.getElementById("handoff-goal").value = "Explain what the " + folder.path + " folder does, which files matter most, what is safe to change, and what validation should run before edits are trusted.";
  document.getElementById("handoff-meta").textContent = "Prefilled from Browse Project: " + (folder.label || folder.path);
  showSection("delegate");
  document.getElementById("handoff-goal").focus();
}

function renderDocuments() {
  const query = document.getElementById("document-search").value.trim().toLowerCase();
  const documents = (appData.documents?.files ?? []).filter((documentFile) => {
    const haystack = [documentFile.path, documentFile.title, documentFile.extension].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  document.getElementById("document-list").innerHTML = documents.length
    ? documents
        .map((documentFile) => {
          const active = documentFile.path === selectedDocumentPath ? " active" : "";
          const previewState = documentFile.previewable ? "Preview" : "Listed only";
          return '<button type="button" class="document-card' + active + '" data-document-path="' + escapeHtml(documentFile.path) + '"><h3>' + escapeHtml(documentFile.title || documentFile.path) + '</h3><p class="muted">' + escapeHtml(documentFile.path) + '</p><div class="card-meta"><span class="pill">' + escapeHtml(documentFile.extension || "file") + '</span><span class="pill">' + formatBytes(documentFile.sizeBytes) + '</span><span class="pill">' + previewState + "</span></div></button>";
        })
        .join("")
    : '<div class="file-row">No documents matched this scan.</div>';

  document.querySelectorAll(".document-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedDocumentPath = card.dataset.documentPath;
      renderDocuments();
      loadDocumentPreview();
    });
  });

  loadDocumentPreview();
}

async function loadDocumentPreview() {
  const documentFile = (appData.documents?.files ?? []).find((item) => item.path === selectedDocumentPath);
  if (!documentFile) {
    document.getElementById("document-preview-title").textContent = "Select a document";
    document.getElementById("document-preview-meta").textContent = "";
    document.getElementById("document-preview-content").textContent = "";
    return;
  }

  document.getElementById("document-preview-title").textContent = documentFile.title || documentFile.path;
  document.getElementById("document-preview-meta").textContent = documentFile.path + " | " + formatBytes(documentFile.sizeBytes);
  if (!documentFile.previewable) {
    document.getElementById("document-preview-content").textContent = "This file is listed but not available for text preview.";
    return;
  }

  document.getElementById("document-preview-content").textContent = "Loading...";
  try {
    const response = await fetch("/api/document?project=" + encodeURIComponent(appData.project.slug) + "&path=" + encodeURIComponent(documentFile.path));
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Document preview failed.");
    document.getElementById("document-preview-content").textContent = body.content + (body.truncated ? "\\n\\n[Preview truncated]" : "");
  } catch (error) {
    document.getElementById("document-preview-content").textContent = error instanceof Error ? error.message : String(error);
  }
}

function formatBytes(value) {
  const bytes = Number(value ?? 0);
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function submitHandoff(event) {
  event.preventDefault();
  const button = document.getElementById("handoff-button");
  const errorBox = document.getElementById("handoff-error");
  const goal = document.getElementById("handoff-goal").value.trim();
  const scope = document.getElementById("handoff-scope").value.trim();
  const agent = document.getElementById("handoff-agent").value;
  const taskType = document.getElementById("handoff-task-type").value;

  errorBox.hidden = true;
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Generating";

  try {
    const response = await fetch("/api/handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: appData.project.slug,
        agent,
        taskType,
        goal,
        scope: scope || undefined
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Handoff generation failed.");
    lastHandoffPrompt = body.prompt;
    document.getElementById("handoff-meta").textContent = "Packet: " + body.path + " | " + body.relevantFiles.length + " files";
    document.getElementById("handoff-output").textContent = body.prompt + "\\n\\n--- Packet Preview ---\\n" + body.markdown;
    const link = document.getElementById("handoff-link");
    link.href = body.path;
    link.hidden = false;
    document.getElementById("copy-handoff-button").hidden = false;
    loadProjectMemory();
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : String(error);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Generate Handoff";
  }
}

async function copyHandoffPrompt() {
  if (!lastHandoffPrompt) return;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(lastHandoffPrompt);
    document.getElementById("handoff-meta").textContent = "Prompt copied.";
  }
}

function renderSystemMap() {
  const scriptSummary = appData.generic.scripts ?? { total: appData.metrics.scripts ?? 0, typeCounts: {}, samples: [] };
  document.getElementById("node-map").innerHTML = [
    fileRow("Package manager: " + (appData.node.packageManager ?? "not detected")),
    ...appData.node.frameworks.map((item) => fileRow("Framework: " + item)),
    ...appData.node.scripts.slice(0, 20).map((item) => fileRow("Script " + item)),
    fileRow("Detected script files: " + scriptSummary.total),
    ...Object.entries(scriptSummary.typeCounts).slice(0, 12).map(([name, count]) => fileRow("Script type " + name + ": " + count)),
    ...scriptSummary.samples.slice(0, 12).map((item) => fileRow("Script file: " + item)),
    ...appData.generic.manifests.slice(0, 25).map((item) => fileRow("Manifest: " + item))
  ].join("");
  document.getElementById("unity-map").innerHTML = [
    fileRow("Unity root: " + (appData.project.unityProjectRoot ?? "not detected")),
    ...appData.unity.scenes.map((item) => fileRow("Scene: " + item)),
    ...appData.unity.selDirectories.map((item) => fileRow("SEL: " + item))
  ].join("");
  document.getElementById("supabase-map").innerHTML = [
    fileRow("Migrations: " + appData.supabase.migrationCount),
    ...appData.supabase.functionNames.slice(0, 80).map((item) => fileRow(item))
  ].join("");
  document.getElementById("wordpress-map").innerHTML = [
    fileRow("wp-config.php: " + (appData.wordpress.hasWpConfig ? "present" : "not detected")),
    ...appData.wordpress.themes.map((item) => fileRow("Theme: " + item)),
    ...appData.wordpress.plugins.map((item) => fileRow("Plugin: " + item))
  ].join("");
}

function renderValidation() {
  const validationList = document.getElementById("validation-list");
  validationList.innerHTML = appData.validationCommands.length
    ? appData.validationCommands
        .map((command, index) => {
          return '<div class="validation-command"><div class="validation-copy"><div class="file-row">' + escapeHtml(command) + '</div><p class="validation-description">' + escapeHtml(describeValidationCommand(command)) + '</p></div><button class="secondary" type="button" data-validation-index="' + index + '">Run</button></div>';
        })
        .join("")
    : fileRow("No validation commands configured.");
  document.getElementById("protected-list").innerHTML = appData.protectedPaths.length
    ? appData.protectedPaths.map(fileRow).join("")
    : fileRow("No protected paths configured.");

  validationList.querySelectorAll("[data-validation-index]").forEach((button) => {
    button.addEventListener("click", () => runValidationCommand(Number(button.dataset.validationIndex), button));
  });
}

function describeValidationCommand(command) {
  const normalized = text(command).toLowerCase();
  if (/npm\\s+(--prefix\\s+\\S+\\s+)?test\\b/.test(normalized) || /npm\\s+(--prefix\\s+\\S+\\s+)?run\\s+test\\b/.test(normalized)) {
    return "Runs the project's automated test suite. Use this to catch broken logic, components, APIs, or expected behavior after a change.";
  }
  if (/npm\\s+(--prefix\\s+\\S+\\s+)?run\\s+build\\b/.test(normalized) || /\\btsc\\b/.test(normalized)) {
    return "Checks whether the project can build successfully. Use this to catch TypeScript, bundling, import, and production build problems.";
  }
  if (/git\\s+-c\\s+\\S+\\s+status\\s+--short/.test(normalized) || /git\\s+status\\s+--short/.test(normalized)) {
    return "Shows changed, staged, or untracked files. Use this to confirm the coding tool did not edit unexpected files.";
  }
  if (/vitest|jest|playwright|cypress/.test(normalized)) {
    return "Runs automated checks for the project. Use this to verify the changed behavior still works.";
  }
  if (/supabase/.test(normalized)) {
    return "Checks Supabase-related project state. Use this before trusting database or backend changes.";
  }
  if (/unity|xcodebuild|dotnet/.test(normalized)) {
    return "Runs a platform-specific build or validation check. Use this to catch project setup or compile problems.";
  }

  return "Runs a project-specific validation command from the generated profile. Use this to collect proof before trusting changes.";
}

async function runValidationCommand(index, button) {
  const output = document.getElementById("validation-output");
  const meta = document.getElementById("validation-meta");
  const command = appData.validationCommands[index] ?? "";
  if (!command) return;

  button.disabled = true;
  button.textContent = "Running";
  meta.textContent = "Running validation command. Click Validation Output to inspect stdout and stderr.";
  output.textContent = "$ " + command + "\\n\\nRunning...";

  try {
    const response = await fetch("/api/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: appData.project.slug,
        commandIndex: index
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Validation failed to start.");

    const status = body.exitCode === 0 ? "Passed" : "Failed";
    meta.textContent = status + " | exit " + body.exitCode + " | " + Math.round((body.durationMs ?? 0) / 1000) + "s" + (body.timedOut ? " | timed out" : "") + ". Click Validation Output to inspect stdout and stderr.";
    output.textContent = formatValidationOutput(body);
    loadProjectMemory();
  } catch (error) {
    meta.textContent = "Validation could not run. Click Validation Output to inspect stdout and stderr.";
    output.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    button.disabled = false;
    button.textContent = "Run";
  }
}

function formatValidationOutput(result) {
  return [
    "$ " + result.command,
    "Exit code: " + result.exitCode,
    result.stdout ? "stdout:\\n" + result.stdout : "stdout: (empty)",
    result.stderr ? "stderr:\\n" + result.stderr : "stderr: (empty)"
  ].join("\\n\\n");
}

async function loadProjectMemory() {
  if (!appData?.project?.slug) return;
  try {
    const response = await fetch("/api/memory?project=" + encodeURIComponent(appData.project.slug));
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Memory load failed.");
    projectMemory = body;
    renderProjectMemory();
  } catch (error) {
    const timeline = document.getElementById("memory-timeline");
    if (timeline) {
      timeline.innerHTML = fileRow(error instanceof Error ? error.message : String(error));
    }
  }
}

function renderProjectMemory() {
  const timeline = document.getElementById("memory-timeline");
  if (!timeline) return;
  const memory = projectMemory ?? { scans: [], validations: [], handoffs: [], notes: [] };
  const entries = [
    ...(memory.notes ?? []).map((note) => ({
      label: "Note",
      when: note.createdAt,
      text: note.text
    })),
    ...(memory.validations ?? []).map((validation) => ({
      label: validation.exitCode === 0 ? "Validation passed" : "Validation failed",
      when: validation.createdAt,
      text: validation.command + " | exit " + validation.exitCode + " | " + Math.round((validation.durationMs ?? 0) / 1000) + "s"
    })),
    ...(memory.handoffs ?? []).map((handoff) => ({
      label: "Handoff",
      when: handoff.createdAt,
      text: handoff.agent + " " + handoff.taskType + " | " + handoff.goal
    })),
    ...(memory.scans ?? []).map((scan) => ({
      label: "Scan",
      when: scan.generatedAt,
      text: scan.projectType + " | " + scan.files + " files | " + scan.documents + " docs | " + scan.dirtyEntries + " git entries"
    }))
  ].sort((a, b) => text(b.when).localeCompare(text(a.when)));

  timeline.innerHTML = entries.length
    ? entries.slice(0, 30).map((entry) => fileRow(entry.label + " · " + formatDateTime(entry.when) + " · " + entry.text)).join("")
    : fileRow("No memory yet. Scan, validate, generate a handoff, or add a note.");
}

async function submitMemoryNote(event) {
  event.preventDefault();
  if (!appData?.project?.slug) return;
  const textArea = document.getElementById("memory-note-text");
  const button = document.getElementById("memory-note-button");
  const errorBox = document.getElementById("memory-note-error");
  const noteText = textArea.value.trim();
  errorBox.hidden = true;
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Saving";

  try {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: appData.project.slug,
        text: noteText
      })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Note save failed.");
    projectMemory = body;
    textArea.value = "";
    renderProjectMemory();
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : String(error);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Save Note";
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString();
}

function bindNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });
  document.querySelectorAll("[data-section-jump], .explore-tab").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.sectionJump || button.dataset.section);
    });
  });
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
  if (openFolderButton) openFolderButton.addEventListener("click", pickLocalFolder);
  document.getElementById("feature-search").addEventListener("input", renderFeatureCards);
  document.getElementById("document-search").addEventListener("input", renderDocuments);
  document.getElementById("handoff-form").addEventListener("submit", submitHandoff);
  document.getElementById("copy-handoff-button").addEventListener("click", copyHandoffPrompt);
  document.getElementById("memory-note-form").addEventListener("submit", submitMemoryNote);
  document.getElementById("refresh-memory-button").addEventListener("click", loadProjectMemory);
}

async function submitRepoScan(event) {
  event.preventDefault();
  const repoPath = document.getElementById("repo-path").value.trim();
  const name = document.getElementById("project-name").value.trim();
  const errorBox = document.getElementById("scan-error");
  const button = document.getElementById("scan-button");
  errorBox.hidden = true;
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "Scanning";

  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath, name: name || undefined })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Scan failed.");
    renderDashboard(body);
    loadRecentProjects();
    loadProjectMemory();
  } catch (error) {
    errorBox.textContent = error instanceof Error ? error.message : String(error);
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Scan Project";
  }
}

async function pickLocalFolder() {
  const errorBox = document.getElementById("scan-error");
  const repoPathInput = document.getElementById("repo-path");
  const projectNameInput = document.getElementById("project-name");
  if (!openFolderButton) return;

  errorBox.hidden = true;
  errorBox.textContent = "";
  openFolderButton.disabled = true;
  openFolderButton.textContent = "Opening...";

  try {
    const response = await fetch("/api/pick-folder", { method: "POST" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Folder picker failed.");
    if (body.canceled) return;
    repoPathInput.value = body.repoPath;
    if (!projectNameInput.value.trim()) {
      projectNameInput.value = nameFromPath(body.repoPath);
    }
  } catch (error) {
    errorBox.textContent =
      (error instanceof Error ? error.message : String(error)) +
      " You can still paste the folder path manually.";
    errorBox.hidden = false;
  } finally {
    openFolderButton.disabled = false;
    openFolderButton.textContent = "Open Folder";
  }
}

async function loadRecentProjects() {
  const container = document.getElementById("recent-projects");
  try {
    const response = await fetch("/api/projects");
    if (!response.ok) throw new Error("No project API");
    const projects = await response.json();
    container.innerHTML = projects.length
      ? projects.map((project) => '<button class="recent-button" type="button" data-path="' + escapeHtml(project.repoRoot) + '" data-name="' + escapeHtml(project.name) + '">' + escapeHtml(project.name) + "</button>").join("")
      : '<span class="muted">No generated projects yet.</span>';
    container.querySelectorAll(".recent-button").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById("repo-path").value = button.dataset.path;
        document.getElementById("project-name").value = button.dataset.name;
      });
    });
  } catch {
    container.innerHTML = '<span class="muted">Run npm run pronav -- serve --port 4173 to scan from the browser.</span>';
  }
}

document.getElementById("repo-form").addEventListener("submit", submitRepoScan);
applyTheme(readStoredTheme());
bindNavigation();
loadRecentProjects();
if (appData) renderDashboard(appData);
`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

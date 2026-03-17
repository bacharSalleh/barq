import { EventBus } from './event-bus.js';
import { Session } from './session.js';

// Extensions
import initThemes from './extensions/themes.js';
import initSearch from './extensions/search.js';
import initPalette from './extensions/command-palette.js';
import initContextMenu from './extensions/context-menu.js';
import initBroadcast from './extensions/broadcast.js';
import initNotifications from './extensions/notifications.js';
import initFontControls from './extensions/font-controls.js';
import initSnippets from './extensions/snippets.js';
import initTabPersistence from './extensions/tab-persistence.js';
import initExport from './extensions/export.js';
import initSelectionCopy from './extensions/selection-copy.js';
import initSplitPanes from './extensions/split-panes.js';
import initTabDrag from './extensions/tab-drag.js';
import initFileDrop from './extensions/file-drop.js';
import initScrollMode from './extensions/scroll-mode.js';
import initFileExplorer from './extensions/file-explorer.js';
import initProfiles from './extensions/profiles.js';
import initGit from './extensions/git-integration.js';
import initSSH from './extensions/ssh-manager.js';
import initCmdHistory from './extensions/command-history.js';
import initProcessWatcher from './extensions/process-watcher.js';
import initQuickOpen from './extensions/quick-open.js';
import initStatusBar from './extensions/status-bar.js';
import initFileViewer from './extensions/file-viewer.js';
import initRunConfigs from './extensions/run-configs.js';
import initEnvViewer from './extensions/env-viewer.js';
import initSmartCmds from './extensions/smart-commands.js';
import initTabGroups from './extensions/tab-groups.js';
import initWorkspaces from './extensions/workspaces.js';
import initTabPinning from './extensions/tab-pinning.js';
import initDiffViewer from './extensions/diff-viewer.js';
import initLogViewer from './extensions/log-viewer.js';
import initRegexTester from './extensions/regex-tester.js';
import initEnvSwitcher from './extensions/env-switcher.js';
import initQuickActions from './extensions/quick-actions.js';
import initStartupScript from './extensions/startup-script.js';
import initJsonViewer from './extensions/json-viewer.js';
import initManViewer from './extensions/man-viewer.js';
import initPerfMonitor from './extensions/perf-monitor.js';
import initPortForward from './extensions/port-forward.js';
import initDevUtils from './extensions/dev-utils.js';
import initCheatsheet from './extensions/cheatsheet.js';
import initCronManager from './extensions/cron-manager.js';
import initDatabaseBrowser from './extensions/database-browser.js';
import initClipboardHistory from './extensions/clipboard-history.js';
import initAliasManager from './extensions/alias-manager.js';
import initMarkdownPreview from './extensions/markdown-preview.js';
import initProcessKiller from './extensions/process-killer.js';
import initColorPicker from './extensions/color-picker.js';
import initModalInput from './extensions/modal-input.js';
import initRecording from './extensions/recording.js';
import initNetworkTools from './extensions/network-tools.js';
import initTimezone from './extensions/timezone-converter.js';
import initScratchpad from './extensions/scratchpad.js';
import initCalculator from './extensions/calculator.js';
import initDockerDashboard from './extensions/docker-dashboard.js';
import initGitGraph from './extensions/git-graph.js';
import initTodoTracker from './extensions/todo-tracker.js';
import initSecretVault from './extensions/secret-vault.js';
import initWelcome from './extensions/welcome.js';
import initErrorHighlight from './extensions/error-highlight.js';
import initQuickSwitch from './extensions/quick-switch.js';
import initCommandTimer from './extensions/command-timer.js';
import initRecentDirs from './extensions/recent-dirs.js';
import initTabContextMenu from './extensions/tab-context-menu.js';
import initProjectDashboard from './extensions/project-dashboard.js';
import initScrollFab from './extensions/scroll-fab.js';
import initClearScreen from './extensions/clear-screen.js';
import initAIContext from './extensions/ai-context.js';
import initAIPrompts from './extensions/ai-prompts.js';
import initAISuggest from './extensions/ai-suggest.js';
import initClaudeEnhance from './extensions/claude-enhance.js';

// ================================================================
// Core context — shared state passed to all extensions
// ================================================================
const bus = new EventBus();
const sessions = [];
let activeSession = null;
let isSelecting = false;

const hiddenInput = document.getElementById("hidden-input");
const container = document.getElementById("terminals-container");
const tabBar = document.getElementById("tab-bar");
const newTabBtn = document.getElementById("new-tab-btn");
const statusEl = document.getElementById("status");

// Char width probe — measures pure character width (no padding)
// Must inherit font from term-line but strip padding for accurate measurement
const probe = document.createElement("span");
probe.className = "term-line";
probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;padding:0;margin:0;border:0;";
probe.textContent = "XXXXXXXXXXXXXXXXXXXX";
container.appendChild(probe);

function calcSize() {
  const cw = probe.offsetWidth / 20 || 8.4;
  const lineHeight = probe.offsetHeight || 20;
  // Subtract term-line horizontal padding (12px * 2) + scrollbar clearance (10px)
  const availableWidth = container.clientWidth - 34;
  return {
    cols: Math.floor(availableWidth / cw) || 120,
    rows: Math.floor(container.clientHeight / lineHeight) || 30,
  };
}

let renderTimer = null;
function scheduleRender() {
  // Don't clear existing timer — let it fire. This prevents infinite
  // deferral during burst output (paste echo would keep resetting the timer).
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    if (isSelecting) return;
    if (activeSession) activeSession.render();
  }, 16); // ~60fps cap
}

function updateStatus() {
  if (!activeSession) { statusEl.textContent = "○"; statusEl.style.color = "#888"; statusEl.title = "no terminal"; return; }
  if (activeSession.ws?.readyState === WebSocket.OPEN) { statusEl.textContent = "●"; statusEl.style.color = "#4e9a06"; statusEl.title = "connected"; }
  else if (!activeSession.alive) { statusEl.textContent = "●"; statusEl.style.color = "#c4a000"; statusEl.title = "disconnected"; }
  else { statusEl.textContent = "◌"; statusEl.style.color = "#888"; statusEl.title = "connecting…"; }
}

const resolveDir = () => "auto";
let globalDir = "ltr";

// Command registry (extensions push to this)
const commands = [];

// Context object passed to every extension
const ctx = {
  bus, sessions, commands, hiddenInput, probe,
  get isSelecting() { return isSelecting; },
  set isSelecting(v) { isSelecting = v; },
  getActive: () => activeSession,
  calcSize, scheduleRender, updateStatus,
  createSession: null, // set below
  switchTo: null,      // set below
};

// ================================================================
// Tab management
// ================================================================
function createSession(cwd) {
  const s = new Session(bus, resolveDir);
  s._initCwd = cwd || null;
  sessions.push(s);
  container.appendChild(s.wrapEl);
  tabBar.insertBefore(s.tabEl, newTabBtn);

  s.tabEl.addEventListener("click", (e) => { if (e.target !== s.tabClose) switchTo(s); });
  s.tabClose.addEventListener("click", () => closeSession(s));

  // Double-click to rename
  s.tabLabel.addEventListener("dblclick", (e) => {
    e.stopPropagation();
    const inp = document.createElement("input");
    inp.type = "text"; inp.value = s.tabLabel.textContent;
    inp.style.cssText = "background:#222;color:#e8e8e8;border:1px solid var(--accent);border-radius:3px;padding:1px 4px;font:inherit;font-size:12px;width:100px;outline:none;";
    s.tabLabel.replaceWith(inp); inp.focus(); inp.select();
    let finished = false;
    const done = () => { if (finished) return; finished = true; const n = inp.value.trim() || "Terminal " + s.id; s.tabLabel.textContent = n; s._customName = n; inp.replaceWith(s.tabLabel); if (ctx.saveTabState) ctx.saveTabState(); };
    inp.addEventListener("blur", done);
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { done(); hiddenInput.focus(); } if (ev.key === "Escape") { inp.value = s.tabLabel.textContent; done(); hiddenInput.focus(); } ev.stopPropagation(); });
  });

  s.connect(s._initCwd);
  switchTo(s);
  if (ctx.saveTabState) ctx.saveTabState();
  return s;
}

function switchTo(s) {
  if (activeSession) { activeSession.wrapEl.classList.remove("active"); activeSession.tabEl.classList.remove("active"); }
  activeSession = s;
  s.wrapEl.classList.add("active"); s.tabEl.classList.add("active");
  s.tabEl.classList.remove("has-activity");
  s.prevHtml.fill("");
  scheduleRender(); updateStatus(); hiddenInput.focus();
  if (s.vt.title) document.title = "barq — " + s.vt.title;
  bus.emit("session:activated", s);
}

function closeSession(s) {
  const idx = sessions.indexOf(s);
  if (idx === -1) return;
  bus.emit("session:destroying", s);
  sessions.splice(idx, 1); s.destroy();
  if (sessions.length === 0) { activeSession = null; updateStatus(); document.title = "barq"; }
  else if (activeSession === s) switchTo(sessions[Math.min(idx, sessions.length - 1)]);
  if (ctx.saveTabState) ctx.saveTabState();
}

ctx.createSession = createSession;
ctx.switchTo = switchTo;

// Wire session events
bus.on("session:output", (s) => { if (s === activeSession) scheduleRender(); });
bus.on("session:connected", updateStatus);
bus.on("session:exited", updateStatus);
bus.on("session:closed", updateStatus);
bus.on("session:error", updateStatus);

// ================================================================
// Core commands
// ================================================================
commands.push(
  { name: "New Tab", key: "Ctrl+Shift+T", action: createSession },
  { name: "Close Tab", key: "Ctrl+Shift+W", action: () => { if (activeSession) closeSession(activeSession); } },
  { name: "Next Tab", key: "Ctrl+Tab", action: () => { const i = sessions.indexOf(activeSession); if (sessions.length > 1) switchTo(sessions[(i+1)%sessions.length]); } },
  { name: "Clear Terminal", key: "", action: () => { if (activeSession) activeSession.sendInput("\x0c"); } },
  { name: "Keyboard Shortcuts", key: "Ctrl+Shift+?", action: () => bus.emit("shortcut:help") },
);

newTabBtn.addEventListener("click", createSession);

// ================================================================
// Keyboard input
// ================================================================
let composing = false;
hiddenInput.addEventListener("compositionstart", () => composing = true);
hiddenInput.addEventListener("compositionend", () => { composing = false; const t = hiddenInput.value; if (t && activeSession) { activeSession.sendInput(t); hiddenInput.value = ""; } });
hiddenInput.addEventListener("input", () => { if (composing || justPasted || isModalActive()) return; const t = hiddenInput.value; if (t && activeSession) { activeSession.sendInput(t); hiddenInput.value = ""; } });

hiddenInput.addEventListener("keydown", (e) => {
  if (!activeSession || isModalActive()) return;
  if (e.ctrlKey && e.shiftKey && e.key === "T") { createSession(); e.preventDefault(); return; }
  if (e.ctrlKey && e.shiftKey && e.key === "W") { closeSession(activeSession); e.preventDefault(); return; }
  if (e.ctrlKey && e.key === "Tab") { const i = sessions.indexOf(activeSession); switchTo(sessions[e.shiftKey ? (i-1+sessions.length)%sessions.length : (i+1)%sessions.length]); e.preventDefault(); return; }

  let h = true;
  switch (e.key) {
    case "Enter": activeSession.sendInput(e.shiftKey ? "\n" : "\r"); break;
    case "Tab": activeSession.sendInput("\t"); break;
    case "Backspace": activeSession.sendInput("\x7f"); break;
    case "Delete": activeSession.sendInput("\x1b[3~"); break;
    case "ArrowUp": activeSession.sendInput("\x1b[A"); break;
    case "ArrowDown": activeSession.sendInput("\x1b[B"); break;
    case "ArrowRight": activeSession.sendInput("\x1b[C"); break;
    case "ArrowLeft": activeSession.sendInput("\x1b[D"); break;
    case "Home": activeSession.sendInput("\x1b[H"); break;
    case "End": activeSession.sendInput("\x1b[F"); break;
    case "PageUp": activeSession.sendInput("\x1b[5~"); break;
    case "PageDown": activeSession.sendInput("\x1b[6~"); break;
    case "Escape": activeSession.sendInput("\x1b"); break;
    default:
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.length === 1) {
        const k = e.key.toLowerCase();
        if (k === "v") return;
        if (e.metaKey && k === "c") return;
        if (k === "=" || k === "+") { bus.emit("shortcut:zoom-in"); break; }
        if (k === "-") { bus.emit("shortcut:zoom-out"); break; }
        if (k === "0") { bus.emit("shortcut:zoom-reset"); break; }
        if (e.ctrlKey) { const code = k.charCodeAt(0) - 96; if (code > 0 && code < 27) activeSession.sendInput(String.fromCharCode(code)); }
      } else h = false;
  }
  if (h) e.preventDefault();
});

// Paste — chunk large pastes to avoid overwhelming the PTY
let justPasted = false;
hiddenInput.addEventListener("paste", (e) => {
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData || {}).getData("text");
  if (!t || !activeSession) return;
  justPasted = true;
  hiddenInput.value = "";

  const bp = activeSession.vt.bracketedPaste;
  const CHUNK = 1024; // send in 1KB chunks

  if (t.length <= CHUNK) {
    // Small paste — send immediately
    activeSession.sendInput(bp ? "\x1b[200~" + t + "\x1b[201~" : t);
  } else {
    // Large paste — chunk it with small delays so PTY can keep up
    if (bp) activeSession.sendInput("\x1b[200~");
    let offset = 0;
    function sendChunk() {
      if (offset >= t.length) {
        if (bp) activeSession.sendInput("\x1b[201~");
        return;
      }
      activeSession.sendInput(t.slice(offset, offset + CHUNK));
      offset += CHUNK;
      setTimeout(sendChunk, 5);
    }
    sendChunk();
  }

  setTimeout(() => { justPasted = false; hiddenInput.focus(); }, 200);
});

// Check if a modal/overlay is currently open and has focus
function isModalActive() {
  const el = document.activeElement;
  return el && (el.closest("[style*='z-index:70']") || el.closest("[style*='z-index: 70']") || el.closest("#palette-overlay.open"));
}

// Global shortcuts
document.addEventListener("keydown", (e) => {
  if (isModalActive()) return; // Don't fire shortcuts when modal is open
  const cs = e.ctrlKey || e.metaKey;
  if (cs && e.shiftKey && e.key === "P") { e.preventDefault(); bus.emit("shortcut:palette"); }
  else if (cs && e.shiftKey && e.key === "F") { e.preventDefault(); bus.emit("shortcut:search"); }
  else if (cs && e.shiftKey && (e.key === "?" || e.key === "/")) { e.preventDefault(); bus.emit("shortcut:help"); }
  else if (cs && e.shiftKey && e.key === "D") { e.preventDefault(); bus.emit("shortcut:split-v"); }
  else if (cs && e.shiftKey && e.key === "E") { e.preventDefault(); bus.emit("shortcut:split-h"); }
  else if (cs && e.shiftKey && e.key === "K") { e.preventDefault(); bus.emit("shortcut:scroll-mode"); }
  else if (cs && e.shiftKey && e.key === "B") { e.preventDefault(); bus.emit("shortcut:file-explorer"); }
  else if (cs && e.shiftKey && e.key === "R") { e.preventDefault(); bus.emit("shortcut:cmd-history"); }
  else if (cs && e.shiftKey && e.key === "A") { e.preventDefault(); bus.emit("shortcut:quick-actions"); }
  else if (cs && e.shiftKey && e.key === "V") { e.preventDefault(); bus.emit("shortcut:clipboard-history"); }
  else if (cs && e.shiftKey && e.key === "N") { e.preventDefault(); bus.emit("shortcut:scratchpad"); }
  else if (cs && e.shiftKey && e.key === "O") { e.preventDefault(); bus.emit("shortcut:quick-open"); }
  else if (cs && e.shiftKey && e.key === "G") { e.preventDefault(); bus.emit("shortcut:recent-dirs"); }
  else if (cs && e.shiftKey && e.key === "I") { e.preventDefault(); bus.emit("shortcut:project-dashboard"); }
  else if (cs && e.shiftKey && e.key === "L") { e.preventDefault(); bus.emit("shortcut:clear-all"); }
});

// Icon toolbar buttons
document.getElementById("explorer-btn")?.addEventListener("click", () => bus.emit("shortcut:file-explorer"));
document.getElementById("palette-btn")?.addEventListener("click", () => bus.emit("shortcut:palette"));
document.getElementById("search-btn-top")?.addEventListener("click", () => bus.emit("shortcut:search"));
document.getElementById("scratch-btn")?.addEventListener("click", () => bus.emit("shortcut:scratchpad"));
document.getElementById("snippets-btn")?.addEventListener("click", () => {
  // Find and run the Prompt Library command
  const cmd = commands.find(c => c.name === "Prompt Library");
  if (cmd) cmd.action();
});
document.getElementById("git-btn")?.addEventListener("click", () => {
  if (ctx.openPalette) ctx.openPalette();
  setTimeout(() => { const pi = document.getElementById("palette-input"); if (pi) { pi.value = "git"; pi.dispatchEvent(new Event("input")); } }, 50);
});
document.getElementById("claude-btn")?.addEventListener("click", () => {
  if (ctx.openPalette) ctx.openPalette();
  setTimeout(() => { const pi = document.getElementById("palette-input"); if (pi) { pi.value = "Claude"; pi.dispatchEvent(new Event("input")); } }, 50);
});

// ================================================================
// Mouse & focus
// ================================================================
container.addEventListener("wheel", (e) => {
  if (!activeSession || !activeSession.vt.isAlt) return;
  e.preventDefault();
  const n = Math.max(1, Math.round(Math.abs(e.deltaY) / 20));
  const k = e.deltaY < 0 ? "\x1b[A" : "\x1b[B";
  for (let i = 0; i < n; i++) activeSession.sendInput(k);
}, { passive: false });

hiddenInput.addEventListener("focus", () => { container.classList.add("focused"); document.getElementById("focus-hint").style.display = "none"; });
hiddenInput.addEventListener("blur", () => {
  container.classList.remove("focused");
  if (isSelecting) return;
  document.getElementById("focus-hint").style.display = "block";
  setTimeout(() => { if (isSelecting || window.getSelection().toString() || isModalActive()) return; if (document.activeElement === document.body) hiddenInput.focus(); }, 100);
});
window.addEventListener("focus", () => { if (!isModalActive()) hiddenInput.focus(); });

// RTL/LTR is always auto — no toggle needed

// Resize
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const s = calcSize(); sessions.forEach(x => x.resize(s.rows, s.cols)); scheduleRender(); }, 500);
});

// ================================================================
// Register extensions (comment out any to disable)
// ================================================================
initThemes(ctx);
initSearch(ctx);
initPalette(ctx);
initContextMenu(ctx);
initBroadcast(ctx);
initNotifications(ctx);
initFontControls(ctx);
initSnippets(ctx);
initTabPersistence(ctx);
initExport(ctx);
initSelectionCopy(ctx);
initSplitPanes(ctx);
initTabDrag(ctx);
initStatusBar(ctx);
initFileViewer(ctx);
initRunConfigs(ctx);
initEnvViewer(ctx);
initSmartCmds(ctx);
initTabGroups(ctx);
initWorkspaces(ctx);
initTabPinning(ctx);
initDiffViewer(ctx);
initLogViewer(ctx);
initRegexTester(ctx);
initEnvSwitcher(ctx);
initQuickActions(ctx);
initStartupScript(ctx);
initJsonViewer(ctx);
initManViewer(ctx);
initPerfMonitor(ctx);
initPortForward(ctx);
initDevUtils(ctx);
initCheatsheet(ctx);
initCronManager(ctx);
initDatabaseBrowser(ctx);
initClipboardHistory(ctx);
initAliasManager(ctx);
initMarkdownPreview(ctx);
initProcessKiller(ctx);
initColorPicker(ctx);
initModalInput(ctx); // must be before extensions that use ctx.modal
initRecording(ctx);
initNetworkTools(ctx);
initTimezone(ctx);
initScratchpad(ctx);
initCalculator(ctx);
initDockerDashboard(ctx);
initGitGraph(ctx);
initTodoTracker(ctx);
initSecretVault(ctx);
initWelcome(ctx);
initErrorHighlight(ctx);
initQuickSwitch(ctx);
initCommandTimer(ctx);
initRecentDirs(ctx);
initTabContextMenu(ctx);
initProjectDashboard(ctx);
initScrollFab(ctx);
initClearScreen(ctx);
initAIContext(ctx);  // must be before ai-prompts
initAIPrompts(ctx);
initAISuggest(ctx);
initClaudeEnhance(ctx);
initFileDrop(ctx);
initScrollMode(ctx);
initFileExplorer(ctx);
initProfiles(ctx);
initGit(ctx);
initSSH(ctx);
initCmdHistory(ctx);
initProcessWatcher(ctx);
initQuickOpen(ctx);

// ================================================================
// Boot
// ================================================================
if (ctx.restoreTabs) ctx.restoreTabs();
else createSession();

// When user returns to the tab, force a fresh render
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && activeSession) {
    activeSession.prevHtml.fill("");
    scheduleRender();
  }
});
setTimeout(() => hiddenInput.focus(), 100);

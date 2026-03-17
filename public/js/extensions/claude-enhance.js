// Claude Code UX enhancements — notifications, state tracking, conversation capture
import { rowToText } from '../renderer.js';

const SPINNER_RE = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
const TOOL_RE = /╭[─┄].*?(Read|Write|Edit|Bash|Search|Fetch|Web Search|Agent|Task|Glob|Grep)/;
const PERMISSION_RE = /Allow|Deny|approve/i;
const PROMPT_RE = /^[>❯]\s*$/;
const WAITING_RE = /What should Claude do/i;

export default function(ctx) {
  // ─── Per-session Claude state ────────────────────────────────────
  const sessionState = new WeakMap();

  function getState(session) {
    if (!sessionState.has(session)) {
      sessionState.set(session, {
        isClaude: false,        // is Claude Code running?
        status: 'idle',         // idle | thinking | tool | permission | waiting
        toolName: null,         // current tool being used
        lastActivity: 0,        // timestamp of last state change
        conversation: [],       // captured lines for persistence
        notifiedDone: false,    // already sent "done" notification?
        permissionShown: false, // already showed permission alert?
      });
    }
    return sessionState.get(session);
  }

  // ─── Detect Claude Code start/stop via alt screen ────────────────
  let prevAlt = new WeakMap();

  function checkAltScreen(session) {
    const wasAlt = prevAlt.get(session) || false;
    const isAlt = session.vt.isAlt;
    prevAlt.set(session, isAlt);

    const state = getState(session);

    // Entered alt screen — might be Claude starting
    if (isAlt && !wasAlt) {
      // We'll confirm it's Claude on the next output parse
      state.conversation = [];
      state.notifiedDone = false;
    }

    // Left alt screen — Claude (or other app) exited
    if (!isAlt && wasAlt && state.isClaude) {
      // Save conversation before state resets
      if (state.conversation.length > 10) {
        saveConversation(session, state);
      }
      state.isClaude = false;
      state.status = 'idle';
      state.toolName = null;
      updateStatusBar(session);
    }
  }

  // ─── Parse current screen to detect Claude state ─────────────────
  function parseScreen(session) {
    const vt = session.vt;
    if (!vt.isAlt) return;

    const state = getState(session);
    const lines = [];
    for (let i = 0; i < vt.rows; i++) {
      lines.push(rowToText(vt.buffer[i]));
    }
    const screenText = lines.join('\n');

    // Detect if this is Claude Code (look for Claude UI patterns)
    if (!state.isClaude) {
      const hasClaude = lines.some(l => TOOL_RE.test(l) || /claude/i.test(l) || SPINNER_RE.test(l));
      if (hasClaude) state.isClaude = true;
      else return;
    }

    // Capture lines for conversation persistence
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && state.conversation[state.conversation.length - 1] !== trimmed) {
        state.conversation.push(trimmed);
        // Cap at 5000 lines
        if (state.conversation.length > 5000) state.conversation.shift();
      }
    }

    // Determine current state
    const prevStatus = state.status;

    if (lines.some(l => SPINNER_RE.test(l) && l.trim().length < 50)) {
      state.status = 'thinking';
      state.notifiedDone = false;
    } else if (lines.some(l => PERMISSION_RE.test(l) && /╭|Allow|Deny/.test(l))) {
      state.status = 'permission';
    } else if (lines.some(l => TOOL_RE.test(l))) {
      const toolLine = lines.find(l => TOOL_RE.test(l));
      const m = toolLine.match(TOOL_RE);
      state.toolName = m ? m[1] : null;
      state.status = 'tool';
    } else if (lines.some(l => PROMPT_RE.test(l.trim()) || WAITING_RE.test(l))) {
      state.status = 'waiting';
    } else {
      // If we were thinking/tool and now there's no spinner/tool, Claude is done
      if (prevStatus === 'thinking' || prevStatus === 'tool') {
        state.status = 'waiting';
      }
    }

    // ─── Notification: Claude finished ───────────────────────────
    if (prevStatus === 'thinking' && state.status === 'waiting' && !state.notifiedDone) {
      state.notifiedDone = true;
      state.lastActivity = Date.now();
      notifyDone(session, state);
    }

    // ─── Notification: permission needed ─────────────────────────
    if (state.status === 'permission' && !state.permissionShown) {
      state.permissionShown = true;
      notifyPermission(session);
    }
    if (state.status !== 'permission') {
      state.permissionShown = false;
    }

    updateStatusBar(session);
  }

  // ─── Browser notification: Claude done ───────────────────────────
  function notifyDone(session, state) {
    // Only notify if tab not focused or session not active
    if (document.hasFocus() && session === ctx.getActive()) return;

    const tabName = session._customName || 'Terminal ' + session.id;

    if (Notification.permission === 'granted') {
      new Notification('barq — Claude finished', {
        body: `${tabName}: Claude is waiting for input`,
        icon: '/favicon.svg',
        tag: 'claude-done-' + session.id,
      });
    }

    // Flash tab
    session.tabEl.classList.add('has-activity');
    if (ctx.toast && session !== ctx.getActive()) {
      ctx.toast('🤖 Claude finished in ' + tabName);
    }
  }

  // ─── Browser notification: permission needed ─────────────────────
  function notifyPermission(session) {
    if (document.hasFocus() && session === ctx.getActive()) return;

    const tabName = session._customName || 'Terminal ' + session.id;

    if (Notification.permission === 'granted') {
      new Notification('barq — Claude needs permission', {
        body: `${tabName}: Claude is waiting for approval`,
        icon: '/favicon.svg',
        tag: 'claude-perm-' + session.id,
        requireInteraction: true,
      });
    }

    // Urgent flash on tab
    session.tabEl.classList.add('has-activity');
    session.tabEl.style.borderBottom = '2px solid #ff6b6b';
    setTimeout(() => session.tabEl.style.borderBottom = '', 5000);

    if (ctx.toast) ctx.toast('🔐 Claude needs permission in ' + tabName);
  }

  // ─── Status bar: show Claude state ───────────────────────────────
  const statusIcons = {
    idle: '',
    thinking: '🤖 thinking…',
    tool: '🔧',
    permission: '🔐 needs approval',
    waiting: '🤖 ready',
  };

  function updateStatusBar(session) {
    if (session !== ctx.getActive()) return;
    const right = document.getElementById('sb-right');
    if (!right) return;

    const state = getState(session);
    if (!state.isClaude) return;

    const size = `${session.vt.cols}×${session.vt.rows}`;
    let badge = statusIcons[state.status] || '';
    if (state.status === 'tool' && state.toolName) {
      badge = `🔧 ${state.toolName}`;
    }

    right.textContent = badge ? `${badge}  ${size} 🖥` : `${size} 🖥`;
  }

  // ─── Save conversation when Claude exits ─────────────────────────
  function saveConversation(session, state) {
    const key = 'ttb-claude-conv-' + Date.now();
    const tabName = session._customName || 'Terminal ' + session.id;
    const data = {
      tab: tabName,
      date: new Date().toISOString(),
      lines: state.conversation,
    };

    // Save last 5 conversations
    const keys = JSON.parse(localStorage.getItem('ttb-claude-conv-keys') || '[]');
    keys.push(key);
    while (keys.length > 5) {
      const old = keys.shift();
      localStorage.removeItem(old);
    }
    localStorage.setItem('ttb-claude-conv-keys', JSON.stringify(keys));
    localStorage.setItem(key, JSON.stringify(data));

    if (ctx.toast) ctx.toast('💾 Claude conversation saved');
  }

  // ─── View saved conversations ────────────────────────────────────
  function viewConversations() {
    const keys = JSON.parse(localStorage.getItem('ttb-claude-conv-keys') || '[]');
    if (!keys.length) {
      if (ctx.toast) ctx.toast('No saved Claude conversations');
      return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:600px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);';

    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg)">Claude Conversations</span>';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;';
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);

    const list = document.createElement('div');
    list.style.cssText = 'flex:1;overflow-y:auto;padding:8px;scrollbar-width:thin;';

    panel.appendChild(header);
    panel.appendChild(list);
    overlay.appendChild(panel);

    function close() { overlay.remove(); ctx.hiddenInput.focus(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); e.stopPropagation(); });

    // Render conversation list (newest first)
    [...keys].reverse().forEach(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      const row = document.createElement('div');
      row.style.cssText = 'padding:10px 12px;border-radius:8px;border:1px solid var(--ui-border);margin-bottom:6px;cursor:pointer;transition:border-color 0.15s;';
      row.addEventListener('mouseenter', () => row.style.borderColor = 'var(--accent)');
      row.addEventListener('mouseleave', () => row.style.borderColor = 'var(--ui-border)');

      const top = document.createElement('div');
      top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';
      const title = document.createElement('span');
      title.style.cssText = 'font-size:13px;font-weight:600;color:var(--fg);';
      title.textContent = `🤖 ${data.tab}`;
      const date = document.createElement('span');
      date.style.cssText = 'font-size:11px;color:var(--ui-fg2);';
      date.textContent = new Date(data.date).toLocaleString();
      top.appendChild(title);
      top.appendChild(date);

      const preview = document.createElement('div');
      preview.style.cssText = 'font-size:11px;color:var(--ui-fg2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const meaningful = data.lines.filter(l => l.trim() && !/^[╭╰│─]/.test(l) && !SPINNER_RE.test(l));
      preview.textContent = `${data.lines.length} lines — ${meaningful.slice(-2).join(' | ').slice(0, 100)}`;

      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Copy';
      copyBtn.style.cssText = 'background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:600;';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(data.lines.join('\n')).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        });
      });
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.cssText = 'background:none;color:var(--ui-fg2);border:1px solid var(--ui-border);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem(key);
        const ks = JSON.parse(localStorage.getItem('ttb-claude-conv-keys') || '[]');
        const idx = ks.indexOf(key);
        if (idx >= 0) ks.splice(idx, 1);
        localStorage.setItem('ttb-claude-conv-keys', JSON.stringify(ks));
        row.remove();
      });
      btns.appendChild(copyBtn);
      btns.appendChild(delBtn);

      row.appendChild(top);
      row.appendChild(preview);
      row.appendChild(btns);

      // Click to view full conversation
      row.addEventListener('click', () => {
        close();
        viewFull(data);
      });

      list.appendChild(row);
    });

    document.body.appendChild(overlay);
  }

  function viewFull(data) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);';

    const panel = document.createElement('div');
    panel.style.cssText = 'background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:700px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);';

    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;';
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg)">🤖 ${data.tab} — ${new Date(data.date).toLocaleString()}</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;';
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;font-family:"Cascadia Code",monospace;font-size:13px;line-height:1.6;color:var(--fg);white-space:pre-wrap;word-wrap:break-word;scrollbar-width:thin;';
    body.textContent = data.lines.join('\n');

    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);

    function close() { overlay.remove(); ctx.hiddenInput.focus(); }
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); e.stopPropagation(); });

    document.body.appendChild(overlay);
  }

  // ─── Hook into session output ────────────────────────────────────
  ctx.bus.on('session:output', (session) => {
    checkAltScreen(session);
    parseScreen(session);
  });

  ctx.bus.on('session:activated', (session) => {
    updateStatusBar(session);
  });

  // ─── Commands ────────────────────────────────────────────────────
  ctx.commands.push(
    { name: '🤖 Claude: Saved Conversations', key: '', action: viewConversations },
    { name: '🤖 Claude: Clear Saved Conversations', key: '', action: () => {
      const keys = JSON.parse(localStorage.getItem('ttb-claude-conv-keys') || '[]');
      keys.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('ttb-claude-conv-keys');
      if (ctx.toast) ctx.toast('Cleared all saved conversations');
    }},
  );
}

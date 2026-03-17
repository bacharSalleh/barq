<div align="center">

# barq ⚡

**Web terminal with native RTL support.**

HTML DOM rendering. No canvas. Browser handles bidi text natively.

Built with vanilla JS, ES modules, Express, WebSocket. No build step.

</div>

---

## Install

```bash
git clone https://github.com/bacharSalleh/barq.git
cd barq
npm install
npm start
```

Open `http://localhost:3300`.

```bash
npm run dev    # start + auto-open browser
```

**Requires:** Node.js 18+, C compiler (cc/gcc/clang), macOS or Linux.

## Why DOM?

Terminals render to a character grid or canvas. Arabic, Hebrew, and other RTL scripts break — letters disconnect, words reverse, diacritics vanish.

barq renders every line as a `<div dir="auto">` with `unicode-bidi: plaintext`. The browser's bidi engine does the work. Ligatures connect. Mixed content flows correctly.

On top of that: per-line script detection sets `lang="ar"`/`lang="he"` for proper OpenType shaping, and defensive CSS prevents `letter-spacing` and `italic` from breaking Arabic cursive.

## Stack

```
server.js          Express + WebSocket + REST APIs
pty-helper.c       C PTY (fork/exec, zero overhead)
public/
  js/
    vt.js          VT100 parser
    renderer.js    Row → HTML (colors, bidi, links)
    session.js     Session: VT + WebSocket + DOM
    event-bus.js   Pub/sub
    app.js         Entry point, keyboard, extensions
    extensions/    72 extensions, one file each
  css/             Themes, layout, components
```

No webpack. No babel. No TypeScript. ES modules loaded by the browser.

## Extensions (72)

Each extension is a single file in `public/js/extensions/`. Enable/disable by toggling one line in `app.js`.

**Terminal:** split panes, tab groups, tab pinning, tab drag, workspaces, profiles, scroll mode, recording

**Files:** explorer, viewer/editor, quick open, recent dirs, file drop

**Git:** branch/status/diff, visual graph, 13 commands

**Dev:** docker dashboard, SSH manager, database browser, cron manager, port forwarding, network tools, process manager, perf monitor, run configs, env viewer/switcher, smart commands, project dashboard

**Productivity:** command palette, search, command history, prompt library, clipboard history, scratchpad, calculator, todo tracker, secret vault (AES-256-GCM)

**Utilities:** JSON viewer, regex tester, color picker, diff viewer, markdown preview, man pages, cheat sheets, dev utils (base64/URL/UUID/SHA), timezone converter, alias manager, log viewer

**Claude Code:** background notifications (done/permission), status bar state tracking, conversation capture (survives alt screen exit), Shift+Enter for multi-line input

**UI:** 6 themes, context menu, font controls, error/warning line highlighting, notifications, scroll-to-bottom FAB, welcome screen

## Extension API

```js
export default function(ctx) {
  // ctx.bus         — EventBus (.on .off .emit)
  // ctx.sessions    — Session[]
  // ctx.getActive() — current Session
  // ctx.commands    — push { name, key, action }
  // ctx.modal()     — styled modal dialog
  // ctx.toast()     — toast notification
  // ctx.createSession(cwd), ctx.switchTo(s)

  ctx.bus.on("session:output", (session) => { });
  ctx.commands.push({ name: "My Thing", key: "Ctrl+Shift+X", action: () => {} });
}
```

**Events:** `session:output`, `session:connected`, `session:activated`, `session:destroying`, `render:after`, `input:before`, `bell`, `shortcut:*`

## Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+T` | New tab |
| `Ctrl+Shift+W` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+F` | Search |
| `Ctrl+Shift+B` | File explorer |
| `Ctrl+Shift+N` | Scratchpad |
| `Ctrl+Shift+R` | Command history |
| `Ctrl+Shift+V` | Clipboard history |
| `Shift+Enter` | Newline (don't submit) |

## License

[MIT](LICENSE)

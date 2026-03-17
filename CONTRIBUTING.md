# Contributing to barq

Thanks for your interest in contributing!

## Ground Rules

- **No build tools.** No webpack, no babel, no typescript. Plain ES modules.
- **One file per feature.** Extensions live in `public/js/extensions/`.
- **Use EventBus.** No monkey-patching. `ctx.bus.on()` / `ctx.bus.emit()`.
- **Keep it simple.** No over-engineering. Three similar lines > premature abstraction.

## Adding a Feature

1. Create `public/js/extensions/your-feature.js`
2. Export a default function that receives `ctx`
3. Import + register in `app.js`
4. Add CSS to `public/css/` if needed (or inline styles for small features)
5. Run `node --check` on every modified `.js` file

```js
// public/js/extensions/your-feature.js
export default function(ctx) {
  // ctx.bus         — EventBus
  // ctx.sessions    — Session[]
  // ctx.getActive() — current Session
  // ctx.commands    — push { name, key, action }
  // ctx.modal()     — styled modal dialog
  // ctx.toast()     — toast notification

  ctx.commands.push({
    name: "Your Feature",
    key: "Ctrl+Shift+X",
    action: () => { /* ... */ }
  });
}
```

## Events

| Event | Payload | When |
|-------|---------|------|
| `session:output` | session | Terminal received output |
| `session:connected` | session | WebSocket connected |
| `session:activated` | session | Tab switched |
| `session:destroying` | session | Tab closing |
| `render:after` | session | Screen re-rendered |
| `input:before` | session, data | Before input sent to PTY |
| `bell` | session | BEL character received |
| `shortcut:*` | — | Global keyboard shortcut |

## RTL Guidelines

- Never apply `letter-spacing` to Arabic text (breaks cursive)
- Never use `font-style: italic` on Arabic (deforms glyphs)
- Use `dir="auto"` and `unicode-bidi: plaintext` on all text containers
- Set `lang="ar"` or `lang="he"` when script is detected
- Use `text-rendering: optimizeLegibility` for proper shaping

## Pull Requests

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. One feature per branch
4. Syntax check: `node --check public/js/extensions/your-feature.js`
5. Open a PR with a clear description

## Bug Reports

Open an issue with:
- What you expected
- What happened
- Browser + OS
- Screenshot if visual

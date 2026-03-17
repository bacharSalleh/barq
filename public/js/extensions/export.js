import { rowToText } from '../renderer.js';

export default function(ctx) {
  function dl(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); }

  ctx.commands.push(
    { name: "Export Output (text)", key: "", action: () => {
      const s = ctx.getActive(); if (!s) return;
      let t = ""; s.vt.scrollback.forEach(r => t += rowToText(r) + "\n"); for (let i = 0; i < s.vt.rows; i++) t += rowToText(s.vt.buffer[i]) + "\n";
      dl(new Blob([t], { type: "text/plain" }), "terminal.txt");
    }},
    { name: "Export Output (HTML)", key: "", action: () => {
      const s = ctx.getActive(); if (!s) return;
      const css = Array.from(document.querySelectorAll("link[rel=stylesheet]")).map(l => `<link rel="stylesheet" href="${l.href}">`).join("");
      dl(new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8">${css}</head><body style="padding:16px">${s.wrapEl.innerHTML}</body></html>`], { type: "text/html" }), "terminal.html");
    }},
  );
}

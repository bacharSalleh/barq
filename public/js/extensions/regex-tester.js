// Regex tester — type regex and test against input text
export default function(ctx) {

  function openTester() {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

    overlay.innerHTML = `
      <div style="background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:600px;height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);">
        <div style="display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--ui-border);font-size:14px;font-weight:600;color:var(--fg);">
          <span>Regex Tester</span>
          <button id="rx-close" style="background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;">✕</button>
        </div>
        <div style="padding:10px 14px;display:flex;gap:6px;align-items:center;">
          <span style="color:var(--ui-fg2);font-size:12px;">/</span>
          <input id="rx-pattern" type="text" placeholder="pattern" style="flex:1;background:var(--ui-bg3);color:var(--fg);border:1px solid var(--ui-border2);border-radius:4px;padding:4px 8px;font-family:inherit;font-size:13px;outline:none;">
          <span style="color:var(--ui-fg2);font-size:12px;">/</span>
          <input id="rx-flags" type="text" value="g" placeholder="flags" style="width:40px;background:var(--ui-bg3);color:var(--fg);border:1px solid var(--ui-border2);border-radius:4px;padding:4px 8px;font-family:inherit;font-size:13px;outline:none;text-align:center;">
          <span id="rx-status" style="font-size:11px;color:var(--ui-fg2);min-width:80px;text-align:right;"></span>
        </div>
        <div style="flex:1;overflow:auto;min-height:0;">
          <textarea id="rx-input" placeholder="Paste text to test against…" style="width:100%;height:100%;background:var(--bg);color:var(--fg);border:none;padding:10px 14px;font-family:inherit;font-size:13px;line-height:1.6;resize:none;outline:none;"></textarea>
        </div>
        <div id="rx-output" style="max-height:30%;overflow:auto;padding:10px 14px;border-top:1px solid var(--ui-border);font-size:12px;line-height:1.5;color:var(--fg);"></div>
      </div>`;

    document.body.appendChild(overlay);

    const pattern = overlay.querySelector("#rx-pattern");
    const flags = overlay.querySelector("#rx-flags");
    const input = overlay.querySelector("#rx-input");
    const output = overlay.querySelector("#rx-output");
    const status = overlay.querySelector("#rx-status");

    function test() {
      const p = pattern.value;
      if (!p) { output.innerHTML = ""; status.textContent = ""; return; }
      try {
        const re = new RegExp(p, flags.value);
        const text = input.value;
        const matches = [];
        let m;
        if (flags.value.includes("g")) {
          while ((m = re.exec(text)) !== null) { matches.push({ idx: m.index, text: m[0], groups: m.slice(1) }); if (m.index === re.lastIndex) re.lastIndex++; }
        } else {
          m = re.exec(text);
          if (m) matches.push({ idx: m.index, text: m[0], groups: m.slice(1) });
        }

        status.textContent = matches.length + " match" + (matches.length !== 1 ? "es" : "");
        status.style.color = matches.length ? "var(--c2)" : "var(--c1)";

        // Highlight in output
        if (matches.length && text) {
          let html = "";
          let last = 0;
          const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          matches.forEach((m, i) => {
            html += esc(text.slice(last, m.idx));
            html += `<span style="background:var(--accent);color:#fff;border-radius:2px;padding:0 2px;">${esc(m.text)}</span>`;
            last = m.idx + m.text.length;
          });
          html += esc(text.slice(last));
          output.innerHTML = `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">${html}</pre>`;
        } else {
          output.innerHTML = '<span style="color:var(--ui-fg2)">No matches</span>';
        }
      } catch (e) {
        status.textContent = "Invalid regex";
        status.style.color = "var(--c1)";
        output.innerHTML = `<span style="color:var(--c1)">${e.message}</span>`;
      }
    }

    pattern.addEventListener("input", test);
    flags.addEventListener("input", test);
    input.addEventListener("input", test);

    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    overlay.querySelector("#rx-close").onclick = close;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") { close(); e.stopPropagation(); } });
    pattern.focus();
  }

  ctx.commands.push({ name: "Regex Tester", key: "", action: openTester });
}

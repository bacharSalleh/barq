// Pretty-print JSON with collapsible sections
export default function(ctx) {

  function viewJson() {
    const sel = window.getSelection().toString().trim();
    const input = sel || prompt("Paste JSON:");
    if (!input) return;

    let parsed;
    try { parsed = JSON.parse(input); } catch (e) { if(ctx.toast) ctx.toast("Invalid JSON: " + e.message); return; }

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:70vw;max-width:800px;height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);font-size:13px;font-weight:600;color:var(--fg);";
    header.innerHTML = '<span>JSON Viewer</span><div style="display:flex;gap:6px;"></div>';

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy Pretty";
    copyBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
      copyBtn.textContent = "Copied!"; setTimeout(() => copyBtn.textContent = "Copy Pretty", 1500);
    };

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;

    header.querySelector("div").appendChild(copyBtn);
    header.querySelector("div").appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;padding:12px 16px;font-size:13px;line-height:1.5;min-height:0;user-select:text;cursor:text;";
    body.innerHTML = renderJson(parsed, 0);

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };

    // Collapsible sections
    body.addEventListener("click", (e) => {
      const toggle = e.target.closest(".jv-toggle");
      if (!toggle) return;
      const content = toggle.nextElementSibling;
      if (content) {
        const hidden = content.style.display === "none";
        content.style.display = hidden ? "" : "none";
        toggle.textContent = toggle.textContent.replace(/[▸▾]/, hidden ? "▾" : "▸");
      }
    });
  }

  function renderJson(val, depth) {
    const indent = "  ".repeat(depth);
    const indent1 = "  ".repeat(depth + 1);

    if (val === null) return `<span style="color:var(--c5)">null</span>`;
    if (typeof val === "boolean") return `<span style="color:var(--c5)">${val}</span>`;
    if (typeof val === "number") return `<span style="color:var(--c3)">${val}</span>`;
    if (typeof val === "string") return `<span style="color:var(--c2)">"${esc(val)}"</span>`;

    if (Array.isArray(val)) {
      if (val.length === 0) return `<span style="color:var(--ui-fg2)">[]</span>`;
      const items = val.map((v, i) => `${indent1}${renderJson(v, depth + 1)}${i < val.length - 1 ? "," : ""}`).join("\n");
      return `<span class="jv-toggle" style="cursor:pointer;color:var(--c6)">▾ Array(${val.length})</span><span>\n${items}\n${indent}]</span>`;
    }

    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return `<span style="color:var(--ui-fg2)">{}</span>`;
      const items = keys.map((k, i) => `${indent1}<span style="color:var(--c4)">"${esc(k)}"</span>: ${renderJson(val[k], depth + 1)}${i < keys.length - 1 ? "," : ""}`).join("\n");
      return `<span class="jv-toggle" style="cursor:pointer;color:var(--c6)">▾ Object(${keys.length})</span><span>\n${items}\n${indent}}</span>`;
    }

    return String(val);
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "JSON: View / Format", key: "", action: viewJson },
    { name: "JSON: Format Selection", key: "", action: () => {
      const s = ctx.getActive();
      if (!s) return;
      s.sendInput("pbpaste | python3 -m json.tool | pbcopy && echo 'Formatted JSON copied to clipboard'\r");
      ctx.hiddenInput.focus();
    }},
  );
}

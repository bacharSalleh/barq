export default function(ctx) {

  async function showGraph() {
    const s = ctx.getActive();
    if (!s?.cwd) { if (ctx.toast) ctx.toast("No active session with cwd"); return; }

    try {
      const res = await fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: 'git log --oneline --graph --decorate --all -40 2>/dev/null', cwd: s.cwd }) });
      const data = await res.json();
      if (!data.output?.trim()) { if (ctx.toast) ctx.toast("Not a git repo or no commits"); return; }

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:75vw;max-width:850px;height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">Git Graph</span>';
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕"; closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow:auto;padding:8px 16px;min-height:0;font-size:12px;line-height:1.6;";

      const colors = ["var(--c2)", "var(--c4)", "var(--c5)", "var(--c3)", "var(--c6)", "var(--c1)"];
      body.innerHTML = data.output.split("\n").map(line => {
        let html = esc(line);
        // Color the graph chars
        html = html.replace(/^([*|\/\\ \-]+)/, (m) => {
          return m.split("").map((ch, i) => {
            if (ch === "*") return `<span style="color:${colors[0]};font-weight:bold;">●</span>`;
            if (ch === "|") return `<span style="color:${colors[i % colors.length]};">│</span>`;
            if (ch === "/" || ch === "\\") return `<span style="color:${colors[i % colors.length]};">${ch}</span>`;
            return ch;
          }).join("");
        });
        // Color branch/tag decorations
        html = html.replace(/\(([^)]+)\)/g, (m, inner) => {
          const parts = inner.split(",").map(p => {
            p = p.trim();
            if (p.includes("HEAD")) return `<span style="color:var(--c2);font-weight:bold;">${p}</span>`;
            if (p.includes("origin/")) return `<span style="color:var(--c1);">${p}</span>`;
            if (p.includes("tag:")) return `<span style="color:var(--c3);">${p}</span>`;
            return `<span style="color:var(--c4);">${p}</span>`;
          });
          return `<span style="color:var(--ui-fg2);">(</span>${parts.join(", ")}<span style="color:var(--ui-fg2);">)</span>`;
        });
        // Color commit hash
        html = html.replace(/([a-f0-9]{7,})/, '<span style="color:var(--c3);">$1</span>');
        return `<div style="white-space:pre;font-family:inherit;">${html}</div>`;
      }).join("");

      modal.append(header, body); overlay.appendChild(modal); document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
    } catch (e) { if (ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push({ name: "Git Graph (visual)", key: "", action: showGraph });
}

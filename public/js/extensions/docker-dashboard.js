export default function(ctx) {

  async function showDashboard() {
    try {
      const [containers, images] = await Promise.all([
        fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: 'docker ps -a --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}" 2>/dev/null', cwd: "/" }) }).then(r => r.json()),
        fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: 'docker images --format "{{.Repository}}:{{.Tag}}|{{.Size}}|{{.ID}}" 2>/dev/null | head -20', cwd: "/" }) }).then(r => r.json()),
      ]);

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:80vw;max-width:900px;height:70vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">🐳 Docker Dashboard</span>';
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕"; closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow:auto;padding:12px 16px;min-height:0;font-size:12px;";

      const cLines = (containers.output || "").trim().split("\n").filter(Boolean);
      const iLines = (images.output || "").trim().split("\n").filter(Boolean);

      let html = '<div style="font-weight:600;color:var(--accent);margin-bottom:8px;">Containers (' + cLines.length + ')</div>';
      if (cLines.length) {
        html += cLines.map(l => {
          const [id, name, image, status, ports] = l.split("|");
          const running = status?.includes("Up");
          const color = running ? "var(--c2)" : "var(--c1)";
          return `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--ui-border);">
            <span style="color:${color};width:8px;">●</span>
            <span style="width:120px;font-weight:600;color:var(--fg);">${esc(name)}</span>
            <span style="width:160px;color:var(--ui-fg2);">${esc(image)}</span>
            <span style="flex:1;color:var(--ui-fg2);font-size:11px;">${esc(status)}</span>
            <button data-action="${running ? 'stop' : 'start'}" data-name="${esc(name)}" style="background:none;border:1px solid ${color};color:${color};border-radius:4px;padding:1px 8px;cursor:pointer;font-size:10px;">${running ? 'Stop' : 'Start'}</button>
            <button data-action="logs" data-name="${esc(name)}" style="background:none;border:1px solid var(--ui-fg2);color:var(--ui-fg2);border-radius:4px;padding:1px 8px;cursor:pointer;font-size:10px;">Logs</button>
            <button data-action="rm" data-name="${esc(name)}" style="background:none;border:1px solid var(--c1);color:var(--c1);border-radius:4px;padding:1px 8px;cursor:pointer;font-size:10px;">Rm</button>
          </div>`;
        }).join("");
      } else html += '<div style="color:var(--ui-fg2);padding:8px 0;">No containers</div>';

      html += '<div style="font-weight:600;color:var(--accent);margin:16px 0 8px;">Images (' + iLines.length + ')</div>';
      html += iLines.map(l => { const [repo, size, id] = l.split("|"); return `<div style="display:flex;gap:8px;padding:3px 0;color:var(--ui-fg);"><span style="flex:1">${esc(repo)}</span><span style="color:var(--ui-fg2)">${esc(size)}</span></div>`; }).join("");

      body.innerHTML = html;

      body.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const { action, name } = btn.dataset;
        const s = ctx.getActive();
        if (!s) return;
        if (action === "logs") { const ns = ctx.createSession(); const h = (session) => { if (session !== ns) return; ctx.bus.off("session:connected", h); setTimeout(() => { ns.sendInput(`docker logs -f --tail=100 ${name}\r`); ns._customName = "🐳 " + name; ns.tabLabel.textContent = ns._customName; }, 300); }; ctx.bus.on("session:connected", h); }
        else if (action === "stop") { s.sendInput(`docker stop ${name}\r`); close(); }
        else if (action === "start") { s.sendInput(`docker start ${name}\r`); close(); }
        else if (action === "rm") { s.sendInput(`docker rm ${name}\r`); close(); }
        ctx.hiddenInput.focus();
      });

      modal.append(header, body); overlay.appendChild(modal); document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
    } catch (e) { if (ctx.toast) ctx.toast("Docker not available: " + e.message); }
  }

  function esc(s) { return (s||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  ctx.commands.push({ name: "🐳 Docker Dashboard", key: "", action: showDashboard });
}

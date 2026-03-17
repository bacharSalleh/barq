// Interactive process list with kill buttons
export default function(ctx) {

  async function showProcesses() {
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "ps -eo pid,ppid,%cpu,%mem,comm --sort=-%cpu 2>/dev/null | head -30 || ps -eo pid,ppid,%cpu,%mem,comm -r | head -30", cwd: "/" }),
      });
      const data = await res.json();

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:700px;height:65vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg);">Processes (top 30 by CPU)</span>';
      const refreshBtn = document.createElement("button");
      refreshBtn.textContent = "↻ Refresh";
      refreshBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;margin-right:8px;";
      refreshBtn.onclick = () => { overlay.remove(); showProcesses(); };
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;
      const btns = document.createElement("div");
      btns.style.display = "flex";
      btns.append(refreshBtn, closeBtn);
      header.appendChild(btns);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow:auto;min-height:0;font-size:12px;";

      const lines = (data.output || "").trim().split("\n");
      const headerLine = lines[0] || "";
      body.innerHTML = `<div style="padding:4px 16px;color:var(--ui-fg2);font-weight:600;border-bottom:1px solid var(--ui-border);position:sticky;top:0;background:var(--ui-bg);">${esc(headerLine)}<span style="float:right">ACTION</span></div>` +
        lines.slice(1).map(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[0];
          const cpu = parseFloat(parts[2]) || 0;
          const cpuColor = cpu > 50 ? "var(--c1)" : cpu > 10 ? "var(--c3)" : "var(--fg)";
          return `<div style="padding:3px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;color:${cpuColor};">
            <span style="flex:1;font-family:inherit;">${esc(line.trim())}</span>
            <button data-pid="${pid}" style="background:none;border:1px solid var(--c1);color:var(--c1);border-radius:4px;padding:1px 8px;cursor:pointer;font-size:10px;font-family:inherit;flex-shrink:0;">Kill</button>
          </div>`;
        }).join("");

      body.addEventListener("click", async (e) => {
        const btn = e.target.closest("button[data-pid]");
        if (!btn) return;
        const pid = btn.dataset.pid;
        if (!confirm(`Kill process ${pid}?`)) return;
        await fetch("/api/exec", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cmd: `kill -9 ${pid} 2>/dev/null && echo "Killed ${pid}" || echo "Failed to kill ${pid}"`, cwd: "/" }),
        });
        btn.textContent = "Killed";
        btn.disabled = true;
        btn.style.opacity = "0.4";
      });

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
    } catch (e) { if(ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push({ name: "Process Manager", key: "", action: showProcesses });
}

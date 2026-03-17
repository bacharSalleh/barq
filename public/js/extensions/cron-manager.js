// View and manage crontab entries
export default function(ctx) {

  async function viewCrontab() {
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "crontab -l 2>/dev/null || echo 'No crontab for current user'", cwd: "/" }),
      });
      const data = await res.json();

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:70vw;max-width:800px;height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">Crontab</span><div style="display:flex;gap:6px;"></div>`;

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit in terminal";
      editBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;";
      editBtn.onclick = () => { close(); const s = ctx.getActive(); if (s) { s.sendInput("crontab -e\r"); ctx.hiddenInput.focus(); } };

      const addBtn = document.createElement("button");
      addBtn.textContent = "Add entry…";
      addBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-family:inherit;font-size:11px;";
      addBtn.onclick = () => { close(); addCronEntry(); };

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;

      header.querySelector("div").append(editBtn, addBtn, closeBtn);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow:auto;padding:0;min-height:0;";

      const lines = (data.output || "").split("\n").filter(Boolean);
      body.innerHTML = lines.map(line => {
        const isComment = line.startsWith("#");
        const color = isComment ? "var(--ui-fg3)" : "var(--fg)";
        return `<div style="padding:4px 16px;color:${color};font-size:13px;font-family:inherit;white-space:pre-wrap;border-bottom:1px solid var(--ui-border);">${esc(line)}</div>`;
      }).join("");

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
    } catch (e) { if(ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function addCronEntry() {
    const schedule = prompt("Schedule (e.g. */5 * * * *):");
    if (!schedule) return;
    const cmd = prompt("Command to run:");
    if (!cmd) return;
    const s = ctx.getActive();
    if (!s) return;
    s.sendInput(`(crontab -l 2>/dev/null; echo "${schedule} ${cmd}") | crontab - && echo "Cron entry added"\r`);
    ctx.hiddenInput.focus();
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "Cron: View Crontab", key: "", action: viewCrontab },
    { name: "Cron: Add Entry…", key: "", action: addCronEntry },
    { name: "Cron: Edit in Terminal", key: "", action: () => { const s = ctx.getActive(); if (s) { s.sendInput("crontab -e\r"); ctx.hiddenInput.focus(); } } },
  );
}

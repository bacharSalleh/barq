// View and manage shell aliases
export default function(ctx) {

  async function viewAliases() {
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "zsh -ic 'alias' 2>/dev/null || bash -ic 'alias' 2>/dev/null", cwd: "/" }),
      });
      const data = await res.json();

      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:60vw;max-width:700px;height:60vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">Shell Aliases</span>`;
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.style.cssText = "flex:1;overflow:auto;padding:0;min-height:0;";

      const lines = (data.output || "").split("\n").filter(Boolean).sort();
      body.innerHTML = lines.map(line => {
        const eq = line.indexOf("=");
        const name = eq > 0 ? line.slice(0, eq).replace(/^alias /, "") : line;
        const value = eq > 0 ? line.slice(eq + 1) : "";
        return `<div style="padding:4px 16px;font-size:12px;border-bottom:1px solid var(--ui-border);display:flex;gap:8px;">
          <span style="color:var(--c4);min-width:120px;font-weight:600;">${esc(name)}</span>
          <span style="color:var(--fg);flex:1;">${esc(value)}</span>
        </div>`;
      }).join("");

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };
    } catch (e) { if(ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function addAlias() {
    const name = prompt("Alias name:");
    if (!name) return;
    const cmd = prompt("Command:");
    if (!cmd) return;
    const s = ctx.getActive();
    if (!s) return;
    // Add to current shell + append to .zshrc
    s.sendInput(`alias ${name}='${cmd.replace(/'/g, "'\\''")}' && echo "alias ${name}='${cmd.replace(/'/g, "'\\''")}'" >> ~/.zshrc && echo "Alias added: ${name}"\r`);
    ctx.hiddenInput.focus();
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "Aliases: View All", key: "", action: viewAliases },
    { name: "Aliases: Create New…", key: "", action: addAlias },
  );
}

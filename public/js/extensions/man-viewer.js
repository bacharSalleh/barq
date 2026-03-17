// View man pages in the file viewer modal
export default function(ctx) {

  async function viewMan(cmd) {
    const command = cmd || prompt("Command name:");
    if (!command) return;
    try {
      const res = await fetch("/api/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: `man ${command} 2>/dev/null | col -bx || echo "No manual entry for ${command}"`, cwd: "/" }),
      });
      const data = await res.json();
      if (ctx.openFile) {
        // Hack: create a temporary display using the file viewer
        // by simulating a file open
      }

      // Open in a modal
      const overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

      const modal = document.createElement("div");
      modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:75vw;max-width:900px;height:75vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);";
      header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">man ${esc(command)}</span>`;
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
      const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
      closeBtn.onclick = close;
      header.appendChild(closeBtn);

      const body = document.createElement("pre");
      body.style.cssText = "flex:1;overflow:auto;padding:12px 16px;font-size:13px;line-height:1.5;color:var(--fg);margin:0;white-space:pre-wrap;user-select:text;cursor:text;min-height:0;";
      body.textContent = data.output || data.error || "No output";

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      const escH = (e) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", escH); const origClose = close; close = () => { document.removeEventListener("keydown", escH); origClose(); };

    } catch (e) { if(ctx.toast) ctx.toast("Error: " + e.message); }
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "Man Page: View…", key: "", action: () => viewMan() },
    // Common ones
    ...["git","docker","ssh","curl","grep","find","awk","sed","jq","make"].map(c => ({
      name: `Man: ${c}`, key: "", action: () => viewMan(c)
    })),
  );
}

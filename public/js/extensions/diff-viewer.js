// View git diffs in a side-by-side modal
export default function(ctx) {

  function showDiff(type) {
    const s = ctx.getActive();
    if (!s?.cwd) { if(ctx.toast) ctx.toast("No active session with cwd"); return; }

    const cmd = type === "staged" ? "git diff --staged" : "git diff";

    fetch(`/api/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd, cwd: s.cwd }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.error) { if(ctx.toast) ctx.toast(data.error); return; }
      if (!data.output.trim()) { if(ctx.toast) ctx.toast("No changes"); return; }
      openDiffModal(data.output);
    })
    .catch(e => { if(ctx.toast) ctx.toast("Error: " + e.message); });
  }

  function openDiffModal(diffText) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:8px;width:85vw;max-width:1000px;height:75vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid var(--ui-border);font-size:13px;font-weight:600;color:var(--fg);";
    header.innerHTML = '<span>Diff View</span>';
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;padding:0;font-family:inherit;font-size:13px;line-height:1.5;min-height:0;";

    // Parse and render diff
    const lines = diffText.split("\n");
    let html = "";
    for (const line of lines) {
      let cls = "color:var(--fg)";
      if (line.startsWith("+++") || line.startsWith("---")) cls = "color:var(--ui-fg2);font-weight:bold";
      else if (line.startsWith("@@")) cls = "color:var(--c6);background:rgba(86,182,194,0.1)";
      else if (line.startsWith("+")) cls = "color:var(--c2);background:rgba(152,195,121,0.1)";
      else if (line.startsWith("-")) cls = "color:var(--c1);background:rgba(224,108,117,0.1)";
      else if (line.startsWith("diff ")) cls = "color:var(--accent);font-weight:bold;border-top:1px solid var(--ui-border);padding-top:8px;margin-top:8px";
      html += `<div style="${cls};padding:0 16px;white-space:pre-wrap;word-break:break-all;">${esc(line)}</div>`;
    }
    body.innerHTML = html;

    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", handler); }
    });
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  ctx.commands.push(
    { name: "Diff: View Changes", key: "", action: () => showDiff("unstaged") },
    { name: "Diff: View Staged", key: "", action: () => showDiff("staged") },
  );
}

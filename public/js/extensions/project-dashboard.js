export default function(ctx) {

  async function showDashboard() {
    const s = ctx.getActive();
    const cwd = s?.cwd || "~";

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:55;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const modal = document.createElement("div");
    modal.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:85vw;max-width:950px;height:75vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid var(--ui-border);";
    header.innerHTML = `<span style="font-size:14px;font-weight:600;color:var(--fg);">📊 Project: ${esc(cwd.replace(/^\/Users\/[^/]+/, "~"))}</span>`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕"; closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    const close = () => { overlay.remove(); ctx.hiddenInput.focus(); };
    closeBtn.onclick = close;
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;overflow:auto;padding:16px;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start;";
    body.innerHTML = '<div style="grid-column:1/-1;color:var(--ui-fg2);text-align:center;padding:20px;">Loading…</div>';

    modal.append(header, body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const escH = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", escH);
    const origClose = close;
    const cleanClose = () => { document.removeEventListener("keydown", escH); origClose(); };
    closeBtn.onclick = cleanClose;
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanClose(); });

    // Fetch all data in parallel
    const exec = (cmd) => fetch("/api/exec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cmd, cwd }) }).then(r => r.json()).then(d => d.output || "").catch(() => "");

    const [files, gitInfo, gitLog, readme, pkgJson, dockerCompose] = await Promise.all([
      fetch(`/api/files?path=${encodeURIComponent(cwd)}&hidden=1`).then(r => r.json()).catch(() => ({ items: [] })),
      exec("git rev-parse --abbrev-ref HEAD 2>/dev/null && git status --short 2>/dev/null | head -10"),
      exec("git log --oneline -8 2>/dev/null"),
      exec("head -30 README.md 2>/dev/null"),
      exec("cat package.json 2>/dev/null | head -30"),
      exec("test -f docker-compose.yml && echo 'yes' || test -f compose.yml && echo 'yes' || echo 'no'"),
    ]);

    const fileNames = new Set((files.items || []).map(f => f.name));
    let cards = "";

    // Git card
    if (gitInfo.trim()) {
      const lines = gitInfo.trim().split("\n");
      const branch = lines[0];
      const changes = lines.slice(1);
      cards += card("⎇ Git", `
        <div style="font-size:16px;font-weight:600;color:var(--c2);margin-bottom:6px;">${esc(branch)}</div>
        ${changes.length ? changes.map(l => `<div style="font-size:11px;color:${l.startsWith("M")?"var(--c3)":l.startsWith("?")?"var(--c4)":"var(--c1)"};">${esc(l)}</div>`).join("") : '<div style="color:var(--c2);font-size:11px;">Clean working tree</div>'}
      `);
    }

    // Recent commits
    if (gitLog.trim()) {
      cards += card("📝 Recent Commits", gitLog.trim().split("\n").map(l =>
        `<div style="font-size:11px;padding:1px 0;"><span style="color:var(--c3);">${esc(l.slice(0,7))}</span> ${esc(l.slice(8))}</div>`
      ).join(""));
    }

    // Package.json scripts
    if (pkgJson.trim()) {
      try {
        const pkg = JSON.parse(pkgJson.trim().split("\n").join("") + (pkgJson.includes("}") ? "" : "}"));
        if (pkg.scripts) {
          cards += card("📦 Scripts", Object.entries(pkg.scripts).map(([k, v]) =>
            `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0;cursor:pointer;" onclick="document.querySelector('#terminals-container').__barq_run?.('npm run ${k}')">
              <span style="color:var(--c4);font-weight:600;">${esc(k)}</span>
              <span style="color:var(--ui-fg2);">${esc(v.slice(0,40))}</span>
            </div>`
          ).join(""));
        }
      } catch {}
    }

    // Project files overview
    const dirs = (files.items || []).filter(f => f.type === "dir").length;
    const allFiles = (files.items || []).filter(f => f.type === "file").length;
    cards += card("📁 Files", `
      <div style="font-size:20px;font-weight:700;color:var(--fg);">${dirs} dirs, ${allFiles} files</div>
      <div style="font-size:11px;color:var(--ui-fg2);margin-top:4px;">
        ${["Makefile","Dockerfile","Cargo.toml","go.mod","pyproject.toml","tsconfig.json",".env","docker-compose.yml","compose.yml"].filter(f => fileNames.has(f)).map(f => `<span style="background:var(--ui-bg3);padding:1px 6px;border-radius:3px;margin:2px;">${f}</span>`).join(" ") || "No config files detected"}
      </div>
    `);

    // README preview
    if (readme.trim()) {
      cards += card("📄 README", `<pre style="font-size:11px;color:var(--ui-fg);white-space:pre-wrap;margin:0;max-height:120px;overflow:auto;">${esc(readme.trim())}</pre>`, true);
    }

    // Docker
    if (dockerCompose.trim() === "yes") {
      cards += card("🐳 Docker", `
        <div style="color:var(--c2);font-size:12px;">docker-compose.yml detected</div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button onclick="document.querySelector('#terminals-container').__barq_run?.('docker compose up -d')" style="background:var(--c2);color:#000;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;">Up</button>
          <button onclick="document.querySelector('#terminals-container').__barq_run?.('docker compose down')" style="background:var(--c1);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;">Down</button>
          <button onclick="document.querySelector('#terminals-container').__barq_run?.('docker compose logs -f --tail=50')" style="background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border2);border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;">Logs</button>
        </div>
      `);
    }

    body.innerHTML = cards || '<div style="grid-column:1/-1;color:var(--ui-fg2);text-align:center;">No project info detected</div>';

    // Wire up run buttons
    document.querySelector("#terminals-container").__barq_run = (cmd) => {
      cleanClose();
      const session = ctx.getActive();
      if (session) { session.sendInput(cmd + "\r"); ctx.hiddenInput.focus(); }
    };
  }

  function card(title, content, wide) {
    return `<div style="background:var(--bg);border:1px solid var(--ui-border);border-radius:8px;padding:12px;${wide?"grid-column:1/-1;":""}">
      <div style="font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${title}</div>
      ${content}
    </div>`;
  }

  function esc(s) { return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  ctx.commands.push({ name: "📊 Project Dashboard", key: "Ctrl+Shift+I", action: showDashboard });
  ctx.bus.on("shortcut:project-dashboard", showDashboard);
}

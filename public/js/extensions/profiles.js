// Project profiles — env vars, startup commands, theme per project
export default function(ctx) {
  const KEY = "ttb-profiles";
  const store = ctx.store;
  let profiles = JSON.parse(store.getItem(KEY) || "{}");

  // Migrate old format (theme-only profiles)
  for (const [name, p] of Object.entries(profiles)) {
    if (!p.envVars) p.envVars = [];
    if (!p.startupCmds) p.startupCmds = [];
    if (!p.cwd) p.cwd = "";
  }
  function save() { store.setItem(KEY, JSON.stringify(profiles)); }

  function applyProfile(name) {
    const p = profiles[name];
    if (!p) return;
    const s = ctx.getActive();
    if (!s) return;

    // Apply theme
    if (p.theme) {
      document.documentElement.dataset.theme = p.theme;
      store.setItem("ttb-theme", p.theme);
    }
    // Apply font size
    if (p.fontSize) {
      document.querySelectorAll(".term-line").forEach(el => el.style.fontSize = p.fontSize + "px");
      ctx.probe.style.fontSize = p.fontSize + "px";
      store.setItem("ttb-fontsize", p.fontSize);
    }

    // CD to project directory
    if (p.cwd) s.sendInput("cd " + p.cwd + "\r");

    // Set env vars
    setTimeout(() => {
      if (p.envVars.length) {
        const exports = p.envVars.map(v => `export ${v.key}="${v.value}"`).join(" && ");
        s.sendInput(exports + "\r");
      }

      // Run startup commands (sequential with small delays)
      if (p.startupCmds.length) {
        let delay = 300;
        p.startupCmds.forEach(cmd => {
          setTimeout(() => s.sendInput(cmd + "\r"), delay);
          delay += 300;
        });
      }
    }, p.cwd ? 300 : 0);

    if (ctx.toast) ctx.toast("Profile loaded: " + name);
    // Resize
    const size = ctx.calcSize();
    ctx.sessions.forEach(ss => ss.resize(size.rows, size.cols));
    ctx.scheduleRender();
  }

  function openProfileManager() {
    if (!ctx.modal) return;
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(0,0,0,.6);display:flex;justify-content:center;align-items:center;backdrop-filter:blur(4px);";

    const panel = document.createElement("div");
    panel.style.cssText = "background:var(--ui-bg);border:1px solid var(--ui-border2);border-radius:12px;width:480px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 16px 50px rgba(0,0,0,.5);";

    const header = document.createElement("div");
    header.style.cssText = "padding:12px 16px;border-bottom:1px solid var(--ui-border);display:flex;justify-content:space-between;align-items:center;";
    header.innerHTML = '<span style="font-size:14px;font-weight:600;color:var(--fg)">Project Profiles</span>';
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u2715";
    closeBtn.style.cssText = "background:none;border:none;color:var(--ui-fg2);cursor:pointer;font-size:16px;";
    closeBtn.addEventListener("click", close);
    header.appendChild(closeBtn);

    const list = document.createElement("div");
    list.style.cssText = "flex:1;overflow-y:auto;padding:8px;scrollbar-width:thin;";

    const footer = document.createElement("div");
    footer.style.cssText = "padding:10px 16px;border-top:1px solid var(--ui-border);display:flex;gap:8px;";
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ New Profile";
    addBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;";
    addBtn.addEventListener("click", () => { close(); createProfile(); });
    footer.appendChild(addBtn);

    panel.appendChild(header);
    panel.appendChild(list);
    panel.appendChild(footer);
    overlay.appendChild(panel);

    function close() { overlay.remove(); ctx.hiddenInput.focus(); }
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    function renderList() {
      list.innerHTML = "";
      const names = Object.keys(profiles);
      if (!names.length) {
        list.innerHTML = '<div style="color:var(--ui-fg2);text-align:center;padding:20px;font-size:13px;">No profiles yet</div>';
        return;
      }
      names.forEach(name => {
        const p = profiles[name];
        const row = document.createElement("div");
        row.style.cssText = "padding:10px 12px;border-radius:8px;border:1px solid var(--ui-border);margin-bottom:6px;cursor:pointer;transition:border-color 0.15s;";
        row.addEventListener("mouseenter", () => row.style.borderColor = "var(--accent)");
        row.addEventListener("mouseleave", () => row.style.borderColor = "var(--ui-border)");

        const top = document.createElement("div");
        top.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;";
        const title = document.createElement("span");
        title.style.cssText = "font-size:14px;font-weight:600;color:var(--fg);";
        title.textContent = name;

        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:4px;";
        const loadBtn = document.createElement("button");
        loadBtn.textContent = "Load";
        loadBtn.style.cssText = "background:var(--accent);color:#fff;border:none;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:11px;font-weight:600;";
        loadBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); applyProfile(name); });
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.style.cssText = "background:var(--ui-bg3);color:var(--ui-fg);border:1px solid var(--ui-border);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;";
        editBtn.addEventListener("click", (e) => { e.stopPropagation(); close(); editProfile(name); });
        const delBtn = document.createElement("button");
        delBtn.textContent = "Del";
        delBtn.style.cssText = "background:none;color:var(--ui-fg2);border:1px solid var(--ui-border);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;";
        delBtn.addEventListener("click", (e) => { e.stopPropagation(); delete profiles[name]; save(); rebuildCommands(); renderList(); });
        btns.appendChild(loadBtn);
        btns.appendChild(editBtn);
        btns.appendChild(delBtn);
        top.appendChild(title);
        top.appendChild(btns);

        const details = document.createElement("div");
        details.style.cssText = "font-size:11px;color:var(--ui-fg2);display:flex;flex-wrap:wrap;gap:6px;";
        if (p.cwd) details.innerHTML += `<span style="background:var(--ui-bg3);padding:1px 6px;border-radius:3px;">📁 ${p.cwd}</span>`;
        if (p.theme) details.innerHTML += `<span style="background:var(--ui-bg3);padding:1px 6px;border-radius:3px;">🎨 ${p.theme}</span>`;
        if (p.envVars.length) details.innerHTML += `<span style="background:var(--ui-bg3);padding:1px 6px;border-radius:3px;">🔑 ${p.envVars.length} env vars</span>`;
        if (p.startupCmds.length) details.innerHTML += `<span style="background:var(--ui-bg3);padding:1px 6px;border-radius:3px;">⚡ ${p.startupCmds.length} commands</span>`;

        row.appendChild(top);
        row.appendChild(details);
        row.addEventListener("click", () => { close(); applyProfile(name); });
        list.appendChild(row);
      });
    }

    document.body.appendChild(overlay);
    renderList();
  }

  function createProfile() {
    if (!ctx.modal) return;
    ctx.modal("New Project Profile", [
      { name: "name", label: "Profile name", type: "text", placeholder: "e.g. my-project-dev" },
      { name: "cwd", label: "Project directory", type: "text", placeholder: "/path/to/project (optional)" },
      { name: "theme", label: "Theme", type: "select", options: ["dark", "dracula", "nord", "solarized", "monokai", "onedark"] },
      { name: "envVars", label: "Environment variables (KEY=VALUE, one per line)", type: "textarea", rows: 4, placeholder: "NODE_ENV=development\nPORT=3000\nDEBUG=true" },
      { name: "startupCmds", label: "Startup commands (one per line)", type: "textarea", rows: 4, placeholder: "nvm use 18\nnpm run dev\necho 'Ready!'" },
    ], (vals) => {
      if (!vals.name) return;
      profiles[vals.name] = {
        cwd: vals.cwd || "",
        theme: vals.theme || "dark",
        fontSize: parseInt(store.getItem("ttb-fontsize")) || 14,
        envVars: parseEnvVars(vals.envVars),
        startupCmds: parseLines(vals.startupCmds),
      };
      save(); rebuildCommands();
      if (ctx.toast) ctx.toast("Profile created: " + vals.name);
    });
  }

  function editProfile(name) {
    const p = profiles[name];
    if (!p || !ctx.modal) return;
    ctx.modal("Edit Profile: " + name, [
      { name: "cwd", label: "Project directory", type: "text", value: p.cwd || "" },
      { name: "theme", label: "Theme", type: "select", options: ["dark", "dracula", "nord", "solarized", "monokai", "onedark"] },
      { name: "envVars", label: "Environment variables (KEY=VALUE, one per line)", type: "textarea", rows: 4, value: p.envVars.map(v => v.key + "=" + v.value).join("\n") },
      { name: "startupCmds", label: "Startup commands (one per line)", type: "textarea", rows: 4, value: p.startupCmds.join("\n") },
    ], (vals) => {
      profiles[name] = {
        ...p,
        cwd: vals.cwd || "",
        theme: vals.theme || p.theme,
        envVars: parseEnvVars(vals.envVars),
        startupCmds: parseLines(vals.startupCmds),
      };
      save(); rebuildCommands();
      if (ctx.toast) ctx.toast("Profile updated: " + name);
    });
  }

  function parseEnvVars(text) {
    if (!text) return [];
    return text.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const eq = l.indexOf("=");
      if (eq === -1) return { key: l, value: "" };
      return { key: l.slice(0, eq).trim(), value: l.slice(eq + 1).trim() };
    });
  }

  function parseLines(text) {
    if (!text) return [];
    return text.split("\n").map(l => l.trim()).filter(Boolean);
  }

  function rebuildCommands() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._profile) ctx.commands.splice(i, 1);
    for (const name of Object.keys(profiles)) {
      ctx.commands.push({ name: "Profile: " + name, key: "", _profile: true, action: () => applyProfile(name) });
    }
  }

  ctx.commands.push(
    { name: "Project Profiles", key: "", action: openProfileManager },
    { name: "New Profile…", key: "", action: createProfile },
  );
  rebuildCommands();
}

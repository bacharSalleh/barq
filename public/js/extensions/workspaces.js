// Save/restore entire terminal layouts as named workspaces
export default function(ctx) {
  const KEY = "ttb-workspaces";
  const store = ctx.store;
  let workspaces = JSON.parse(store.getItem(KEY) || "{}");
  function persist() { store.setItem(KEY, JSON.stringify(workspaces)); }

  function captureLayout() {
    return ctx.sessions.map(s => ({
      name: s._customName || s.tabLabel.textContent,
      cwd: s.cwd || null,
      group: s._group || null,
    }));
  }

  function saveWorkspace() {
    const name = prompt("Workspace name:");
    if (!name) return;
    workspaces[name] = { tabs: captureLayout(), savedAt: Date.now() };
    persist(); rebuild();
  }

  function loadWorkspace(name) {
    const ws = workspaces[name];
    if (!ws) return;
    // Close all existing sessions
    while (ctx.sessions.length > 0) {
      const s = ctx.sessions[0];
      ctx.bus.emit("session:destroying", s);
      ctx.sessions.splice(0, 1);
      s.destroy();
    }
    // Recreate from workspace
    let first = null;
    ws.tabs.forEach(t => {
      const s = ctx.createSession(t.cwd);
      if (t.name) { s._customName = t.name; s.tabLabel.textContent = t.name; }
      if (t.group && s.tabEl) {
        s._group = t.group;
        s.tabEl.dataset.group = t.group;
        const colors = { red:"#e06c75", green:"#98c379", blue:"#61afef", yellow:"#e5c07b", purple:"#c678dd", cyan:"#56b6c2", orange:"#d19a66", pink:"#ff79c6" };
        s.tabEl.style.setProperty("--tab-group-color", colors[t.group] || t.group);
      }
      if (!first) first = s;
    });
    if (first) ctx.switchTo(first);
  }

  function deleteWorkspace() {
    const names = Object.keys(workspaces);
    if (!names.length) { if(ctx.toast) ctx.toast("No saved workspaces"); return; }
    const name = prompt("Delete which workspace?\n" + names.join(", "));
    if (name && workspaces[name]) { delete workspaces[name]; persist(); rebuild(); }
  }

  function rebuild() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._ws) ctx.commands.splice(i, 1);
    for (const name of Object.keys(workspaces)) {
      const age = Date.now() - (workspaces[name].savedAt || 0);
      const ago = age < 3600000 ? Math.round(age/60000) + "m ago" : age < 86400000 ? Math.round(age/3600000) + "h ago" : Math.round(age/86400000) + "d ago";
      ctx.commands.push({
        name: `Workspace: ${name} (${workspaces[name].tabs.length} tabs, ${ago})`,
        key: "", _ws: true, action: () => loadWorkspace(name)
      });
    }
  }

  ctx.commands.push(
    { name: "Workspace: Save Current…", key: "", action: saveWorkspace },
    { name: "Workspace: Delete…", key: "", action: deleteWorkspace },
  );
  rebuild();
}

// Save per-project run configurations (like VS Code tasks)
export default function(ctx) {
  const STORAGE_KEY = "ttb-run-configs";
  let configs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(configs)); }

  function addConfig() {
    const name = prompt("Config name (e.g. 'Dev Server'):");
    if (!name) return;
    const cmd = prompt("Command to run:");
    if (!cmd) return;
    const cwd = prompt("Working directory (leave empty for current):", "") || "";
    const newTab = confirm("Run in new tab?");
    configs.push({ name, cmd, cwd, newTab });
    save(); rebuild();
  }

  function removeConfig() {
    if (!configs.length) { if(ctx.toast) ctx.toast("No configs"); return; }
    const name = prompt("Remove which?\n" + configs.map(c => c.name).join(", "));
    if (!name) return;
    configs = configs.filter(c => c.name !== name);
    save(); rebuild();
  }

  function runConfig(c) {
    let s;
    if (c.newTab) {
      s = ctx.createSession(c.cwd || undefined);
      const onConn = (session) => {
        if (session !== s) return;
        ctx.bus.off("session:connected", onConn);
        setTimeout(() => {
          s.sendInput(c.cmd + "\r");
          s._customName = c.name;
          s.tabLabel.textContent = c.name;
        }, 300);
      };
      ctx.bus.on("session:connected", onConn);
    } else {
      s = ctx.getActive();
      if (!s) return;
      if (c.cwd) s.sendInput("cd " + c.cwd + " && " + c.cmd + "\r");
      else s.sendInput(c.cmd + "\r");
    }
    ctx.hiddenInput.focus();
  }

  function rebuild() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._runCfg) ctx.commands.splice(i, 1);
    configs.forEach(c => {
      ctx.commands.push({ name: "Run: " + c.name, key: "", _runCfg: true, action: () => runConfig(c) });
    });
  }

  ctx.commands.push(
    { name: "Run Config: Add…", key: "", action: addConfig },
    { name: "Run Config: Remove…", key: "", action: removeConfig },
  );
  rebuild();
}

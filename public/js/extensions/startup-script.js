// Run commands automatically when a new tab opens
export default function(ctx) {
  const KEY = "ttb-startup-cmds";
  let cmds = JSON.parse(localStorage.getItem(KEY) || "[]");
  function save() { localStorage.setItem(KEY, JSON.stringify(cmds)); }

  // Run startup commands on new session connect
  ctx.bus.on("session:connected", (session) => {
    if (!cmds.length) return;
    setTimeout(() => {
      cmds.forEach(c => session.sendInput(c + "\r"));
    }, 400);
  });

  ctx.commands.push(
    { name: "Startup: Add Command…", key: "", action: () => {
      const cmd = prompt("Command to run on every new tab:");
      if (cmd) { cmds.push(cmd); save(); }
    }},
    { name: "Startup: List Commands", key: "", action: () => {
      if (!cmds.length) { if(ctx.toast) ctx.toast("No startup commands"); return; }
      if(ctx.toast) ctx.toast("Startup commands:\n\n" + cmds.map((c,i) => `${i+1}. ${c}`).join("\n"));
    }},
    { name: "Startup: Remove Command…", key: "", action: () => {
      if (!cmds.length) { if(ctx.toast) ctx.toast("No startup commands"); return; }
      const idx = prompt("Remove which? (number)\n\n" + cmds.map((c,i) => `${i+1}. ${c}`).join("\n"));
      const i = parseInt(idx) - 1;
      if (i >= 0 && i < cmds.length) { cmds.splice(i, 1); save(); }
    }},
    { name: "Startup: Clear All", key: "", action: () => { cmds = []; save(); }},
  );
}

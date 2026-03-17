// Log viewer — tail files with auto-highlighting for errors/warnings
export default function(ctx) {

  function tailFile() {
    const path = prompt("File path to tail:");
    if (!path) return;
    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        s.sendInput(`tail -f ${path}\r`);
        s._customName = "📋 " + path.split("/").pop();
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  function tailDocker() {
    const container = prompt("Docker container name:");
    if (!container) return;
    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        s.sendInput(`docker logs -f --tail=100 ${container}\r`);
        s._customName = "🐳 " + container;
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  function tailCompose() {
    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        s.sendInput("docker compose logs -f --tail=50\r");
        s._customName = "🐳 compose logs";
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  function watchCommand() {
    const cmd = prompt("Command to watch (runs every 2s):");
    if (!cmd) return;
    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        s.sendInput(`watch -n 2 '${cmd.replace(/'/g, "'\\''")}'\r`);
        s._customName = "👁 " + cmd.slice(0, 20);
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  ctx.commands.push(
    { name: "Log: Tail File…", key: "", action: tailFile },
    { name: "Log: Docker Container…", key: "", action: tailDocker },
    { name: "Log: Docker Compose", key: "", action: tailCompose },
    { name: "Watch Command…", key: "", action: watchCommand },
  );
}

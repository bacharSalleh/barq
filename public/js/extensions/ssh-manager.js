export default function(ctx) {
  const STORAGE_KEY = "ttb-ssh-connections";
  let connections = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(connections)); }

  function addConnection() {
    const host = prompt("SSH host (e.g. user@hostname):");
    if (!host) return;
    const port = prompt("Port (default 22):", "22") || "22";
    const name = prompt("Connection name:", host) || host;
    connections.push({ name, host, port });
    save(); rebuildCommands();
  }

  function connectSSH(conn) {
    const s = ctx.createSession();
    // Wait for connection then send ssh command
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        const portFlag = conn.port !== "22" ? ` -p ${conn.port}` : "";
        s.sendInput(`ssh${portFlag} ${conn.host}\r`);
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
    // Name the tab after the connection
    s._customName = conn.name;
    s.tabLabel.textContent = conn.name;
  }

  function removeConnection() {
    if (!connections.length) { if(ctx.toast) ctx.toast("No saved connections"); return; }
    const name = prompt("Remove which?\n" + connections.map(c => c.name).join(", "));
    if (!name) return;
    connections = connections.filter(c => c.name !== name);
    save(); rebuildCommands();
  }

  function rebuildCommands() {
    for (let i = ctx.commands.length - 1; i >= 0; i--) if (ctx.commands[i]._ssh) ctx.commands.splice(i, 1);
    connections.forEach(c => {
      ctx.commands.push({ name: "SSH: " + c.name, key: "", _ssh: true, action: () => connectSSH(c) });
    });
  }

  ctx.commands.push(
    { name: "SSH: Add Connection…", key: "", action: addConnection },
    { name: "SSH: Remove Connection…", key: "", action: removeConnection },
  );
  rebuildCommands();
}

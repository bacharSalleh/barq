// Manage SSH port forwards and show active ports
export default function(ctx) {

  function listPorts() {
    const s = ctx.getActive();
    if (!s) return;
    s.sendInput("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | awk 'NR==1||/LISTEN/' || ss -tlnp 2>/dev/null\r");
    ctx.hiddenInput.focus();
  }

  function killPort() {
    const port = prompt("Port to kill:");
    if (!port) return;
    const s = ctx.getActive();
    if (!s) return;
    s.sendInput(`lsof -ti:${port} | xargs kill -9 2>/dev/null && echo "Killed processes on port ${port}" || echo "Nothing on port ${port}"\r`);
    ctx.hiddenInput.focus();
  }

  function sshForward() {
    const local = prompt("Local port:");
    if (!local) return;
    const remote = prompt("Remote host:port (e.g. localhost:3000):", "localhost:" + local);
    if (!remote) return;
    const server = prompt("SSH server (e.g. user@host):");
    if (!server) return;

    const s = ctx.createSession();
    const onConn = (session) => {
      if (session !== s) return;
      ctx.bus.off("session:connected", onConn);
      setTimeout(() => {
        s.sendInput(`ssh -N -L ${local}:${remote} ${server}\r`);
        s._customName = `🔀 ${local}→${remote}`;
        s.tabLabel.textContent = s._customName;
      }, 300);
    };
    ctx.bus.on("session:connected", onConn);
  }

  ctx.commands.push(
    { name: "Ports: List Listening", key: "", action: listPorts },
    { name: "Ports: Kill Port…", key: "", action: killPort },
    { name: "Ports: SSH Forward…", key: "", action: sshForward },
  );
}

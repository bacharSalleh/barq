// Shows the foreground process name in the status bar
export default function(ctx) {
  const sbRight = document.getElementById("sb-right");

  async function update() {
    const s = ctx.getActive();
    if (!s?.alive || !s.ws) return;

    // Ask the server for the session's process cwd (which also tells us the bridge PID)
    // We'll piggyback on the cwd query — the process name comes from the VT title
    // or we can check via the server
    const name = s.vt.title || "";
    // Extract process name from title if available (many shells set it to "command - dir")
    let proc = "";
    if (s.vt.isAlt) proc = "[TUI]";
    else if (name) {
      // Common format: "user@host: dir" or just the command name
      proc = name.split(":")[0] || name;
    }

    // Update status bar right side
    const size = `${s.vt.cols}×${s.vt.rows}`;
    const alt = s.vt.isAlt ? " [alt]" : "";
    const procBadge = proc ? ` │ ${proc}` : "";
    sbRight.textContent = `${size}${alt}${procBadge}`;
  }

  ctx.bus.on("render:after", update);
  ctx.bus.on("session:activated", update);
}

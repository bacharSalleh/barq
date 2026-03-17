// Detect "clear" command and wipe scrollback HTML too.
// Also adds Ctrl+L shortcut to clear everything.
export default function(ctx) {

  function clearAll() {
    const s = ctx.getActive();
    if (!s) return;
    // Send "clear" command — the input:before handler below will detect it
    // and wipe the scrollback DOM after the shell executes it
    s.sendInput("clear\r");
    ctx.hiddenInput.focus();
  }

  // Detect when user types "clear" + Enter: wipe scrollback after a short delay
  ctx.bus.on("input:before", (session, data) => {
    if (data !== "\r" || session.vt.isAlt) return;
    // Read current line to check if it's "clear"
    const vt = session.vt;
    const row = vt.buffer[vt.curRow];
    if (!row) return;
    let line = "";
    for (const cell of row) line += cell.ch;
    line = line.trim().replace(/^[❯›\$#%>]\s*/, "").trim();
    if (line === "clear") {
      // Wait for the clear to execute, then wipe scrollback
      setTimeout(() => {
        session.scrollbackEl.innerHTML = "";
        session.renderedSerial = session.vt.scrollbackSerial;
      }, 200);
    }
  });

  ctx.commands.push(
    { name: "Clear Terminal + History", key: "Ctrl+Shift+L", action: clearAll },
  );

  ctx.bus.on("shortcut:clear-all", clearAll);
}

export default function(ctx) {
  const btn = document.getElementById("broadcast-btn");
  let active = false;

  if (!btn) return; // button may not exist in toolbar
  btn.addEventListener("click", () => {
    active = !active;
    btn.style.background = active ? "var(--accent)" : "";
    btn.style.color = active ? "#fff" : "";
    btn.textContent = active ? "⇶" : "⇉";
    btn.title = active ? "Broadcasting ON" : "Broadcast to all tabs";
  });

  ctx.bus.on("input:before", (session, data) => {
    if (active && session === ctx.getActive()) {
      ctx.sessions.forEach(s => {
        if (s !== session && s.alive && s.ws?.readyState === WebSocket.OPEN) {
          s.ws.send(JSON.stringify({ type: "input", data }));
        }
      });
    }
  });

  ctx.commands.push({ name: "Toggle Broadcast", key: "", action: () => btn.click() });
}

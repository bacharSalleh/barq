export default function(ctx) {
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();

  ctx.bus.on("input:before", (session, data) => {
    if (data === "\r" && !session.vt.isAlt) session.cmdStart = Date.now();
  });

  ctx.bus.on("bell", (session) => {
    session.wrapEl.style.outline = "2px solid var(--accent)";
    setTimeout(() => session.wrapEl.style.outline = "", 150);
    if (session !== ctx.getActive()) session.tabEl.classList.add("has-activity");
  });

  ctx.bus.on("render:after", (session) => {
    if (session !== ctx.getActive() && session.alive) session.tabEl.classList.add("has-activity");
    if (session !== ctx.getActive() && session.cmdStart && !session.vt.isAlt) {
      const el = Date.now() - session.cmdStart;
      if (el > 5000 && Notification.permission === "granted" && !document.hasFocus()) {
        new Notification("ttb", { body: (session._customName || "Terminal " + session.id) + ": done (" + Math.round(el/1000) + "s)" });
        session.cmdStart = null;
      }
    }
  });
}

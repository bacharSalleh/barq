// Welcome screen shown on first launch (once per session)
export default function(ctx) {
  if (sessionStorage.getItem("ttb-welcomed")) return;

  ctx.bus.on("session:connected", function once() {
    ctx.bus.off("session:connected", once);
    sessionStorage.setItem("ttb-welcomed", "1");

    setTimeout(() => {
      if (!ctx.toast) return;
      ctx.toast("⚡ Welcome to barq — Ctrl+Shift+P for commands", 4000);
    }, 1000);
  });
}
